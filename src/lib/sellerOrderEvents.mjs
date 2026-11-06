export const SELLER_ORDERS_CHANGED = 'elegant-seller-orders-changed';
export function publishSellerOrderChange() {
  try { localStorage.setItem(SELLER_ORDERS_CHANGED, crypto.randomUUID()); } catch { /* Focus and manual refresh still work without storage. */ }
}
