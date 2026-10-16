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
    env: { RESEND_API_KEY: "fake", RESEND_FROM_EMAIL: "Elegant Style <requests@elegantstyle.com.ng>", BESPOKE_NOTIFY_EMAIL: "fallback@example.invalid", ORDER_NOTIFY_EMAIL: " " },
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
