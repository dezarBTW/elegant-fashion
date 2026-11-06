import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { sendDeliveryCompletedEmail } from "@/lib/orderEmails.mjs";
import { FULFILLMENT_STATUSES, PAYMENT_STATUSES, ORDER_COLUMNS, OrderRequestError, requireOrderAdmin } from "@/lib/orderManagement.mjs";
import { checkRequestOrigin } from "@/lib/accountServer";

export const runtime = "nodejs";
const pageSize = 25;
const querySchema = z.object({
  payment: z.enum(["all", ...PAYMENT_STATUSES]).default("all"),
  fulfillment: z.enum(["all", "incomplete", ...FULFILLMENT_STATUSES]).default("all"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict();
const updateSchema = z.object({
  id: z.uuid(),
  expected_status: z.enum(FULFILLMENT_STATUSES),
  action: z.literal("delivery_completed"),
  note: z.string().trim().min(10).max(2000),
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
    if (fulfillment === "incomplete") query = query.neq("fulfillment_status", "completed");
    else if (fulfillment !== "all") query = query.eq("fulfillment_status", fulfillment);
    const { data, count, error } = await query.order("created_at", { ascending: false })
      .order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    const ids=(data||[]).map(order=>order.id);
    const ownership=ids.length?await db.from('seller_order_items').select('order_id,product_id,size,seller_id,seller_kind').in('order_id',ids):{data:[]};
    if(ownership.error)throw ownership.error;
    const sellers=[...new Set(ownership.data.map(item=>item.seller_id))];
    const users=sellers.length?await db.from('users').select('id,email').in('id',sellers):{data:[]};
    if(users.error)throw users.error;
    const orders=(data||[]).map(order=>({...order,items:order.items.map(item=>{
      const owner=ownership.data.find(row=>row.order_id===order.id&&row.product_id===item.productId&&row.size===(item.size||''));
      return {...item,owner:owner?{userId:owner.seller_id,kind:owner.seller_kind,email:users.data.find(user=>user.id===owner.seller_id)?.email}:null};
    })}));
    return json({ orders, total: count || 0, page, pageSize });
  } catch (error) { return failure(error); }
}

export async function PATCH(request) {
  try {
    const db = checkoutDatabase();
    const admin = await requireOrderAdmin(request, db);
    checkRequestOrigin(request);
    const raw = await request.text();
    if (raw.length > 12000) return json({ error: "Request is too large." }, 413);
    let parsed;
    try { parsed = updateSchema.safeParse(JSON.parse(raw)); }
    catch { return json({ error: "Invalid update payload." }, 400); }
    if (!parsed.success) return json({ error: "Provide the order, expected status and delivery verification note." }, 400);
    const { id, expected_status } = parsed.data;
    const result=await db.rpc('admin_confirm_order_delivery',{p_actor:admin.id,p_order:id,p_expected_status:expected_status,p_note:parsed.data.note});
    if(result.error?.code==='40001')throw new OrderRequestError('This order changed. Refresh before confirming delivery.',409);
    if(result.error?.code==='42501')throw new OrderRequestError('Only paid orders can be confirmed by an active administrator.',403);
    if(result.error?.code==='P0002')throw new OrderRequestError('Order not found.',404);
    if(result.error)throw result.error;
    const order=Object.fromEntries(ORDER_COLUMNS.split(',').map(key=>[key,result.data.order[key]]));
    let customerEmailSent=null;
    if(result.data.changed)customerEmailSent=await sendDeliveryCompletedEmail(order);
    return json({order,changed:result.data.changed,customerEmailSent});
  } catch (error) { return failure(error); }
}
