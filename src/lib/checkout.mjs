export const CART_KEY = "elegant-style-cart";
export const PICKUP_ADDRESS = "Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State";

export function deliveryFeeMinor(method) {
  if (method === "pickup" || method === "yenagoa") return 0;
  if (method === "outside_yenagoa") return 200000;
  throw new Error("Choose a delivery option.");
}

export function moneyToMinor(value) {
  const match = String(value).match(/^(\d{1,9})(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("Invalid price.");
  return Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
}

export function decimalAmount(minor) {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error("Invalid amount.");
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}

export function priceCart(items, products) {
  const quantities = new Map();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) throw new Error("Choose between 1 and 10 of each item.");
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  }
  if (!quantities.size || quantities.size > 20) throw new Error("Your cart must contain between 1 and 20 different items.");
  const lines = [...quantities].map(([productId, quantity]) => {
    const product = products.find((entry) => entry.id === productId && entry.is_active === true);
    if (!product || quantity > 10) throw new Error("An item is unavailable or its quantity is too high. Please update your cart.");
    const unitAmountMinor = moneyToMinor(product.sale_price ?? product.price);
    return { productId, name: product.name, quantity, unitAmountMinor, lineAmountMinor: unitAmountMinor * quantity };
  });
  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineAmountMinor, 0);
  if (subtotalMinor < 100 || subtotalMinor > 1000000000) throw new Error("The order total is outside the supported range.");
  return { lines, subtotalMinor };
}

export function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item && typeof item.id === "string").slice(0, 200) : [];
  } catch { return []; }
}
