import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutDatabase, receiptHash } from "@/lib/checkoutServer";

export const runtime = "nodejs";
const bodySchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), confirmed: z.literal(true) }).strict();
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });

export async function POST(request, { params }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return json({ error: "Invalid order reference." }, 400);
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
  const raw = await request.text();
  if (raw.length > 512) return json({ error: "Request is too large." }, 413);
  let input;
  try { input = bodySchema.safeParse(JSON.parse(raw)); } catch { return json({ error: "Invalid confirmation." }, 400); }
  if (!input.success) return json({ error: "Use your personal email link and confirm that you received the order." }, 400);
  try {
    const db = checkoutDatabase();
    const hash = receiptHash(input.data.token);
    const { data: changed, error } = await db.from("shop_orders").update({ customer_received_at: new Date().toISOString() })
      .eq("id", id).eq("payment_status", "paid").eq("receipt_confirmation_hash", hash).is("customer_received_at", null)
      .select("id,customer_received_at").maybeSingle();
    if (error) throw error;
    if (changed) return json({ confirmed: true, receivedAt: changed.customer_received_at });
    const { data: existing, error: lookupError } = await db.from("shop_orders").select("customer_received_at")
      .eq("id", id).eq("payment_status", "paid").eq("receipt_confirmation_hash", hash).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.customer_received_at) return json({ confirmed: true, alreadyConfirmed: true, receivedAt: existing.customer_received_at });
    return json({ error: "This confirmation link is invalid or is not for a paid order. Use the link in your payment email." }, 400);
  } catch (error) {
    console.error("Order receipt confirmation failed", error?.code || "database_error");
    return json({ error: "Unable to save your confirmation. Please try again." }, 503);
  }
}
