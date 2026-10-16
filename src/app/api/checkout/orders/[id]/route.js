import { NextResponse } from "next/server";
import { checkoutDatabase, hasOrderAccess } from "@/lib/checkoutServer";
import { validCheckoutUrl } from "@/lib/bachs.mjs";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid order reference." }, { status: 400 });
  try {
    const { data: order, error } = await checkoutDatabase().from("shop_orders").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!order || !hasOrderAccess(request, order)) return NextResponse.json({ error: "This order can only be viewed in the browser used to place it." }, { status: 404 });
    const checkoutUrl = order.payment_status === "pending" && order.checkout_state === "open" && validCheckoutUrl(order.checkout_url, process.env.BACHS_API_KEY || "") ? order.checkout_url : null;
    return NextResponse.json({ id: order.id, paymentStatus: order.payment_status, fulfillmentStatus: order.fulfillment_status, totalMinor: order.total_minor, shippingMinor: order.shipping_minor, items: order.items, method: order.delivery.method, checkoutUrl }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Unable to load order status. Please try again." }, { status: 503 }); }
}
