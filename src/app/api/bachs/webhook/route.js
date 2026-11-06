import { NextResponse } from "next/server";
import { webhooks } from '@bachs/sdk';
import { paymentMatchesOrder } from "@/lib/bachs.mjs";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { sendPaidOrderNotifications } from '@/lib/paidOrderNotifications.mjs';

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
    let query = db.from("shop_orders").select("*");
    if (typeof reference === "string" && /^[0-9a-f-]{36}$/i.test(reference)) query = query.eq("id", reference);
    else query = query.eq("checkout_id", data.checkout_id);
    const { data: order, error } = await query.maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ received: true });
    if (order.checkout_id && order.checkout_id !== data.checkout_id) return NextResponse.json({ error: "Checkout reference mismatch." }, { status: 409 });
    if (order.payment_status === "paid") {
      await sendPaidOrderNotifications(db,order);
      return NextResponse.json({ received: true });
    }
    const paid = paymentMatchesOrder(data, order.total_minor);
    const paidAt = new Date().toISOString();
    const { data: changedOrder, error: saveError } = await db.from("shop_orders").update({
      payment_status: paid ? "paid" : "review",
      ...(paid ? { payment_review_reason:null, paid_at: paidAt, emails_claimed_at: paidAt, email_tracking_started_at:paidAt, paid_event_id: event.id, payment_id: data.charge_id, checkout_id: data.checkout_id } : {payment_review_reason:'amount_or_currency_mismatch'}),
    }).eq("id", order.id).neq("payment_status", "paid")
      .select("*")
      .maybeSingle();
    if (saveError) throw saveError;
    if (changedOrder?.payment_status === 'paid') await sendPaidOrderNotifications(db,changedOrder);
    if (changedOrder?.payment_review_reason === 'reservation_expired') console.error('Late payment requires manual review; stock was not committed',order.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Payment webhook failed", error?.code || error?.message);
    return NextResponse.json({ error: "Unable to save payment event." }, { status: 500 });
  }
}
