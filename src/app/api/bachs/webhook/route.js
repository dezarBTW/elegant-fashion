import { NextResponse } from "next/server";
import { verifyBachsSignature, paymentMatchesOrder } from "@/lib/bachs.mjs";
import { checkoutDatabase } from "@/lib/checkoutServer";

export const runtime = "nodejs";

export async function POST(request) {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 128000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyBachsSignature(raw, request.headers, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid payload." }, { status: 400 }); }
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
    const { error: saveError } = await db.from("shop_orders").update({
      payment_status: paid ? "paid" : "review",
      ...(paid ? { paid_at: new Date().toISOString(), paid_event_id: event.id, payment_id: data.charge_id, checkout_id: data.checkout_id } : {}),
    }).eq("id", order.id).neq("payment_status", "paid");
    if (saveError) throw saveError;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Payment webhook failed", error?.code || error?.message);
    return NextResponse.json({ error: "Unable to save payment event." }, { status: 500 });
  }
}
