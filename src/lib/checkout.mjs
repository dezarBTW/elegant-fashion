import { SIZE_VALUES, availableSizes } from "./products.mjs";

export const CART_KEY = "elegant-style-cart";
export const CART_CHANGED = "elegant-style-cart-changed";
export const cartLineKey = (id, size = "") => `${id}:${size}`;
export function writeCart(items) {
  const normalized = normalizeCart(items);
  localStorage.setItem(CART_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(CART_CHANGED));
  return normalized;
}
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
    const size = item.size || "";
    if (size && !SIZE_VALUES.includes(size)) throw new Error("Choose a valid product size.");
    const key = cartLineKey(item.productId, size);
    const previous = quantities.get(key);
    quantities.set(key, { productId: item.productId, size, quantity: (previous?.quantity || 0) + item.quantity });
  }
  if (!quantities.size || quantities.size > 20) throw new Error("Your cart must contain between 1 and 20 different items.");
  const lines = [...quantities.values()].map(({ productId, size, quantity }) => {
    const product = products.find((entry) => entry.id === productId && entry.is_active === true);
    if (!product || quantity > 10) throw new Error("An item is unavailable or its quantity is too high. Please update your cart.");
    if (Array.isArray(product.available_sizes) && (!size || !product.available_sizes.includes(size))) throw new Error(`Choose an available size for ${product.name}. Please update your cart.`);
    const unitAmountMinor = moneyToMinor(product.sale_price ?? product.price);
    return { productId, name: product.name, ...(size ? { size } : {}), quantity, unitAmountMinor, lineAmountMinor: unitAmountMinor * quantity };
  });
  const subtotalMinor = lines.reduce((sum, line) => sum + line.lineAmountMinor, 0);
  if (subtotalMinor < 100 || subtotalMinor > 1000000000) throw new Error("The order total is outside the supported range.");
  return { lines, subtotalMinor };
}

export function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return normalizeCart(saved);
  } catch { return []; }
}

// Preview pending selections without weakening the server's strict priceCart check.
export function previewCheckoutCart(cart, products, limits) {
  const lines = normalizeCart(cart).map(item => {
    const product = products.find(product => product.id === item.id && product.is_active === true);
    const sizes = product ? availableSizes(product) : [];
    const size = sizes.includes(item.size) ? item.size : "";
    const unitAmountMinor = product ? moneyToMinor(product.sale_price ?? product.price) : 0;
    return { productId: item.id, name: product?.name || "Unavailable product", size, quantity: item.quantity, availableSizes: sizes, unitAmountMinor, lineAmountMinor: unitAmountMinor * item.quantity };
  });
  return { lines, subtotalMinor: lines.reduce((total, line) => total + line.lineAmountMinor, 0), ready: lines.length > 0 && lines.every(line => Boolean(line.size) && (limits === undefined || line.quantity <= (limits[line.productId]?.[line.size]||0))) };
}

export function updateCheckoutItem(cart, index, changes) {
  const items = normalizeCart(cart);
  if (!Number.isInteger(index) || !items[index]) throw new Error("This cart item is no longer available. Please refresh.");
  const item = { ...items[index], ...changes };
  if (item.id !== items[index].id || !Number.isInteger(item.quantity) || item.quantity < 0 || item.quantity > 10) throw new Error("Choose between 1 and 10 of each item.");
  if (item.size && !SIZE_VALUES.includes(item.size)) throw new Error("Choose a valid product size.");
  const next = items.flatMap((entry, position) => position === index ? (item.quantity ? [item] : []) : [entry]);
  const totals = new Map();
  for (const entry of next) {
    const key = cartLineKey(entry.id, entry.size);
    totals.set(key, (totals.get(key) || 0) + entry.quantity);
    if (totals.get(key) > 10) throw new Error("Combining these selections exceeds 10 units of the same size. Reduce the quantity first.");
  }
  return normalizeCart(next);
}

export function normalizeCart(saved) {
  const quantities = new Map();
  for (const item of Array.isArray(saved) ? saved.slice(0, 200) : []) {
    if (!item || typeof item.id !== "string" || !item.id) continue;
    const quantity = item.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) continue;
    const size = item.size || "";
    if (size && !SIZE_VALUES.includes(size)) continue;
    const key = cartLineKey(item.id, size);
    quantities.set(key, { id: item.id, ...(size ? { size } : {}), quantity: Math.min(10, (quantities.get(key)?.quantity || 0) + quantity) });
  }
  return [...quantities.values()];
}

export function setCartQuantity(cart, productId, quantity, size = "") {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10) throw new Error("Choose between 1 and 10 of each item.");
  const items = normalizeCart(cart);
  if (size && !SIZE_VALUES.includes(size)) throw new Error("Choose a valid product size.");
  const matches = item => cartLineKey(item.id, item.size) === cartLineKey(productId, size);
  if (!quantity) return items.filter((item) => !matches(item));
  if (items.some(matches)) return items.map((item) => matches(item) ? { ...item, quantity } : item);
  if (items.length >= 20) throw new Error("Your cart already contains 20 different items.");
  return [...items, { id: productId, ...(size ? { size } : {}), quantity }];
}

export function addCartItem(cart, productId, quantity = 1, size = "") {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error("Choose between 1 and 10 of each item.");
  const current = normalizeCart(cart).find((item) => cartLineKey(item.id, item.size) === cartLineKey(productId, size))?.quantity || 0;
  return setCartQuantity(cart, productId, current + quantity, size);
}

export function subtractPurchasedItems(cart, purchased) {
  const quantities = new Map();
  for (const item of purchased) {
    const key = cartLineKey(item.productId, item.size);
    quantities.set(key, (quantities.get(key) || 0) + item.quantity);
  }
  return normalizeCart(cart).map((item) => ({ ...item, quantity: Math.max(0, item.quantity - (quantities.get(cartLineKey(item.id, item.size)) || 0)) })).filter((item) => item.quantity > 0);
}
