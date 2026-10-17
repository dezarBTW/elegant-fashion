import { after, NextResponse } from "next/server";
import { claimAccountOrders, readAccountBody, requireActiveAccount } from "@/lib/accountServer";
import { requestQuerySchema, requestSchema, REQUEST_TABLES } from "@/lib/accountContracts.mjs";
import { notifySupportRequest } from "@/lib/supportEmails.mjs";
import { OrderRequestError } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error) {
  if (!(error instanceof OrderRequestError)) console.error("Customer request failed", error?.code || error?.message);
  return json({ error: error instanceof OrderRequestError ? error.message : "Unable to complete this request." }, error.status || 503);
}

export async function GET(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const parsed = requestQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new OrderRequestError("Invalid request filter.", 400);
    const { kind, page } = parsed.data, pageSize = 20;
    const { data, count, error } = await db.from(REQUEST_TABLES[kind]).select("id,order_id,product_id,product_name,description,status,response,created_at,updated_at", { count: "exact" })
      .eq("user_id", user.id).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return json({ requests: data, total: count, page, pageSize });
  } catch (error) { return failure(error); }
}

export async function POST(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const input = await readAccountBody(request, requestSchema, 6000);
    const { data: allowed, error: limitError } = await db.rpc("consume_account_action_limit", { p_user_id: user.id, p_action: input.kind });
    if (limitError) throw limitError;
    if (!allowed) throw new OrderRequestError("Too many requests. Please wait an hour before submitting another.", 429);
    await claimAccountOrders(db, user);
    const { data: order, error: orderError } = await db.from("shop_orders").select("id,items,customer_email,user_id,payment_status").eq("id", input.orderId).eq("user_id", user.id).maybeSingle();
    if (orderError) throw orderError;
    const item = order?.items?.find((line) => line.productId === input.productId);
    if (!item || order.payment_status !== "paid") throw new OrderRequestError("Choose a purchased product from your own paid order.", 403);
    const table = REQUEST_TABLES[input.kind];
    const { data, error } = await db.from(table).insert({
      id: input.id, user_id: user.id, order_id: order.id, product_id: input.productId, product_name: item.name,
      description: input.description, ...(input.kind === "complaint" ? { received_confirmed: true } : {}),
    }).select("*").single();
    if (error?.code === "23505") {
      const { data: existing, error: lookupError } = await db.from(table).select("*").eq("user_id", user.id).eq("order_id", order.id).eq("product_id", input.productId).maybeSingle();
      if (lookupError || !existing) throw new OrderRequestError("This request reference has already been used. Refresh and try again.", 409);
      return json({ request: existing, duplicate: true });
    }
    if (error) throw error;
    after(() => notifySupportRequest(data, input.kind, user.email));
    return json({ request: data }, 201);
  } catch (error) { return failure(error); }
}
