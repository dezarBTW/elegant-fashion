import { NextResponse } from "next/server";
import { webhooks } from '@bachs/sdk';
import { paymentMatchesOrder } from "@/lib/bachs.mjs";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { sendOrderEmails } from "@/lib/orderEmails.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 128000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  let event;
  try { event=webhooks.constructEvent(raw,request.headers,secret); }
  catch { return NextResponse.json({error:'Invalid signature or payload.'},{status:401}); }
  // checkout.completed can be a free checkout. Only a collected payment fulfils orders.
  if (event.type !== "collection.succeeded") return NextResponse.json({ received: true });
  const data = event.data;
  if (!event.id || !data?.checkout_id || !data?.charge_id) return NextResponse.json({ received: true });
  try {
    const db = checkoutDatabase();
    const reference = data.reference || data.metadata?.order_id;
    let query = db.from("shop_orders").select("id,total_minor,payment_status,checkout_id");
    if (typeof reference === "string" && /^[0-9a-f-]{36}$/i.test(reference)) query = query.eq("id", reference);
    else query = query.eq("checkout_id", data.checkout_id);
    const { data: order, error } = await query.maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ received: true });
    if (order.checkout_id && order.checkout_id !== data.checkout_id) return NextResponse.json({ error: "Checkout reference mismatch." }, { status: 409 });
    if (order.payment_status === "paid") return NextResponse.json({ received: true });
    const paid = paymentMatchesOrder(data, order.total_minor);
    const paidAt = new Date().toISOString();
    const { data: changedOrder, error: saveError } = await db.from("shop_orders").update({
      payment_status: paid ? "paid" : "review",
      ...(paid ? { paid_at: paidAt, emails_claimed_at: paidAt, paid_event_id: event.id, payment_id: data.charge_id, checkout_id: data.checkout_id } : {}),
    }).eq("id", order.id).neq("payment_status", "paid")
      .select("id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,emails_claimed_at")
      .maybeSingle();
    if (saveError) throw saveError;
    if (paid && changedOrder?.emails_claimed_at) {
      try { await sendOrderEmails(changedOrder); }
      catch (error) { console.error(`Order ${order.id}: email attempt failed`, error?.message); }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Payment webhook failed", error?.code || error?.message);
    return NextResponse.json({ error: "Unable to save payment event." }, { status: 500 });
  }
}
