import { NextResponse } from "next/server";
import { requireActiveAccount } from "@/lib/accountServer";
import { OrderRequestError } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const rawPage = new URL(request.url).searchParams.get("page") || "1";
    if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1 || Number(rawPage) > 100000) throw new OrderRequestError("Invalid page.", 400);
    const page = Number(rawPage), pageSize = 20;
    const { data, count, error } = await db.from("shop_orders")
      .select("id,created_at,items,total_minor,payment_status,fulfillment_status,delivery,customer_received_at,delivery_confirmed_at,transfer_submitted_at", { count: "exact" })
      .eq("user_id", user.id).in("payment_status", ["paid", "pending", "review"])
      .or("payment_status.eq.paid,transfer_submitted_at.not.is.null")
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    const productIds=[...new Set((data||[]).flatMap(order=>order.items.map(item=>item.productId)))];
    const productImages=productIds.length?await db.from('products').select('id,image').in('id',productIds):{data:[]};
    if(productImages.error)throw productImages.error;
    const images=new Map(productImages.data.map(product=>[product.id,product.image]));
    const itemProgress = data.length ? await db.from('seller_order_items').select('id,order_id,product_id,size,fulfilment,confirmed_at').in('order_id', data.map(order => order.id)) : { data: [] };
    if (itemProgress.error) throw itemProgress.error;
    for (const order of data) order.items = order.items.map(item => {
      const progress = itemProgress.data.find(row => row.order_id === order.id && row.product_id === item.productId && row.size === (item.size || ''));
      return { ...item, image:item.image||images.get(item.productId)||null, sellerItemId: progress?.id, fulfilment: progress?.fulfilment || order.fulfillment_status, confirmedAt: progress?.confirmed_at || order.delivery_confirmed_at || order.customer_received_at };
    });
    return NextResponse.json({ orders: data, total: count, page, pageSize }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Account orders failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to load your orders." }, { status: error.status || 503 });
  }
}
