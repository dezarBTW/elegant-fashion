import {
  sendServiceEmail,
  wrapBrandEmail,
  escapeEmailHtml,
  ADMIN_NOTIFY_EMAIL,
} from "./orderEmails.mjs";
import { SITE_URL } from "./seo.mjs";
export async function notifySellerItem(db, item, kind, {sendEmail=sendServiceEmail}={}) {
  const order = await db
    .from("shop_orders")
    .select("customer_email")
    .eq("id", item.order_id)
    .single();
  if (order.error) throw order.error;
  let emailSent = null;
  if (["shipped", "ready"].includes(kind)) {
    const orderItems = await db.from('seller_order_items').select('seller_id,seller_kind,product_name').eq('order_id',item.order_id);
    if (orderItems.error) throw orderItems.error;
    const combined = new Set(orderItems.data.filter(row=>row.seller_kind==='vendor').map(row=>row.seller_id)).size>=2;
    const names = combined ? orderItems.data.map(row=>row.product_name) : [item.product_name];
    emailSent = await sendEmail({
      to: order.data.customer_email,
      subject: "Please confirm receipt of your Elegant Style product",
      idempotencyKey: combined ? `seller-order/${item.order_id}/${kind}` : `seller-item/${item.id}/${kind}`,
      html: wrapBrandEmail(
        "Your order progress",
        `<p>Your ${combined?'combined order is':'product is'} ${kind === "ready" ? "ready for pickup" : "shipped"}.</p><ul>${names.map(name=>`<li>${escapeEmailHtml(name)}</li>`).join('')}</ul><p>Confirm receipt only after receiving your products.</p><p><a href="${SITE_URL}/account/deliveries">Confirm receipt</a></p><p>Your return/refund request window ends three days after confirmed delivery.</p>`,
      ),
    });
  }
  if (kind === "payment_fulfilled") {
    const seller = await db
      .from("users")
      .select("email")
      .eq("id", item.seller_id)
      .single();
    if (seller.error) throw seller.error;
    emailSent = await sendEmail({
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
    emailSent = await sendEmail({
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
