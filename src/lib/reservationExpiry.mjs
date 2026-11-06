export function reservationExpired(order, now = Date.now()) {
  const deadline = Date.parse(order.reservation_expires_at);
  return (
    order.checkout_state === "expired" ||
    !Number.isFinite(deadline) ||
    deadline <= now
  );
}

export function checkoutLifetimeMinutes(deadline, now = Date.now()) {
  const minutes = Math.floor((Date.parse(deadline) - now) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1)
    throw new Error("Checkout reservation has expired. Start a new checkout.");
  return Math.min(30, minutes);
}
