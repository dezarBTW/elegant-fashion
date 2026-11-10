import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { FULFILLMENT_STATUSES, PAYMENT_STATUSES, ORDER_COLUMNS, OrderRequestError, requireOrderAdmin } from "@/lib/orderManagement.mjs";
import { checkRequestOrigin } from "@/lib/accountServer";

export const runtime = "nodejs";
const pageSize = 25;
const querySchema = z.object({
  payment: z.enum(["all", ...PAYMENT_STATUSES]).default("all"),
  fulfillment: z.enum(["all", "incomplete", ...FULFILLMENT_STATUSES]).default("all"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
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
    const ownership=ids.length?await db.from('seller_order_items').select('id,order_id,product_id,size,seller_id,seller_kind,fulfilment').in('order_id',ids):{data:[]};
    if(ownership.error)throw ownership.error;
    const productIds=[...new Set((data||[]).flatMap(order=>order.items.map(item=>item.productId)))];
    const productImages=productIds.length?await db.from('products').select('id,image').in('id',productIds):{data:[]};
    if(productImages.error)throw productImages.error;
    const images=new Map(productImages.data.map(product=>[product.id,product.image]));
    const sellers=[...new Set(ownership.data.map(item=>item.seller_id))];
    const users=sellers.length?await db.from('users').select('id,email').in('id',sellers):{data:[]};
    if(users.error)throw users.error;
    const orders=(data||[]).map(order=>({...order,items:order.items.map(item=>{
      const owner=ownership.data.find(row=>row.order_id===order.id&&row.product_id===item.productId&&row.size===(item.size||''));
      return {...item,image:item.image||images.get(item.productId)||null,sellerItemId:owner?.id,itemProgress:owner?.fulfilment,owner:owner?{userId:owner.seller_id,kind:owner.seller_kind,email:users.data.find(user=>user.id===owner.seller_id)?.email}:null};
    })}));
    return json({ orders, total: count || 0, page, pageSize });
  } catch (error) { return failure(error); }
}

export async function PATCH() {
  return json({error:'Customers confirm receipt from My orders after shipment.'},405);
}
