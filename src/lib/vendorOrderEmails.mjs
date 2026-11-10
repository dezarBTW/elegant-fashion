import {
  sendServiceEmail,
  wrapBrandEmail,
  escapeEmailHtml,
} from "./orderEmails.mjs";
import { SITE_URL } from "./seo.mjs";
import { PICKUP_ADDRESS } from "./checkout.mjs";
export async function notifyPaidVendors(db, orderId, {sendEmail=sendServiceEmail}={}) {
  const result = await db
    .from("seller_order_items")
    .select("id,seller_id,seller_kind,product_name,quantity")
    .eq("order_id", orderId);
  if (result.error) throw result.error;
  const vendors = result.data.filter((item) => item.seller_kind === "vendor");
  const ids = [...new Set(vendors.map((item) => item.seller_id))];
  if (!ids.length) return true;
  const order = await db
    .from("shop_orders")
    .select("delivery,customer_phone,customer_name")
    .eq("id", orderId)
    .single();
  if (order.error) throw order.error;
  const users = await db.from("users").select("id,email").in("id", ids);
  if (users.error) throw users.error;
  const customerAddress = order.data.delivery.method === "pickup" ? "Shop pickup" : [order.data.delivery.address,order.data.delivery.city,order.data.delivery.state].filter(Boolean).join(", ");
  const deliveries = users.data.map(user => {
    const items = vendors.filter((item) => item.seller_id === user.id);
    const shop = ids.length >= 2 || order.data.delivery.method === "pickup";
    const instructions =
      ids.length >= 2
        ? `This is a multiple-vendor order. Send your items to the administrator at ${PICKUP_ADDRESS} for combined delivery. Do not ship directly to the customer.`
        : shop
          ? `The customer selected shop pickup. Deliver your items to ${PICKUP_ADDRESS}.`
          : "Contact Elegant Style directly to coordinate delivery offline.";
    return sendEmail({
        to: user.email,
        subject: "Your product purchase was successfully paid",
        idempotencyKey: `vendor-paid/${orderId}/${user.id}`,
        html: wrapBrandEmail(
          "Paid product purchase",
          `<p>Order ${escapeEmailHtml(orderId)}</p><ul>${items.map((item) => `<li>${escapeEmailHtml(item.product_name)} × ${item.quantity}</li>`).join("")}</ul><p>${escapeEmailHtml(instructions)}</p><p>Customer: ${escapeEmailHtml(order.data.customer_name)}<br/>Shipping address: ${escapeEmailHtml(customerAddress)}<br/>Phone: ${escapeEmailHtml(order.data.customer_phone)}</p><p>The maximum delivery deadline is seven days from confirmed payment. Vendor payments and delivery coordination are handled directly with the administrator offline.</p><p><a href="${SITE_URL}/account/vendor-orders">View sales history</a></p>`,
        ),
      });
  });
  return (await Promise.all(deliveries)).every(Boolean);
}
