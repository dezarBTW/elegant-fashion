import {
  sendServiceEmail,
  wrapBrandEmail,
  escapeEmailHtml,
  ADMIN_NOTIFY_EMAIL,
} from "./orderEmails.mjs";
import { SITE_URL } from "./seo.mjs";
export async function notifySellerItem(db, item, kind) {
  const order = await db
    .from("shop_orders")
    .select("customer_email")
    .eq("id", item.order_id)
    .single();
  if (order.error) throw order.error;
  let emailSent = null;
  if (["shipped", "ready"].includes(kind))
    emailSent = await sendServiceEmail({
      to: order.data.customer_email,
      subject: "Please confirm receipt of your Elegant Style product",
      idempotencyKey: `seller-item/${item.id}/${kind}`,
      html: wrapBrandEmail(
        "Your order progress",
        `<p>${escapeEmailHtml(item.product_name)} is ${kind === "ready" ? "ready for pickup" : "shipped"}. Confirm receipt only after you receive it.</p><p><a href="${SITE_URL}/account/deliveries">Confirm receipt</a></p><p>Your return/refund request window ends three days after confirmed delivery.</p>`,
      ),
    });
  if (kind === "payment_fulfilled") {
    const seller = await db
      .from("users")
      .select("email")
      .eq("id", item.seller_id)
      .single();
    if (seller.error) throw seller.error;
    emailSent = await sendServiceEmail({
      to: seller.data.email,
      subject: "Confirm your vendor payment",
      idempotencyKey: `seller-payment/${item.id}`,
      html: wrapBrandEmail(
        "Payment marked fulfilled",
        `<p>The administrator marked payment fulfilled for ${escapeEmailHtml(item.product_name)}. Check your account and confirm payment receipt on <a href="${SITE_URL}/account/vendor-orders">your vendor orders page</a>.</p>`,
      ),
    });
  }
  if (kind === "payment_received")
    emailSent = await sendServiceEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: "Vendor confirmed payment receipt",
      idempotencyKey: `seller-payment-received/${item.id}`,
      html: wrapBrandEmail(
        "Payment receipt confirmed",
        `<p>Vendor payment receipt was confirmed for item ${escapeEmailHtml(item.id)}.</p>`,
      ),
    });

  return emailSent;
}
