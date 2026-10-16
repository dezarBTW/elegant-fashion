import { NextResponse } from "next/server";
import { randomBytes, createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { checkoutDatabase, hasOrderAccess, receiptHash, setOrderCookie } from "@/lib/checkoutServer";
import { deliveryFeeMinor, decimalAmount, priceCart } from "@/lib/checkout.mjs";
import { bachsBaseUrl, validCheckoutUrl } from "@/lib/bachs.mjs";
import { SITE_URL } from "@/lib/seo.mjs";

export const runtime = "nodejs";

const schema = z.object({
  attemptId: z.uuid(),
  items: z.array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(10) }).strict()).min(1).max(20),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254).transform((value) => value.toLowerCase()),
    phone: z.string().trim().transform((value) => value.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^(?:0[789]\d{9}|\+234[789]\d{9})$/)),
  }).strict(),
  delivery: z.object({
    method: z.enum(["pickup", "yenagoa", "outside_yenagoa"]),
    address: z.string().trim().max(300).default(""),
    city: z.string().trim().max(100).default(""),
    state: z.string().trim().max(100).default(""),
  }).strict(),
}).strict().superRefine((data, ctx) => {
  if (data.delivery.method !== "pickup" && (!data.delivery.address || !data.delivery.city || !data.delivery.state)) {
    ctx.addIssue({ code: "custom", message: "Enter your delivery address, city and state." });
  }
  if (data.delivery.method === "yenagoa" && (data.delivery.city.toLowerCase() !== "yenagoa" || !/^bayelsa(?: state)?$/i.test(data.delivery.state))) {
    ctx.addIssue({ code: "custom", message: "Free delivery is within Yenagoa, Bayelsa only. Choose outside Yenagoa for other addresses." });
  }
});

export async function POST(request) {
  const errorResponse = (message, status = 400, extra = {}) => NextResponse.json({ error: message, ...extra }, { status });
  if (request.headers.get("origin") !== new URL(request.url).origin) return errorResponse("Invalid request origin.", 403);
  if (Number(request.headers.get("content-length") || 0) > 20000) return errorResponse("Request is too large.", 413);
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 20000) return errorResponse("Request is too large.", 413);
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message);
    input = parsed.data;
  } catch { return errorResponse("Invalid checkout details."); }

  const apiKey = process.env.BACHS_API_KEY;
  if (!apiKey || !process.env.BACHS_WEBHOOK_SECRET) return errorResponse("Online payments are not available yet. Please try again later.", 503);
  let baseUrl;
  try { baseUrl = bachsBaseUrl(apiKey); } catch { return errorResponse("Online payments are not configured.", 503); }

  let db;
  try { db = checkoutDatabase(); } catch { return errorResponse("Order service is unavailable.", 503); }
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const id = input.attemptId;
  let token;
  const respond = (body, status = 200) => {
    const response = NextResponse.json(body, { status });
    return token ? setOrderCookie(response, id, token) : response;
  };

  try {
    const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY).update(ip).digest("hex");
    const { data: allowed, error: rateError } = await db.rpc("consume_checkout_rate_limit", { p_ip_hash: ipHash });
    if (rateError) return errorResponse("Order service is not ready. Please try again later.", 503);
    if (!allowed) return errorResponse("Too many checkout attempts. Please wait before trying again.", 429);

    const { data: existing, error: lookupError } = await db.from("shop_orders").select("*").eq("id", id).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      if (!hasOrderAccess(request, existing)) return errorResponse("This checkout cannot be reused.", 403);
      if (existing.request_fingerprint !== fingerprint) return errorResponse("Your checkout details changed. Please start a new checkout.", 409);
      if (existing.payment_status === "paid") return respond({ orderId: id, paid: true });
      if (existing.checkout_state === "open" && validCheckoutUrl(existing.checkout_url, apiKey)) return respond({ orderId: id, checkoutUrl: existing.checkout_url });
      return respond({ error: "This payment setup needs to be checked. Please contact the shop with your order reference before trying again.", orderId: id, uncertain: true }, 409);
    }

    const ids = [...new Set(input.items.map((item) => item.productId))];
    const { data: products, error: productError } = await db.from("products").select("id,name,price,sale_price,is_active").in("id", ids).eq("is_active", true);
    if (productError) throw productError;
    let pricing;
    try { pricing = priceCart(input.items, products || []); } catch (error) { return errorResponse(error.message); }
    const shippingMinor = deliveryFeeMinor(input.delivery.method);
    const totalMinor = pricing.subtotalMinor + shippingMinor;
    token = randomBytes(32).toString("hex");
    const { error: insertError } = await db.from("shop_orders").insert({
      id, customer_name: input.customer.name, customer_email: input.customer.email, customer_phone: input.customer.phone,
      delivery: input.delivery, items: pricing.lines, subtotal_minor: pricing.subtotalMinor,
      shipping_minor: shippingMinor, total_minor: totalMinor, receipt_hash: receiptHash(token), request_fingerprint: fingerprint,
    });
    if (insertError) { token = undefined; throw insertError; }

    // A lost response is uncertain: don't automatically create a second session.
    let response;
    try {
      response = await fetch(`${baseUrl}/v1/checkout-sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": id },
        body: JSON.stringify({
          pricing: { currency: "NGN", amount: decimalAmount(totalMinor) },
          billing_currency: "NGN", customer: { email: input.customer.email, name: input.customer.name, phone_number: input.customer.phone.replace(/^0/, "+234") },
          reference: id, metadata: { order_id: id },
          success_url: `${SITE_URL}/checkout/success?order_id=${id}`,
          cancel_url: `${SITE_URL}/checkout?cancelled=1`,
        }),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      await db.from("shop_orders").update({ checkout_state: "unknown" }).eq("id", id);
      return respond({ error: "We couldn't confirm payment setup. Please contact the shop with your order reference before trying again.", orderId: id, uncertain: true }, 503);
    }
    if (!response.ok) {
      await db.from("shop_orders").update({ checkout_state: "unknown" }).eq("id", id);
      console.error("Bachs checkout rejected", response.status);
      return respond({ error: "Payment setup could not be confirmed. Please contact the shop with your order reference.", orderId: id, uncertain: true }, 502);
    }
    const session = await response.json();
    if (!session.checkout_id || !validCheckoutUrl(session.checkout_url, apiKey)) throw new Error("Invalid Bachs checkout response.");
    const { error: saveError } = await db.from("shop_orders").update({ checkout_state: "open", checkout_id: session.checkout_id, checkout_url: session.checkout_url }).eq("id", id);
    if (saveError) throw saveError;
    return respond({ orderId: id, checkoutUrl: session.checkout_url });
  } catch (error) {
    console.error("Checkout failed", error?.code || error?.message);
    return respond({ error: "Checkout is unavailable. Please try again later.", ...(token ? { orderId: id, uncertain: true } : {}) }, 503);
  }
}
