import { ADMIN_NOTIFY_EMAIL, escapeEmailHtml as safe, sendServiceEmail, wrapBrandEmail } from "./orderEmails.mjs";

export function supportEmail(request, kind, recipient, audience = "customer", updated = false, customerEmail = "") {
  const label = kind === "refund" ? "Refund request" : "Product complaint";
  const heading = updated ? `${label} update` : `${label} received`;
  const details = `${label} reference: ${request.id}\nOrder: ${request.order_id}\nProduct: ${request.product_name}\nStatus: ${request.status}${audience === "admin" ? `\nCustomer account email: ${customerEmail}` : ""}\nDetails: ${request.description}${request.response ? `\nResponse: ${request.response}` : ""}`;
  const note = kind === "refund" ? "Approval records the shop's decision. Any payment refund is arranged separately through Bachs; a status change does not itself transfer funds." : "The shop will review your complaint and contact you if more information is needed.";
  return {
    to: recipient, subject: `Elegant Style ${heading.toLowerCase()} — ${request.id}`,
    idempotencyKey: `support/${kind}/${request.id}/${updated ? request.status : "received"}/${audience}`,
    html: wrapBrandEmail(heading, `<p style="white-space:pre-line">${safe(details)}</p><p>${safe(note)}</p><p>View this request in your Elegant Style ${audience === "admin" ? "admin dashboard" : "account"}.</p>`),
    text: `${details}\n\n${note}`,
  };
}

export async function notifySupportRequest(request, kind, customerEmail, updated = false) {
  const messages = [supportEmail(request, kind, customerEmail, "customer", updated)];
  if (!updated) messages.push(supportEmail(request, kind, ADMIN_NOTIFY_EMAIL, "admin", false, customerEmail));
  await Promise.all(messages.map((message) => sendServiceEmail(message)));
}
