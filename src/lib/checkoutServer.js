import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "node:crypto";

export function checkoutDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Order database is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function receiptHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function hasOrderAccess(request, order) {
  const token = request.cookies.get(`es_order_${order.id}`)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(order.receipt_hash || "")) return false;
  return timingSafeEqual(Buffer.from(receiptHash(token), "hex"), Buffer.from(order.receipt_hash, "hex"));
}

export function setOrderCookie(response, id, token) {
  response.cookies.set(`es_order_${id}`, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/checkout", maxAge: 7 * 24 * 60 * 60 });
  return response;
}
