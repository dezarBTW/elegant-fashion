import { PICKUP_ADDRESS } from "./checkout.mjs";
import { SITE_URL } from "./seo.mjs";

export const ADMIN_NOTIFY_EMAIL = "elegantyoufashion18@gmail.com";

export function escapeEmailHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

const naira = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;

export function wrapBrandEmail(heading, content) {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#F7F2E9;color:#24211e;font-family:'Segoe UI',Arial,sans-serif">
    <div style="max-width:680px;margin:24px auto;background:#ffffff;border-top:6px solid #C9A962;padding:28px">
      <p style="color:#8b6c2d;font-weight:700">ELEGANT STYLE</p><h1 style="font-size:26px">${escapeEmailHtml(heading)}</h1>${content}
    </div></body></html>`;
}

export async function sendServiceEmail(message, { env = process.env, fetchImpl = fetch, logger = console, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const { idempotencyKey, ...email } = message;
  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !email.to) throw new Error("Email configuration or recipient is missing");
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
          body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, ...email, to: [email.to], subject: email.subject.replace(/[\r\n]/g, " ") }),
          signal: AbortSignal.timeout(12000),
        });
        if (response.ok) return true;
        const error = new Error(`Resend returned HTTP ${response.status}`);
        error.permanent = response.status < 500 && response.status !== 429;
        throw error;
      } catch (error) {
        if (error.permanent || attempt === 2) throw error;
        await sleep(500 * (2 ** attempt));
      }
    }
  } catch (error) {
    logger.error(`Service email ${idempotencyKey} failed`, error.message);
    return false;
  }
}

function receiptConfirmationUrl(order, receiptToken) {
  return /^[a-f0-9]{64}$/.test(receiptToken || "")
    ? `${SITE_URL}/order-received/${encodeURIComponent(order.id)}#token=${receiptToken}` : null;
}

// True when this status change should email the customer their receipt link:
// delivery orders when shipped, pickup orders when ready for pickup.
export function sendsReceiptLink(status, deliveryMethod) {
  return status === "shipped" || (status === "ready" && deliveryMethod === "pickup");
}

export function buildFulfillmentEmail(order, receiptToken) {
  const safe = escapeEmailHtml;
  const isPickup = order.delivery?.method === "pickup";
  const reference = String(order.id).replace(/[\r\n]/g, " ");
  const url = receiptConfirmationUrl(order, receiptToken);
  if (!url) return null;
  const heading = isPickup ? "Your order is ready for pickup" : "Your order has been shipped";
  const lead = isPickup
    ? `Your order is ready. Please collect it at: ${PICKUP_ADDRESS}.`
    : "Your order is on its way to you.";
  const items = (Array.isArray(order.items) ? order.items : []).map((item) => `${safe(item.name)}${item.size ? ` · Size ${safe(item.size)}` : ""} × ${safe(item.quantity)}`).join("<br>");
  const itemText = (Array.isArray(order.items) ? order.items : []).map((item) => `${item.name}${item.size ? ` · Size ${item.size}` : ""} × ${item.quantity}`).join("\n");
  return {
    kind: isPickup ? "ready" : "shipped",
    to: order.customer_email,
    subject: `${isPickup ? "Your Elegant Style order is ready" : "Your Elegant Style order has shipped"} — ${reference}`,
    html: wrapBrandEmail(heading, `<p>Hello ${safe(order.customer_name)},</p><p>${safe(lead)}</p><p>Order reference: <strong>${safe(order.id)}</strong></p><p>${items}</p><h2 style="font-size:18px">After you receive your order</h2><p>Once you have received every product in this order, let us know using the button below.</p><p><a href="${safe(url)}" style="display:inline-block;background:#24211e;color:#ffffff;padding:14px 20px;text-decoration:none;border-radius:6px">I have received the product</a></p><p>This opens a confirmation page. Only confirm after your order has arrived. Keep this personal link private. For help, call 08166361710 and quote your order reference.</p>`),
    text: `Hello ${order.customer_name},\n${lead}\nOrder reference: ${order.id}\n${itemText}\n\nAfter you receive every product in this order, confirm receipt here:\n${url}\nOnly confirm after your order has arrived. Keep this personal link private. For help, call 08166361710.`,
    idempotencyKey: `fulfillment-notice/${order.id}/${isPickup ? "ready" : "shipped"}`,
  };
}

export async function sendFulfillmentEmail(order, receiptToken, options = {}) {
  const message = buildFulfillmentEmail(order, receiptToken);
  if (!message) return false;
  const { kind, ...email } = message;
  return sendServiceEmail(email, options);
}

export function buildOrderEmails(order, shopRecipient) {
  const safe = escapeEmailHtml;
  const delivery = order.delivery || {};
  const method = delivery.method === "pickup" ? "Shop pickup" : delivery.method === "yenagoa" ? "Delivery within Yenagoa" : "Delivery outside Yenagoa";
  const address = delivery.method === "pickup" ? PICKUP_ADDRESS : [delivery.address, delivery.city, delivery.state].filter(Boolean).join(", ");
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = items.map((item) => `<tr>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(item.name)}${item.size ? ` · Size ${safe(item.size)}` : ""}</td>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(item.quantity)}</td>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(naira(item.unitAmountMinor))}</td>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(naira(item.lineAmountMinor))}</td>
  </tr>`).join("");
  const totals = `<p>Subtotal: ${safe(naira(order.subtotal_minor))}</p>
    <p>Delivery / pickup: ${safe(naira(order.shipping_minor))}</p>
    <p style="font-size:20px;font-weight:700">Total paid: ${safe(naira(order.total_minor))}</p>`;
  const details = `<p>Order reference: <strong>${safe(order.id)}</strong></p>
    <table style="width:100%;border-collapse:collapse;text-align:left">
      <thead style="background:#F7F2E9"><tr><th style="padding:10px">Item</th><th style="padding:10px">Qty</th><th style="padding:10px">Unit price</th><th style="padding:10px">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>${totals}<h2 style="font-size:18px">${safe(method)}</h2>
    <p style="white-space:pre-wrap">${safe(address)}</p>`;
  const wrap = wrapBrandEmail;
  const itemText = items.map((item) => `${item.name}${item.size ? ` · Size ${item.size}` : ""} × ${item.quantity} — ${naira(item.unitAmountMinor)} each — ${naira(item.lineAmountMinor)}`).join("\n");
  const commonText = [`Order reference: ${order.id}`, itemText, `Subtotal: ${naira(order.subtotal_minor)}`, `Delivery / pickup: ${naira(order.shipping_minor)}`, `Total paid: ${naira(order.total_minor)}`, method, address].join("\n");
  const reference = String(order.id).replace(/[\r\n]/g, " ");
  return [
    {
      kind: "customer", to: order.customer_email,
      subject: `Your Elegant Style receipt — ${reference}`,
      html: wrap("Payment received", `<p>Hello ${safe(order.customer_name)},</p><p>Thank you. We have received payment for your order.</p>${details}<p>We will contact you to arrange ${delivery.method === "pickup" ? "pickup" : "delivery"}. For help, call 08166361710 and quote your order reference.</p><p>We will email you again when your order ${delivery.method === "pickup" ? "is ready for pickup" : "has shipped"}.</p>`),
      text: `Hello ${order.customer_name},\nThank you. Your order is paid.\n${commonText}\nWe will contact you to arrange ${delivery.method === "pickup" ? "pickup" : "delivery"}. For help, call 08166361710. We will email you again when your order ${delivery.method === "pickup" ? "is ready for pickup" : "has shipped"}.`,
    },
    {
      kind: "shop", to: shopRecipient,
      subject: `Paid shop order — ${reference}`,
      html: wrap("New paid order", `<p><strong>Customer:</strong> ${safe(order.customer_name)}</p><p><strong>Email:</strong> ${safe(order.customer_email)}</p><p><strong>Phone:</strong> ${safe(order.customer_phone)}</p>${details}<p>Manage this order in the Elegant Style admin orders page.</p>`),
      text: `New paid order\nCustomer: ${order.customer_name}\nEmail: ${order.customer_email}\nPhone: ${order.customer_phone}\n${commonText}`,
    },
  ];
}

// The webhook's atomic payment update has already claimed this attempt.
// Never throw or retry here: payment success must remain independent of email.
export async function sendOrderEmails(order, { env = process.env, fetchImpl = fetch, logger = console } = {}) {
  try {
    const recipient = ADMIN_NOTIFY_EMAIL;
    const messages = buildOrderEmails(order, recipient);
    await Promise.all(messages.map(async ({ kind, to, ...message }) => {
      try {
        if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !to) throw new Error("Email configuration or recipient is missing");
        const response = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `paid-order/${order.id}/${kind}`,
          },
          body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [to], ...message }),
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
        logger.info(`Order ${order.id}: ${kind} email accepted by Resend`);
      } catch (error) {
        logger.error(`Order ${order.id}: ${kind} email failed`, error.message);
      }
    }));
  } catch (error) {
    logger.error(`Order ${order.id}: email preparation failed`, error.message);
  }
}
