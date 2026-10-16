import { createHmac, timingSafeEqual } from "node:crypto";
import { moneyToMinor } from "./checkout.mjs";

export function paymentMatchesOrder(data, totalMinor) {
  try {
    return data.status === "SUCCEEDED" && data.currency === "NGN" && moneyToMinor(data.amount) === Number(totalMinor);
  } catch { return false; }
}

export function verifyBachsSignature(rawBody, headers, secret, now = Date.now()) {
  if (!secret) return false;
  const v2 = headers.get("x-bachs-signature-v2");
  const parts = v2?.split(",").map((part) => part.trim()) || [];
  const timestamp = v2 ? parts.find((part) => part.startsWith("t="))?.slice(2) : headers.get("x-bachs-timestamp");
  const signatures = v2 ? parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3)) : [headers.get("x-bachs-signature")];
  if (!/^\d+$/.test(timestamp || "") || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((signature) => /^[a-f0-9]{64}$/i.test(signature || "") && timingSafeEqual(expected, Buffer.from(signature, "hex")));
}

export function bachsBaseUrl(key) {
  if (key?.startsWith("sk_sandbox_")) return "https://sandbox-api.bachs.io";
  if (key?.startsWith("sk_live_")) return "https://api.bachs.io";
  throw new Error("Bachs API key is not configured.");
}

export function validCheckoutUrl(value, key) {
  try {
    const url = new URL(value);
    const allowedHosts = key.startsWith("sk_sandbox_") ? ["sandbox-checkout.bachs.io", "checkout.bachs.io"] : ["checkout.bachs.io"];
    return url.protocol === "https:" && !url.username && !url.password && !url.port && allowedHosts.includes(url.hostname);
  } catch { return false; }
}
