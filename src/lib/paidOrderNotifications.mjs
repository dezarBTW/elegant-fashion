import {
  buildOrderEmails,
  ADMIN_NOTIFY_EMAIL,
  sendServiceEmail,
} from "./orderEmails.mjs";
import { notifyPaidVendors } from "./vendorOrderEmails.mjs";

export async function sendTrackedOrderEmail(
  db,
  orderId,
  message,
  { sendEmail = sendServiceEmail } = {},
) {
  const { idempotencyKey, to, ...payload } = message;
  const claimed = await db.rpc("claim_order_email", {
    p_order_id: orderId,
    p_key: idempotencyKey,
    p_recipient: to,
    p_message: { from: process.env.RESEND_FROM_EMAIL, ...payload },
  });
  if (claimed.error) throw claimed.error;
  if (claimed.data.sent) return true;
  if (!claimed.data.token) return false;
  let sent = false;
  try {
    sent = await sendEmail({
      ...claimed.data.message,
      to: claimed.data.recipient,
      idempotencyKey,
    });
  } catch {
    console.error(
      "Order email provider attempt failed",
      orderId,
      idempotencyKey,
    );
  }
  const finished = await db
    .from("order_email_deliveries")
    .update({
      email_status: sent ? "sent" : "failed",
      sent_at: sent ? new Date().toISOString() : null,
      last_error: sent ? null : "Provider send failed or outcome unknown",
      lease_token: null,
      lease_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("notification_key", idempotencyKey)
    .eq("lease_token", claimed.data.token)
    .select("notification_key")
    .maybeSingle();
  if (finished.error) throw finished.error;
  if (!finished.data)
    throw new Error("Email delivery lease changed before completion");
  if (!sent)
    console.error("Order email remains retryable", orderId, idempotencyKey);
  return sent;
}

export async function sendPaidOrderNotifications(db, order, options = {}) {
  if (order.payment_status !== "paid" || !order.email_tracking_started_at)
    return { failed: 0 };
  const sendEmail = (message) =>
    sendTrackedOrderEmail(db, order.id, message, options);
  const results = await Promise.allSettled([
    ...buildOrderEmails(order, ADMIN_NOTIFY_EMAIL).map(({ kind, ...message }) =>
      sendEmail({
        ...message,
        idempotencyKey: `paid-order/${order.id}/${kind}`,
      }),
    ),
    notifyPaidVendors(db, order.id, { sendEmail }),
  ]);
  const failed = results.filter(
    (result) => result.status === "rejected" || result.value !== true,
  ).length;
  if (failed)
    console.error("Paid order notifications incomplete", order.id, failed);
  const saved = await db
    .from("shop_orders")
    .update({ email_status: failed ? "failed" : "sent" })
    .eq("id", order.id)
    .eq("payment_status", "paid");
  if (saved.error) throw saved.error;
  return { failed };
}
