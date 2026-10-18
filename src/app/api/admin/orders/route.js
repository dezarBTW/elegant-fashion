import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutDatabase, createReceiptConfirmation } from "@/lib/checkoutServer";
import { sendFulfillmentEmail, sendsReceiptLink } from "@/lib/orderEmails.mjs";
import { FULFILLMENT_STATUSES, PAYMENT_STATUSES, ORDER_COLUMNS, OrderRequestError, requireOrderAdmin, nextFulfillmentStatuses } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";
const pageSize = 25;
const querySchema = z.object({
  payment: z.enum(["all", ...PAYMENT_STATUSES]).default("all"),
  fulfillment: z.enum(["all", ...FULFILLMENT_STATUSES]).default("all"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict();
const updateSchema = z.object({
  id: z.uuid(),
  expected_status: z.enum(FULFILLMENT_STATUSES),
  fulfillment_status: z.enum(FULFILLMENT_STATUSES),
}).strict();
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

function failure(error) {
  if (error instanceof OrderRequestError) return json({ error: error.message }, error.status);
  console.error("Admin order request failed", error?.code || error?.message);
  return json({ error: "Order service is unavailable. Please try again." }, 503);
}

export async function GET(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return json({ error: "Invalid order filter or page." }, 400);
    const { payment, fulfillment, page } = parsed.data;
    let query = db.from("shop_orders").select(ORDER_COLUMNS, { count: "exact" });
    if (payment !== "all") query = query.eq("payment_status", payment);
    if (fulfillment !== "all") query = query.eq("fulfillment_status", fulfillment);
    const { data, count, error } = await query.order("created_at", { ascending: false })
      .order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return json({ orders: data || [], total: count || 0, page, pageSize });
  } catch (error) { return failure(error); }
}

export async function PATCH(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
    const raw = await request.text();
    if (raw.length > 2000) return json({ error: "Request is too large." }, 413);
    let parsed;
    try { parsed = updateSchema.safeParse(JSON.parse(raw)); }
    catch { return json({ error: "Invalid update payload." }, 400); }
    if (!parsed.success) return json({ error: "Only an order reference and fulfilment status can be updated." }, 400);
    const { id, expected_status, fulfillment_status } = parsed.data;
    const { data: order, error } = await db.from("shop_orders")
      .select("id,payment_status,fulfillment_status,delivery").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!order) return json({ error: "Order not found." }, 404);
    if (order.payment_status !== "paid") return json({ error: "Only paid orders can be fulfilled. Review the payment in Bachs first." }, 409);
    if (order.fulfillment_status !== expected_status) return json({ error: "This order changed. Refresh before updating it." }, 409);
    if (!nextFulfillmentStatuses(order.fulfillment_status, order.delivery?.method).includes(fulfillment_status)) return json({ error: "Invalid fulfilment transition for this delivery method." }, 409);
    // Delivery orders get their receipt link when shipped; pickup orders when ready.
    // A fresh token is created here because only its hash is ever stored.
    const notify = sendsReceiptLink(fulfillment_status, order.delivery?.method);
    const confirmation = notify ? createReceiptConfirmation() : null;
    const { data: updated, error: updateError } = await db.from("shop_orders")
      .update({ fulfillment_status, ...(confirmation ? { receipt_confirmation_hash: confirmation.hash } : {}) })
      .eq("id", id).eq("payment_status", "paid")
      .eq("fulfillment_status", expected_status).select(ORDER_COLUMNS).maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return json({ error: "This order changed. Refresh before updating it." }, 409);
    let emailSent = null;
    if (confirmation) {
      // The status change is already saved; an email problem must never undo it.
      try { emailSent = await sendFulfillmentEmail(updated, confirmation.token); }
      catch (error) { console.error(`Order ${id}: fulfilment email failed`, error?.message); emailSent = false; }
    }
    return json({ order: updated, ...(emailSent === null ? {} : { customerEmailSent: emailSent }) });
  } catch (error) { return failure(error); }
}
