// Deadlines use elapsed time from the recorded delivery confirmation, in UTC.
export const RETURN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const DELIVERY_DEADLINE_MS = 7 * 24 * 60 * 60 * 1000;

function deadline(timestamp, duration) {
  const time = Date.parse(timestamp);
  if (!Number.isFinite(time)) return null;
  return new Date(time + duration).toISOString();
}

export function returnDeadline(confirmedAt) {
  return deadline(confirmedAt, RETURN_WINDOW_MS);
}

export function deliveryDeadline(paidAt) {
  return deadline(paidAt, DELIVERY_DEADLINE_MS);
}

export function vendorPaymentEligible({ confirmedAt, hasOpenRequest, now = Date.now() }) {
  const end = returnDeadline(confirmedAt);
  return Boolean(end && hasOpenRequest === false && Number.isFinite(now) && now >= Date.parse(end));
}

export function returnRequestAllowed({ confirmedAt, now = Date.now() }) {
  const start = Date.parse(confirmedAt);
  const end = returnDeadline(confirmedAt);
  return Boolean(end && Number.isFinite(now) && now >= start && now < Date.parse(end));
}
