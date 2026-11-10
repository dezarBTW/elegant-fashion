import { sendTrackedOrderEmail } from './paidOrderNotifications.mjs';
import { escapeEmailHtml, wrapBrandEmail } from './orderEmails.mjs';
import { SITE_URL } from './seo.mjs';

export function buildShippingConfirmationEmail(order, item, kind = 'shipped') {
  const pickup = kind === 'ready';
  const heading = pickup ? 'Your order is ready for pickup' : 'Your item has shipped';
  const action = pickup ? 'After collecting it, please confirm receipt' : 'When it arrives, please confirm receipt';
  const link = `${SITE_URL}/account/orders`;
  return {
    to: order.customer_email,
    idempotencyKey: `shipping-confirm/${item.id}/${kind}`,
    subject: `${heading} — ${order.id}`,
    html: wrapBrandEmail(heading, `<p>Hello ${escapeEmailHtml(order.customer_name)},</p><p>${escapeEmailHtml(item.product_name)} in order ${escapeEmailHtml(order.id)} is ${pickup ? 'ready for pickup' : 'on its way'}.</p><p>${action} in your account. Your three-day return/refund period begins when you confirm that you received the item.</p><p><a href="${escapeEmailHtml(link)}">Confirm receipt in My orders</a></p>`),
    text: `Hello ${order.customer_name}, ${item.product_name} in order ${order.id} is ${pickup ? 'ready for pickup' : 'on its way'}. ${action} at ${link}. Your three-day return/refund period begins when you confirm receipt.`,
  };
}

export async function notifyShippingConfirmation(db, order, item, kind = 'shipped', options = {}) {
  return sendTrackedOrderEmail(db, order.id, buildShippingConfirmationEmail(order, item, kind), options);
}
