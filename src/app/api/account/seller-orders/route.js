import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveAccount, readAccountBody } from "@/lib/accountServer";
import { OrderRequestError } from "@/lib/orderManagement.mjs";
import { PICKUP_ADDRESS } from '@/lib/checkout.mjs';
import { notifySellerItem } from '@/lib/sellerItemEmails.mjs';
export const maxDuration = 60;
const json = (body, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const failure = (error) =>
  json(
    {
      error:
        error instanceof OrderRequestError
          ? error.message
          : "Unable to manage order items.",
    },
    error.status || 503,
  );
const customerFields =
  "id,order_id,product_id,product_name,size,quantity,fulfilment,shipped_at,confirmed_at";
export async function GET(request) {
  try {
    const { db, user, profile } = await requireActiveAccount(request);
    const mode = new URL(request.url).searchParams.get("mode") || "customer";
    if (!["customer", "vendor", "admin"].includes(mode))
      throw new OrderRequestError("Invalid order view.", 400);
    if (mode === "admin" && !profile.is_admin)
      throw new OrderRequestError("Administrator access required.", 403);
    let query = db
      .from("seller_order_items")
      .select(mode === "customer" ? customerFields : "*")
      .order("id")
      .limit(200);
    if (mode === "vendor")
      query = query.eq("seller_id", user.id).eq("seller_kind", "vendor");
    if (mode === "customer") {
      const orders = await db
        .from("shop_orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(50);
      if (orders.error) throw orders.error;
      if (!orders.data.length) return json({ items: [] });
      query = query.in(
        "order_id",
        orders.data.map((order) => order.id),
      );
    }
    const result = await query;
    if (result.error) throw result.error;
    const ids = [...new Set(result.data.map((item) => item.order_id))];
    const orders = ids.length
      ? await db
          .from("shop_orders")
          .select(
            "id,payment_status,paid_at,delivery,customer_name,customer_email,customer_phone",
          )
          .in("id", ids)
          .eq("payment_status", "paid")
      : { data: [] };
    if (orders.error) throw orders.error;
    const sellers = ids.length ? await db.from('seller_order_items').select('order_id,seller_id,seller_kind').in('order_id',ids) : { data: [] };
    if (sellers.error) throw sellers.error;
    const refunds = mode!=='customer'&&ids.length ? await db.from('refund_requests').select('order_id,product_id,status').in('order_id',ids).in('status',['pending','approved']) : {data:[]};
    const complaints = mode!=='customer'&&ids.length ? await db.from('product_complaints').select('order_id,product_id,status').in('order_id',ids).in('status',['pending','in_review']) : {data:[]};
    if(refunds.error||complaints.error)throw refunds.error||complaints.error;
    return json({
      items: result.data.flatMap((item) => {
        const order = orders.data.find((order) => order.id === item.order_id);
        if (!order) return [];
        const multipleVendors = new Set(sellers.data.filter(row=>row.order_id===order.id&&row.seller_kind==='vendor').map(row=>row.seller_id)).size>=2;
        const needsShop = multipleVendors || order.delivery?.method==='pickup';
        return [
          {
            ...item,
            ...(mode!=='customer'?{paymentHold:[...refunds.data,...complaints.data].some(row=>row.order_id===item.order_id&&row.product_id===item.product_id)}:{}),
            order:
              mode === "customer"
                ? { id: order.id, paid_at: order.paid_at }
                : mode==='vendor'&&needsShop ? {id:order.id,paid_at:order.paid_at,delivery:{method:order.delivery.method,address:PICKUP_ADDRESS},needsShop,multipleVendors} : {...order,needsShop,multipleVendors},
          },
        ];
      }),
    });
  } catch (error) {
    return failure(error);
  }
}
const schema = z
  .object({
    itemId: z.uuid(),
    action: z.enum([
      "processing",
      "sent_to_shop",
      "at_shop",
      "shipped",
      "ready",
      "confirm",
      "verify_delivery",
      "payment_fulfilled",
      "payment_received",
    ]),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();
export async function POST(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const input = await readAccountBody(request, schema);
    const result = await db.rpc("seller_item_action", {
      p_actor: user.id,
      p_item: input.itemId,
      p_action: input.action,
      p_note: input.note,
    });
    if (result.error?.code === "42501")
      throw new OrderRequestError(
        "This action is not permitted or the item is not eligible. Refresh the order and review its status.",
        403,
      );
    if (result.error) throw result.error;
    const item = result.data;
    let emailSent = null;
    if (['shipped','ready','payment_fulfilled','payment_received'].includes(input.action)) {
      try { emailSent = await notifySellerItem(db,item,input.action); }
      catch { emailSent = false; console.error('Order progress saved, but email notification failed.'); }
    }
    return json({
      success: true,
      emailSent,
    });
  } catch (error) {
    return failure(error);
  }
}
