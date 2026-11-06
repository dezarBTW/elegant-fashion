import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { notifyPaidVendors } from "@/lib/vendorOrderEmails.mjs";
import { notifySellerItem } from "@/lib/sellerItemEmails.mjs";
export const maxDuration = 60;
export async function POST(request) {
  const expected = process.env.VENDOR_WORKER_SECRET;
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = checkoutDatabase();
  const result = await db
    .from("vendor_notifications")
    .select("id,kind,entity_id,attempts")
    .is("sent_at", null)
    .lte('next_attempt_at',new Date().toISOString())
    .order("created_at")
    .limit(5);
  if (result.error)
    return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
  let sent = 0;
  let processed = 0;
  const stopStartingJobsAt = Date.now() + 15000;
  for (const job of result.data) {
    // Leave room for the current email's bounded retries before Vercel's limit.
    if (Date.now() > stopStartingJobsAt) break;
    processed++;
    try {
      let ok;
      if (
        ["shipped", "ready", "payment_fulfilled", "payment_received"].includes(
          job.kind,
        )
      ) {
        const item = await db
          .from("seller_order_items")
          .select("*")
          .eq("id", job.entity_id)
          .single();
        if (item.error) throw item.error;
        ok = await notifySellerItem(db, item.data, job.kind);
      } else if (job.kind === "paid")
        ok = await notifyPaidVendors(db, job.entity_id);
      else if (job.kind === "invite") ok = true; // Retired onboarding jobs must never send.
      if (ok !== true) throw new Error("Email delivery attempt failed");
      const saved = await db
        .from("vendor_notifications")
        .update({
          sent_at: new Date().toISOString(),
          attempts: job.attempts + 1,
          last_error: null,
        })
        .eq("id", job.id);
      if (saved.error) throw saved.error;
      sent++;
    } catch {
      await db
        .from("vendor_notifications")
        .update({
          attempts: job.attempts + 1,
          last_error: "Delivery failed; queued for retry.",
          next_attempt_at: new Date(Date.now()+Math.min(3600000,60000*2**Math.min(job.attempts,6))).toISOString(),
        })
        .eq("id", job.id);
    }
  }
  return NextResponse.json({ processed, sent });
}
