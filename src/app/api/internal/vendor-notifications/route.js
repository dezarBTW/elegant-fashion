import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { notifyPaidVendors } from "@/lib/vendorOrderEmails.mjs";
import { notifySellerItem } from "@/lib/sellerItemEmails.mjs";
import { sendServiceEmail, wrapBrandEmail } from "@/lib/orderEmails.mjs";
import { SITE_URL } from "@/lib/seo.mjs";
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
    .limit(1);
  if (result.error)
    return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
  let sent = 0;
  for (const job of result.data) {
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
      else if (job.kind === "invite") {
        const vendor = await db
          .from("vendor_accounts")
          .select("status")
          .eq("user_id", job.entity_id)
          .single();
        if (vendor.error) throw vendor.error;
        if (vendor.data.status !== "pending") ok = true;
        else {
          const user = await db
            .from("users")
            .select("email")
            .eq("id", job.entity_id)
            .single();
          if (user.error) throw user.error;
          ok = await sendServiceEmail({
            to: user.data.email,
            subject: "Your Elegant Style vendor invitation",
            idempotencyKey: `vendor-invite/${job.id}`,
            html: wrapBrandEmail(
              "Vendor invitation",
              `<p>Review the vendor agreement and confirm your decision after signing in.</p><p><a href="${SITE_URL}/account/products?decision=accept">I accept — review terms</a></p><p><a href="${SITE_URL}/account/products?decision=decline">I do not accept — review decision</a></p>`,
            ),
          });
        }
      }
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
  return NextResponse.json({ processed: result.data.length, sent });
}
