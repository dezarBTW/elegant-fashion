# Elegant Style: paid-order emails and admin order management

This document contains every changed or added application, configuration, migration and test file in full. The migration was **applied to the linked Elegant Style Fashion Supabase project** on 16 October 2026 and verified. Its local timestamp matches remote migration history. No real order emails were sent during testing.

## Setup and deployment

1. The SQL migration below is already applied to the linked Supabase project; do not run it again. For a separate environment, apply it **before deploying the new application code**. It adds the atomic email claim, supports the new fulfilment states, and removes direct browser-role access to shop_orders. If existing rows contain fulfilment states outside new, processing, ready, shipped and completed, the transaction will fail safely; inspect and reconcile those rows before rerunning.
2. Configure Vercel's server environment: RESEND_API_KEY, RESEND_FROM_EMAIL, and ORDER_NOTIFY_EMAIL. Use `Elegant Styles <requests@elegantstyle.com.ng>` as the sender once that domain is verified in Resend. ORDER_NOTIFY_EMAIL falls back to BESPOKE_NOTIFY_EMAIL when absent or blank. These variables must never use a NEXT_PUBLIC_ prefix.
3. Deploy the code. Existing Supabase server credentials and BACHS_WEBHOOK_SECRET are reused.
4. Complete the provider sandbox and authenticated browser checks below.

## Resulting behavior and limits

A successful, matching collection.succeeded event conditionally updates the order only while payment_status is not paid. That same database update records paid_at and emails_claimed_at and returns the data used to render the two emails. Only the request whose update returns a row sends email. A concurrent request or a later replay cannot send again. Signature verification and amount/currency matching have not been changed.

Each email uses an independent Resend request, with a stable per-order/per-recipient-kind idempotency key. A failure in one send does not prevent the other. HTML values are escaped, and both HTML and plain-text alternatives are supplied. The gold and cream accents are #C9A962 and #F7F2E9.

**emails_claimed_at means an attempt has been claimed, not that delivery succeeded.** Failures are logged and the webhook still returns 200 after the payment is saved. If sending fails or the process stops after claiming, later Bachs retries will not attempt those emails again. This is at-most-once dispatch, not guaranteed delivery. Previously paid orders are not backfilled. Do not clear the claim to replay a payment webhook; any future manual resend should be a separate, audited operation.

The orders API verifies the bearer token with Supabase Auth and reads public.users afresh to require is_admin = true and is_active = true. Browser access to shop_orders is removed by the migration. The list uses server filters, 25-row pagination, newest-first ordering and explicit returned columns. Order details include the customer, contacts, items, delivery/pickup address and amounts. Review payments are highlighted and cannot be fulfilled. The update payload is strict and the only database column written is fulfillment_status.

Permitted forward transitions are:

- Pickup: new → processing → ready → completed.
- Delivery: new → processing → ready → shipped → completed, or processing → shipped.
- Concurrent edits require the expected current state; a stale edit returns 409.

## Validation already completed

- 11 new automated tests passed: concurrent/replayed payment events, email failures, mismatched payments, HTML escaping, naira totals, pickup address, Resend recipient fallback/override and independent failures, missing configuration, server authentication/authorization, list filtering and projection, protected update fields, transitions and concurrent edits.
- 5 existing checkout tests passed, including Bachs signatures, amount matching and delivery calculations.
- Targeted ESLint passed for the changed JavaScript/MJS files and new tests.
- Production Next.js build passed. The existing multiple-lockfile workspace-root warning remains.
- git diff --check passed.
- Local production HTTP checks confirmed unauthenticated GET and PATCH /api/admin/orders return 401 with private, no-store caching.
- Real Resend delivery, Bachs sandbox checkout and authenticated visual/admin browser checks were not performed.

Commands:

```powershell
node --experimental-vm-modules --test scripts/order-management.test.mjs
node --test scripts/checkout.test.mjs
npx eslint src/app/api/bachs/webhook/route.js src/lib/orderEmails.mjs src/lib/orderManagement.mjs src/app/api/admin/orders/route.js src/app/admin/orders/page.js scripts/order-management.test.mjs
npm run build
git diff --check
```

## Short manual test plan

1. After applying SQL and configuring the environment in a test deployment, pay one pickup order through Bachs sandbox. Confirm payment_status = paid, paid_at and emails_claimed_at are set, and exactly one customer receipt and one shop notification arrive. Check the reference, item quantities, naira amounts, pickup address and styling.
2. Repeat with delivery inside Yenagoa and outside Yenagoa. Confirm the receipt/admin totals match the checkout, including free Yenagoa delivery or ₦2,000 outside Yenagoa.
3. Replay the same valid, signed webhook and send it concurrently. Confirm no duplicate emails. Test an amount/currency mismatch and confirm review status without email. An invalid signature must retain the existing rejection behavior.
4. With a deliberately failing Resend mock in a test environment, confirm both email attempts are independent, the payment remains paid, the failure is logged, the webhook returns 200 and replay sends nothing further.
5. As an active admin, open /admin/orders. Check newest-first ordering, both filters, pagination, review highlighting and all contact/item/address details. Move paid pickup and delivery orders through the allowed states and refresh to verify persistence.
6. Verify anonymous users, ordinary users, inactive admins, missing profiles and forged tokens cannot read or update orders. Attempt payment_status/amount fields, backwards/skipped transitions, unpaid/review fulfilment and a stale concurrent update: all must be rejected with no payment or amount changes.

## Admin access review: remaining risks

The orders routes now perform server-side authorization; the following existing account/authorization concerns were found during a read-only review and were not changed outside this task:

1. **An inactive account can potentially reactivate itself while its JWT remains valid.** The existing users_update_own_not_admin policy protects is_admin, but does not protect is_active, and the role has UPDATE privileges. Make is_active server-controlled and move legitimate self-deactivation into a checked server endpoint. The new orders API denies inactive profiles, but that check alone cannot prevent self-reactivation through the existing users policy.
2. **The existing public.is_admin_user() function ignores is_active.** Other admin RLS policies that use it can still authorize an inactive administrator with a valid token. The new orders API checks both fields; other administrative paths need the same account-status policy.
3. **Broad is_admin INSERT/UPDATE grants rely on RLS remaining correct.** The current own-profile INSERT policy requires is_admin = false, and the UPDATE policy compares against the current admin role; the observed policies do not establish a normal-user self-promotion exploit. Future permissive policies could undermine those protections. Prefer server-controlled role changes and narrow column privileges.
4. **Client isAdmin state is advisory and may be stale.** The admin shell/context obtains and caches profile state in the browser. It must never authorize service-role operations. The new orders API does not trust that flag, JWT user metadata or a caller-supplied admin ID.

## Provider references

- [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email)
- [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Supabase verified user lookup](https://supabase.com/docs/reference/javascript/auth-getuser)

## Complete changed files


### .env.example

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
RESEND_API_KEY=your-resend-api-key
BESPOKE_NOTIFY_EMAIL=your-notification-email@example.com
# Optional shop order recipient; falls back to BESPOKE_NOTIFY_EMAIL.
ORDER_NOTIFY_EMAIL=
RESEND_FROM_EMAIL="Elegant Styles <requests@elegantstyle.com.ng>"
# Optional: content value from the Google Search Console HTML verification tag.
GOOGLE_SITE_VERIFICATION=
# Bachs checkout: server-only secrets. Start with a sandbox key.
BACHS_API_KEY=
BACHS_WEBHOOK_SECRET=
```

### src/app/api/bachs/webhook/route.js

```javascript
import { NextResponse } from "next/server";
import { verifyBachsSignature, paymentMatchesOrder } from "@/lib/bachs.mjs";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { sendOrderEmails } from "@/lib/orderEmails.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 128000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyBachsSignature(raw, request.headers, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid payload." }, { status: 400 }); }
  // checkout.completed can be a free checkout. Only a collected payment fulfils orders.
  if (event.type !== "collection.succeeded") return NextResponse.json({ received: true });
  const data = event.data;
  if (!event.id || !data?.checkout_id || !data?.charge_id) return NextResponse.json({ received: true });
  try {
    const db = checkoutDatabase();
    const reference = data.reference || data.metadata?.order_id;
    let query = db.from("shop_orders").select("id,total_minor,payment_status,checkout_id");
    if (typeof reference === "string" && /^[0-9a-f-]{36}$/i.test(reference)) query = query.eq("id", reference);
    else query = query.eq("checkout_id", data.checkout_id);
    const { data: order, error } = await query.maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ received: true });
    if (order.checkout_id && order.checkout_id !== data.checkout_id) return NextResponse.json({ error: "Checkout reference mismatch." }, { status: 409 });
    if (order.payment_status === "paid") return NextResponse.json({ received: true });
    const paid = paymentMatchesOrder(data, order.total_minor);
    const paidAt = new Date().toISOString();
    const { data: changedOrder, error: saveError } = await db.from("shop_orders").update({
      payment_status: paid ? "paid" : "review",
      ...(paid ? { paid_at: paidAt, emails_claimed_at: paidAt, paid_event_id: event.id, payment_id: data.charge_id, checkout_id: data.checkout_id } : {}),
    }).eq("id", order.id).neq("payment_status", "paid")
      .select("id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,emails_claimed_at")
      .maybeSingle();
    if (saveError) throw saveError;
    if (paid && changedOrder?.emails_claimed_at) {
      try { await sendOrderEmails(changedOrder); }
      catch (error) { console.error(`Order ${order.id}: email attempt failed`, error?.message); }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Payment webhook failed", error?.code || error?.message);
    return NextResponse.json({ error: "Unable to save payment event." }, { status: 500 });
  }
}
```

### src/lib/orderEmails.mjs

```javascript
import { PICKUP_ADDRESS } from "./checkout.mjs";

export function escapeEmailHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

const naira = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;

export function buildOrderEmails(order, shopRecipient) {
  const safe = escapeEmailHtml;
  const delivery = order.delivery || {};
  const method = delivery.method === "pickup" ? "Shop pickup" : delivery.method === "yenagoa" ? "Delivery within Yenagoa" : "Delivery outside Yenagoa";
  const address = delivery.method === "pickup" ? PICKUP_ADDRESS : [delivery.address, delivery.city, delivery.state].filter(Boolean).join(", ");
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = items.map((item) => `<tr>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(item.name)}</td>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(item.quantity)}</td>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(naira(item.unitAmountMinor))}</td>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(naira(item.lineAmountMinor))}</td>
  </tr>`).join("");
  const totals = `<p>Subtotal: ${safe(naira(order.subtotal_minor))}</p>
    <p>Delivery / pickup: ${safe(naira(order.shipping_minor))}</p>
    <p style="font-size:20px;font-weight:700">Total paid: ${safe(naira(order.total_minor))}</p>`;
  const details = `<p>Order reference: <strong>${safe(order.id)}</strong></p>
    <table style="width:100%;border-collapse:collapse;text-align:left">
      <thead style="background:#F7F2E9"><tr><th style="padding:10px">Item</th><th style="padding:10px">Qty</th><th style="padding:10px">Unit price</th><th style="padding:10px">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>${totals}<h2 style="font-size:18px">${safe(method)}</h2>
    <p style="white-space:pre-wrap">${safe(address)}</p>`;
  const wrap = (heading, content) => `<!doctype html><html lang="en"><body style="margin:0;background:#F7F2E9;color:#24211e;font-family:'Segoe UI',Arial,sans-serif">
    <div style="max-width:680px;margin:24px auto;background:#ffffff;border-top:6px solid #C9A962;padding:28px">
      <p style="color:#8b6c2d;font-weight:700">ELEGANT STYLE</p><h1 style="font-size:26px">${heading}</h1>${content}
    </div></body></html>`;
  const itemText = items.map((item) => `${item.name} × ${item.quantity} — ${naira(item.unitAmountMinor)} each — ${naira(item.lineAmountMinor)}`).join("\n");
  const commonText = [`Order reference: ${order.id}`, itemText, `Subtotal: ${naira(order.subtotal_minor)}`, `Delivery / pickup: ${naira(order.shipping_minor)}`, `Total paid: ${naira(order.total_minor)}`, method, address].join("\n");
  const reference = String(order.id).replace(/[\r\n]/g, " ");
  return [
    {
      kind: "customer", to: order.customer_email,
      subject: `Your Elegant Style receipt — ${reference}`,
      html: wrap("Payment received", `<p>Hello ${safe(order.customer_name)},</p><p>Thank you. We have received payment for your order.</p>${details}<p>We will contact you to arrange ${delivery.method === "pickup" ? "pickup" : "delivery"}. For help, call 08166361710 and quote your order reference.</p>`),
      text: `Hello ${order.customer_name},\nThank you. Your order is paid.\n${commonText}\nWe will contact you to arrange ${delivery.method === "pickup" ? "pickup" : "delivery"}. For help, call 08166361710.`,
    },
    {
      kind: "shop", to: shopRecipient,
      subject: `Paid shop order — ${reference}`,
      html: wrap("New paid order", `<p><strong>Customer:</strong> ${safe(order.customer_name)}</p><p><strong>Email:</strong> ${safe(order.customer_email)}</p><p><strong>Phone:</strong> ${safe(order.customer_phone)}</p>${details}<p>Manage this order in the Elegant Style admin orders page.</p>`),
      text: `New paid order\nCustomer: ${order.customer_name}\nEmail: ${order.customer_email}\nPhone: ${order.customer_phone}\n${commonText}`,
    },
  ];
}

// The webhook's atomic payment update has already claimed this attempt.
// Never throw or retry here: payment success must remain independent of email.
export async function sendOrderEmails(order, { env = process.env, fetchImpl = fetch, logger = console } = {}) {
  try {
    const recipient = env.ORDER_NOTIFY_EMAIL?.trim() || env.BESPOKE_NOTIFY_EMAIL?.trim();
    const messages = buildOrderEmails(order, recipient);
    await Promise.all(messages.map(async ({ kind, to, ...message }) => {
      try {
        if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !to) throw new Error("Email configuration or recipient is missing");
        const response = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `paid-order/${order.id}/${kind}`,
          },
          body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [to], ...message }),
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
        logger.info(`Order ${order.id}: ${kind} email accepted by Resend`);
      } catch (error) {
        logger.error(`Order ${order.id}: ${kind} email failed`, error.message);
      }
    }));
  } catch (error) {
    logger.error(`Order ${order.id}: email preparation failed`, error.message);
  }
}
```

### src/lib/orderManagement.mjs

```javascript
export const PAYMENT_STATUSES = ["pending", "paid", "review"];
export const FULFILLMENT_STATUSES = ["new", "processing", "ready", "shipped", "completed"];
export const ORDER_COLUMNS = "id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,payment_status,fulfillment_status,paid_at,created_at";

export class OrderRequestError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function requireOrderAdmin(request, db) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new OrderRequestError("Sign in to manage orders.", 401);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new OrderRequestError("Your session has expired. Please sign in again.", 401);
  const { data: profile, error: profileError } = await db.from("users")
    .select("is_admin,is_active").eq("id", data.user.id).maybeSingle();
  if (profileError) throw new OrderRequestError("Unable to check administrator access.", 503);
  if (profile?.is_admin !== true || profile?.is_active !== true) throw new OrderRequestError("Administrator access is required.", 403);
  return data.user;
}

export function nextFulfillmentStatuses(status, deliveryMethod) {
  if (status === "new") return ["processing"];
  if (status === "processing") return deliveryMethod === "pickup" ? ["ready"] : ["ready", "shipped"];
  if (status === "ready") return deliveryMethod === "pickup" ? ["completed"] : ["shipped"];
  if (status === "shipped") return ["completed"];
  return [];
}
```

### src/app/api/admin/orders/route.js

```javascript
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { FULFILLMENT_STATUSES, PAYMENT_STATUSES, ORDER_COLUMNS, OrderRequestError, requireOrderAdmin, nextFulfillmentStatuses } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";
const pageSize = 25;
const querySchema = z.object({
  payment: z.enum(["all", ...PAYMENT_STATUSES]).default("all"),
  fulfillment: z.enum(["all", ...FULFILLMENT_STATUSES]).default("all"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict();
const updateSchema = z.object({
  id: z.uuid(),
  expected_status: z.enum(FULFILLMENT_STATUSES),
  fulfillment_status: z.enum(FULFILLMENT_STATUSES),
}).strict();
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

function failure(error) {
  if (error instanceof OrderRequestError) return json({ error: error.message }, error.status);
  console.error("Admin order request failed", error?.code || error?.message);
  return json({ error: "Order service is unavailable. Please try again." }, 503);
}

export async function GET(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return json({ error: "Invalid order filter or page." }, 400);
    const { payment, fulfillment, page } = parsed.data;
    let query = db.from("shop_orders").select(ORDER_COLUMNS, { count: "exact" });
    if (payment !== "all") query = query.eq("payment_status", payment);
    if (fulfillment !== "all") query = query.eq("fulfillment_status", fulfillment);
    const { data, count, error } = await query.order("created_at", { ascending: false })
      .order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return json({ orders: data || [], total: count || 0, page, pageSize });
  } catch (error) { return failure(error); }
}

export async function PATCH(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
    const raw = await request.text();
    if (raw.length > 2000) return json({ error: "Request is too large." }, 413);
    let parsed;
    try { parsed = updateSchema.safeParse(JSON.parse(raw)); }
    catch { return json({ error: "Invalid update payload." }, 400); }
    if (!parsed.success) return json({ error: "Only an order reference and fulfilment status can be updated." }, 400);
    const { id, expected_status, fulfillment_status } = parsed.data;
    const { data: order, error } = await db.from("shop_orders")
      .select("id,payment_status,fulfillment_status,delivery").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!order) return json({ error: "Order not found." }, 404);
    if (order.payment_status !== "paid") return json({ error: "Only paid orders can be fulfilled. Review the payment in Bachs first." }, 409);
    if (order.fulfillment_status !== expected_status) return json({ error: "This order changed. Refresh before updating it." }, 409);
    if (!nextFulfillmentStatuses(order.fulfillment_status, order.delivery?.method).includes(fulfillment_status)) return json({ error: "Invalid fulfilment transition for this delivery method." }, 409);
    const { data: updated, error: updateError } = await db.from("shop_orders")
      .update({ fulfillment_status }).eq("id", id).eq("payment_status", "paid")
      .eq("fulfillment_status", expected_status).select(ORDER_COLUMNS).maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return json({ error: "This order changed. Refresh before updating it." }, 409);
    return json({ order: updated });
  } catch (error) { return failure(error); }
}
```

### src/app/admin/orders/page.js

```jsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { PICKUP_ADDRESS } from "@/lib/checkout.mjs";
import { PAYMENT_STATUSES, FULFILLMENT_STATUSES, nextFulfillmentStatuses } from "@/lib/orderManagement.mjs";
import { formatDateTime } from "../adminUtils";
import styles from "../adminShell.module.css";
import orderStyles from "./orders.module.css";

const money = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const deliveryLabel = (method) => method === "pickup" ? "Shop pickup" : method === "yenagoa" ? "Delivery within Yenagoa" : "Delivery outside Yenagoa";

async function adminHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Your session has expired. Please sign in again.");
  return { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };
}

export default function Orders() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [payment, setPayment] = useState("all");
  const [fulfillment, setFulfillment] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    let mounted = true;
    const controller = new AbortController();
    const load = async () => {
      let repaging = false;
      try {
        const headers = await adminHeaders();
        if (!mounted) return;
        const query = new URLSearchParams({ payment, fulfillment, page: String(page) });
        const response = await fetch(`/api/admin/orders?${query}`, { headers, cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load orders.");
        if (mounted) {
          setTotal(result.total);
          setPageSize(result.pageSize);
          const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
          if (page > lastPage) { repaging = true; setPage(lastPage); return; }
          setOrders(result.orders);
          setError("");
        }
      } catch (err) {
        if (mounted) { setError(err.message || "Unable to load orders."); setOrders([]); setTotal(0); }
      } finally { if (mounted && !repaging) setLoading(false); }
    };
    load();
    return () => { mounted = false; controller.abort(); };
  }, [isAdmin, authLoading, payment, fulfillment, page, refresh]);

  const updateStatus = async (order, fulfillment_status) => {
    if (saving) return;
    setSaving(order.id);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH", headers: await adminHeaders(),
        body: JSON.stringify({ id: order.id, expected_status: order.fulfillment_status, fulfillment_status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update this order.");
      setLoading(true);
      setRefresh((value) => value + 1);
    } catch (err) { setError(err.message || "Unable to update this order."); }
    finally { setSaving(""); }
  };
  const changeFilter = (setFilter, value) => { setFilter(value); setPage(1); setLoading(true); };
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className={styles.pageHeader}>
        <div><h1 className={styles.pageTitle}>Shop orders</h1><p className={styles.pageSub}>Manage paid orders. Payments under review must be checked in Bachs before fulfilment.</p></div>
        <button type="button" className={styles.btn} disabled={loading || Boolean(saving)} onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh orders</button>
      </div>
      <div className={styles.toolbar}>
        <label className={orderStyles.filter}>Payment status
          <select className={styles.selectField} value={payment} disabled={Boolean(saving)} onChange={(event) => changeFilter(setPayment, event.target.value)}>
            <option value="all">All payments</option>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className={orderStyles.filter}>Fulfilment status
          <select className={styles.selectField} value={fulfillment} disabled={Boolean(saving)} onChange={(event) => changeFilter(setFulfillment, event.target.value)}>
            <option value="all">All fulfilment statuses</option>{FULFILLMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading ? <p className={styles.empty} role="status">Loading orders…</p> : <>
        <p className={styles.resultCount}>{total} matching {total === 1 ? "order" : "orders"} · newest first</p>
        {!orders.length ? <p className={styles.empty}>No orders match these filters.</p> : <div className={styles.list}>
          {orders.map((order) => {
            const review = order.payment_status === "review";
            const nextStatuses = nextFulfillmentStatuses(order.fulfillment_status, order.delivery?.method);
            return (
              <article className={`${styles.card} ${review ? orderStyles.review : ""}`} key={order.id}>
                <div className={styles.cardTop}>
                  <div><h2 className={styles.cardTitle}>{order.customer_name} — {money(order.total_minor)}</h2>
                    <p className={`${styles.meta} ${orderStyles.reference}`}>Reference: {order.id}</p>
                    <p className={styles.meta}>{formatDateTime(order.created_at)} · {deliveryLabel(order.delivery?.method)}</p>
                  </div>
                  <div className={styles.statusPills}>
                    <span className={`${styles.badge} ${review ? styles.badgeDeclined : order.payment_status === "paid" ? styles.badgeConfirmed : styles.badgePending}`}>Payment: {order.payment_status}</span>
                    <span className={styles.badge}>Fulfilment: {order.fulfillment_status}</span>
                  </div>
                </div>
                {review && <p className={orderStyles.reviewMessage}>Payment needs a manual check: the amount or currency did not match. Do not fulfil this order yet.</p>}
                <details className={orderStyles.details}>
                  <summary>View order details</summary>
                  <dl className={styles.detailGrid}>
                    <div><dt className={styles.detailLabel}>Customer</dt><dd className={styles.detailValue}>{order.customer_name}</dd></div>
                    <div><dt className={styles.detailLabel}>Email</dt><dd className={styles.detailValue}><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a></dd></div>
                    <div><dt className={styles.detailLabel}>Phone</dt><dd className={styles.detailValue}><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></dd></div>
                    <div><dt className={styles.detailLabel}>{order.delivery?.method === "pickup" ? "Pickup address" : "Delivery address"}</dt>
                      <dd className={styles.detailValue}>{order.delivery?.method === "pickup" ? PICKUP_ADDRESS : [order.delivery?.address, order.delivery?.city, order.delivery?.state].filter(Boolean).join(", ")}</dd></div>
                    <div><dt className={styles.detailLabel}>Paid at</dt><dd className={styles.detailValue}>{order.paid_at ? formatDateTime(order.paid_at) : "Not confirmed"}</dd></div>
                  </dl>
                  <div className={orderStyles.tableWrap}><table className={orderStyles.table}>
                    <caption>Order items</caption><thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Unit price</th><th scope="col">Amount</th></tr></thead>
                    <tbody>{(order.items || []).map((item, index) => <tr key={`${item.productId || "item"}-${index}`}><td>{item.name}</td><td>{item.quantity}</td><td>{money(item.unitAmountMinor)}</td><td>{money(item.lineAmountMinor)}</td></tr>)}</tbody>
                  </table></div>
                  <p>Subtotal: {money(order.subtotal_minor)} · Delivery / pickup: {money(order.shipping_minor)} · <strong>Total: {money(order.total_minor)}</strong></p>
                </details>
                <div className={styles.actions}>
                  {order.payment_status === "paid" ? nextStatuses.length ? nextStatuses.map((status) => <button type="button" key={status} className={`${styles.btn} ${styles.btnPrimary}`} disabled={Boolean(saving)} onClick={() => updateStatus(order, status)}>{saving === order.id ? "Saving…" : `Mark ${status}`}</button>) : <span className={styles.meta}>Fulfilment completed.</span> : <span className={styles.meta}>Fulfilment is locked until payment is confirmed.</span>}
                </div>
              </article>
            );
          })}
        </div>}
        <nav className={`${styles.actions} ${orderStyles.pagination}`} aria-label="Order pages">
          <button type="button" className={styles.btn} disabled={page <= 1 || Boolean(saving)} onClick={() => { setPage((value) => value - 1); setLoading(true); }}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className={styles.btn} disabled={page >= pages || Boolean(saving)} onClick={() => { setPage((value) => value + 1); setLoading(true); }}>Next</button>
        </nav>
      </>}
    </>
  );
}
```

### src/app/admin/orders/orders.module.css

```css
.filter { display: grid; gap: 6px; font-size: 0.88rem; font-weight: 600; }
.reference { overflow-wrap: anywhere; }
.review { border-color: #b66c26; border-left-width: 5px; background: #fff8eb; }
.reviewMessage { margin: 0; color: #85430d; font-weight: 600; }
.details { border-top: 1px solid var(--line); padding-top: 12px; }
.details summary { width: fit-content; cursor: pointer; font-weight: 600; padding: 4px 0; }
.details summary:focus-visible { outline: 2px solid var(--gold-deep); outline-offset: 4px; }
.details dl { margin: 18px 0; }
.tableWrap { overflow-x: auto; margin: 16px 0; }
.table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
.table caption { text-align: left; margin-bottom: 8px; font-weight: 600; }
.table th, .table td { padding: 10px; border-bottom: 1px solid var(--line); }
.table th { background: var(--paper); }
.table td:not(:first-child) { white-space: nowrap; }
.pagination { margin-top: 20px; }
```

### supabase/migrations/20261016122711_order_emails_admin_management.sql

```sql
BEGIN;

ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS emails_claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shop_orders.emails_claimed_at IS
  'Atomic claim made when payment first becomes paid. Records an email attempt, not confirmed delivery. Never clear to replay a webhook.';

ALTER TABLE public.shop_orders
  DROP CONSTRAINT IF EXISTS shop_orders_fulfillment_status_check;
ALTER TABLE public.shop_orders
  ADD CONSTRAINT shop_orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('new', 'processing', 'ready', 'shipped', 'completed'));

-- Orders are accessed through authenticated server routes using the service key.
-- Explicitly revoke the previous column-level UPDATE grant as well as table grants.
REVOKE ALL ON TABLE public.shop_orders FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (fulfillment_status) ON public.shop_orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read shop orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Admins can fulfil paid orders" ON public.shop_orders;

NOTIFY pgrst, 'reload schema';
COMMIT;
```

### scripts/order-management.test.mjs

```javascript
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import vm from "node:vm";
import { z } from "zod";
import * as bachs from "../src/lib/bachs.mjs";
import * as management from "../src/lib/orderManagement.mjs";
import { buildOrderEmails, sendOrderEmails } from "../src/lib/orderEmails.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const adminId = "22222222-2222-4222-8222-222222222222";
const secret = "webhook-unit-test-only";
const fixture = () => ({
  id, customer_name: "Test Customer", customer_email: "customer@example.invalid", customer_phone: "08012345678",
  delivery: { method: "outside_yenagoa", address: "Test street", city: "Test city", state: "Test state" },
  items: [{ productId: "dress", name: "Dress", quantity: 1, unitAmountMinor: 5000000, lineAmountMinor: 5000000 }],
  subtotal_minor: 5000000, shipping_minor: 200000, total_minor: 5200000, payment_status: "pending",
  fulfillment_status: "new", checkout_id: "chk_test", created_at: "2026-10-16T10:00:00Z", receipt_hash: "private",
});

function database(orders = [fixture()], profile = { id: adminId, is_admin: true, is_active: true }) {
  const updates = [];
  const reads = [];
  return {
    orders, updates, reads,
    auth: { getUser: async (token) => token === "valid" ? { data: { user: { id: adminId, user_metadata: { is_admin: true } } }, error: null } : { data: { user: null }, error: { message: "Invalid token" } } },
    from(table) {
      reads.push(table);
      const rows = table === "users" ? (profile ? [profile] : []) : orders;
      let patch;
      let columns = "*";
      let count = false;
      const filters = [];
      const sorts = [];
      const project = (row) => columns === "*" ? structuredClone(row) : Object.fromEntries(columns.split(",").map((key) => [key, structuredClone(row[key])]));
      const execute = (single, range) => {
        let matches = rows.filter((row) => filters.every((fn) => fn(row)));
        const total = matches.length;
        if (patch) { updates.push({ table, patch, affected: matches.length }); matches.forEach((row) => Object.assign(row, patch)); }
        matches = [...matches].sort((a, b) => {
          for (const [column, options] of sorts) {
            const value = String(a[column]).localeCompare(String(b[column]));
            if (value) return options.ascending ? value : -value;
          }
          return 0;
        });
        if (range) matches = matches.slice(range[0], range[1] + 1);
        return Promise.resolve({ data: single ? (matches[0] ? project(matches[0]) : null) : matches.map(project), error: null, count: count ? total : null });
      };
      const query = {
        select(value, options) { columns = value; count = Boolean(options?.count); return query; },
        update(value) { patch = value; return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        neq(key, value) { filters.push((row) => row[key] !== value); return query; },
        order(key, options) { sorts.push([key, options]); return query; },
        maybeSingle() { return execute(true); },
        range(start, end) { return execute(false, [start, end]); },
      };
      return query;
    },
  };
}

async function route(file, db, mailer = async () => {}) {
  const context = vm.createContext({ console: { error() {} }, process: { env: { BACHS_WEBHOOK_SECRET: secret } }, Date, URL, Response, AbortSignal });
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const routeModule = new vm.SourceTextModule(source, { context });
  const dependencies = {
    "next/server": { NextResponse: Response },
    "zod": { z },
    "@/lib/checkoutServer": { checkoutDatabase: () => db },
    "@/lib/bachs.mjs": bachs,
    "@/lib/orderEmails.mjs": { sendOrderEmails: mailer },
    "@/lib/orderManagement.mjs": management,
  };
  await routeModule.link((name) => {
    const values = dependencies[name];
    if (!values) throw new Error(`Unexpected route dependency ${name}`);
    return new vm.SyntheticModule(Object.keys(values), function () {
      Object.entries(values).forEach(([key, value]) => this.setExport(key, value));
    }, { context });
  });
  await routeModule.evaluate();
  return routeModule.namespace;
}

function webhook(data = {}) {
  const body = JSON.stringify({ id: "evt_test", type: "collection.succeeded", data: { charge_id: "ch_test", checkout_id: "chk_test", reference: id, status: "SUCCEEDED", currency: "NGN", amount: "52000.00", ...data } });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return new Request("https://elegantstyle.com.ng/api/bachs/webhook", { method: "POST", body, headers: { "x-bachs-signature-v2": `t=${timestamp},v1=${signature}` } });
}
const adminRequest = (method = "GET", payload, token = "valid", query = "") => new Request(`https://elegantstyle.com.ng/api/admin/orders${query}`, {
  method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
  ...(payload ? { body: JSON.stringify(payload) } : {}),
});

test("concurrent and repeated paid webhooks claim one email attempt", async () => {
  const db = database();
  const sent = [];
  const { POST } = await route("src/app/api/bachs/webhook/route.js", db, async (order) => sent.push(order));
  const responses = await Promise.all([POST(webhook()), POST(webhook())]);
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(sent.length, 1);
  assert.equal(db.orders[0].payment_status, "paid");
  assert.equal(db.orders[0].paid_at, db.orders[0].emails_claimed_at);
  assert.equal((await POST(webhook())).status, 200);
  assert.equal(sent.length, 1);
});

test("email failure preserves payment and returns 200 without retrying mail", async () => {
  const db = database();
  let attempts = 0;
  const { POST } = await route("src/app/api/bachs/webhook/route.js", db, async () => { attempts++; throw new Error("Resend unavailable"); });
  assert.equal((await POST(webhook())).status, 200);
  assert.equal(db.orders[0].payment_status, "paid");
  assert.ok(db.orders[0].emails_claimed_at);
  assert.equal((await POST(webhook())).status, 200);
  assert.equal(attempts, 1);
});

test("amount mismatch stays review and never claims or sends emails", async () => {
  const db = database();
  let attempts = 0;
  const { POST } = await route("src/app/api/bachs/webhook/route.js", db, async () => attempts++);
  assert.equal((await POST(webhook({ amount: "1.00" }))).status, 200);
  assert.equal(db.orders[0].payment_status, "review");
  assert.equal(db.orders[0].emails_claimed_at, undefined);
  assert.equal(attempts, 0);
});

test("email HTML escapes customer fields and includes naira amounts and pickup", () => {
  const order = fixture();
  const malicious = '<img src=x onerror="alert(1)"> & \' test';
  order.customer_name = order.customer_email = order.customer_phone = malicious;
  order.delivery.address = malicious;
  order.items[0].name = malicious;
  const messages = buildOrderEmails(order, "shop@example.invalid");
  for (const message of messages) {
    assert.ok(!message.html.includes(malicious));
    assert.ok(message.html.includes("&lt;img"));
    assert.ok(message.html.includes("₦52,000.00"));
    assert.ok(message.html.includes("#C9A962") && message.html.includes("#F7F2E9"));
  }
  order.delivery.method = "pickup";
  assert.ok(buildOrderEmails(order, "shop@example.invalid")[0].text.includes("Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State"));
});

test("both emails are attempted independently with recipient fallback and stable keys", async () => {
  const calls = [];
  const logs = [];
  const options = {
    env: { RESEND_API_KEY: "fake", RESEND_FROM_EMAIL: "Elegant Styles <requests@elegantstyle.com.ng>", BESPOKE_NOTIFY_EMAIL: "fallback@example.invalid", ORDER_NOTIFY_EMAIL: " " },
    fetchImpl: async (url, init) => { calls.push({ url, ...init, body: JSON.parse(init.body) }); return new Response(null, { status: calls.length === 1 ? 503 : 200 }); },
    logger: { info() {}, error: (...args) => logs.push(args) },
  };
  await sendOrderEmails(fixture(), options);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.to[0], "customer@example.invalid");
  assert.equal(calls[1].body.to[0], "fallback@example.invalid");
  assert.equal(calls[0].headers["Idempotency-Key"], `paid-order/${id}/customer`);
  assert.equal(calls[1].headers["Idempotency-Key"], `paid-order/${id}/shop`);
  assert.equal(logs.length, 1);
  calls.length = 0;
  await sendOrderEmails(fixture(), { ...options, env: { ...options.env, ORDER_NOTIFY_EMAIL: "orders@example.invalid" } });
  assert.equal(calls[1].body.to[0], "orders@example.invalid");
});

test("missing email configuration is logged and never calls Resend", async () => {
  const logs = [];
  await sendOrderEmails(fixture(), {
    env: {},
    fetchImpl: async () => { throw new Error("Resend should not be called"); },
    logger: { info() {}, error: (...args) => logs.push(args) },
  });
  assert.equal(logs.length, 2);
});

test("missing, forged, non-admin and inactive-admin credentials are denied", async () => {
  for (const [token, profile, status] of [
    [null, { id: adminId, is_admin: true, is_active: true }, 401],
    ["forged", { id: adminId, is_admin: true, is_active: true }, 401],
    ["valid", { id: adminId, is_admin: false, is_active: true }, 403],
    ["valid", { id: adminId, is_admin: true, is_active: false }, 403],
    ["valid", null, 403],
  ]) {
    const db = database([], profile);
    const { GET, PATCH } = await route("src/app/api/admin/orders/route.js", db);
    assert.equal((await GET(adminRequest("GET", undefined, token))).status, status);
    assert.equal((await PATCH(adminRequest("PATCH", { id }, token))).status, status);
    assert.ok(!db.reads.includes("shop_orders"));
  }
});

test("order listing filters, sorts newest first, and omits private receipt data", async () => {
  const db = database([
    { ...fixture(), payment_status: "paid", created_at: "2026-10-15T10:00:00Z" },
    { ...fixture(), id: "33333333-3333-4333-8333-333333333333", payment_status: "paid", created_at: "2026-10-16T10:00:00Z" },
    { ...fixture(), id: "44444444-4444-4444-8444-444444444444", payment_status: "review" },
  ]);
  const { GET } = await route("src/app/api/admin/orders/route.js", db);
  const response = await GET(adminRequest("GET", undefined, "valid", "?payment=paid&fulfillment=new&page=1"));
  const result = await response.json();
  assert.equal(result.total, 2);
  assert.equal(result.orders[0].id, "33333333-3333-4333-8333-333333333333");
  assert.equal(result.orders[0].receipt_hash, undefined);
  assert.equal((await GET(adminRequest("GET", undefined, "valid", "?payment=bogus"))).status, 400);
});

test("fulfilment updates reject payment/amount writes, unpaid orders and stale status", async () => {
  const db = database([{ ...fixture(), payment_status: "paid" }]);
  const { PATCH } = await route("src/app/api/admin/orders/route.js", db);
  const update = { id, expected_status: "new", fulfillment_status: "processing" };
  for (const extra of [{ payment_status: "paid" }, { total_minor: 1 }, { shipping_minor: 0 }, { is_admin: true }]) {
    assert.equal((await PATCH(adminRequest("PATCH", { ...update, ...extra }))).status, 400);
  }
  assert.equal((await PATCH(adminRequest("PATCH", update))).status, 200);
  assert.deepEqual(Object.keys(db.updates[0].patch), ["fulfillment_status"]);
  assert.equal(db.orders[0].total_minor, 5200000);
  assert.equal((await PATCH(adminRequest("PATCH", update))).status, 409);
  db.orders[0].payment_status = "review";
  assert.equal((await PATCH(adminRequest("PATCH", { ...update, expected_status: "processing", fulfillment_status: "shipped" }))).status, 409);
});

test("delivery and pickup use forward-only fulfilment transitions", () => {
  assert.deepEqual(management.nextFulfillmentStatuses("new", "pickup"), ["processing"]);
  assert.deepEqual(management.nextFulfillmentStatuses("processing", "pickup"), ["ready"]);
  assert.deepEqual(management.nextFulfillmentStatuses("ready", "pickup"), ["completed"]);
  assert.deepEqual(management.nextFulfillmentStatuses("ready", "outside_yenagoa"), ["shipped"]);
  assert.deepEqual(management.nextFulfillmentStatuses("shipped", "outside_yenagoa"), ["completed"]);
  assert.deepEqual(management.nextFulfillmentStatuses("completed", "pickup"), []);
});

test("concurrent admin updates cannot both consume the same status", async () => {
  const db = database([{ ...fixture(), payment_status: "paid" }]);
  const { PATCH } = await route("src/app/api/admin/orders/route.js", db);
  const payload = { id, expected_status: "new", fulfillment_status: "processing" };
  const responses = await Promise.all([PATCH(adminRequest("PATCH", payload)), PATCH(adminRequest("PATCH", payload))]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  assert.equal(db.orders[0].fulfillment_status, "processing");
});
```


## Supabase application verification — 16 October 2026

- Applied migration order_emails_admin_management, version 20261016122711, to project yrzvqvdrahfmmoprgukd (Elegant Style Fashion).
- Verified emails_claimed_at is a nullable timestamp with time zone.
- Verified fulfilment constraint includes new, processing, ready, shipped and completed.
- Verified RLS remains enabled; anon and authenticated cannot SELECT orders; authenticated cannot UPDATE fulfillment_status; service_role retains SELECT, INSERT and UPDATE.
- Verified the existing order count remains one. The migration contains no order-row updates.
- Security advisor reports the expected informational [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) notice for this server-only table. Browser grants have been revoked and the service role remains authorized.
- Separate existing advisor findings remain unchanged: [mutable function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [anonymous SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [leaked password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These require a separate review; they were not changed by this migration.
- Application code has not been deployed in this step. Resend environment configuration and deployment remain necessary before the new email and orders features are live.
