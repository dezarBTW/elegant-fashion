import test from "node:test";
import assert from "node:assert/strict";
import { ACADEMY_ADDRESS, REGISTRATION_COMPLETE_MESSAGE, registrationSchema, studentReviewSchema } from "../src/lib/registration.mjs";
import { accountActionSchema, requestSchema, requestReviewSchema, repurchaseCart } from "../src/lib/accountContracts.mjs";
import { notifyRegistration, registrationAdminEmail, registrationAcceptanceEmail } from "../src/lib/registrationEmails.mjs";
import { notifySupportRequest, supportEmail } from "../src/lib/supportEmails.mjs";
import { sendServiceEmail } from "../src/lib/orderEmails.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const application = {
  surname: "Applicant", first_name: "Ada", middle_name: "", gender: "Female", date_of_birth: "2000-01-01", age: "26",
  nationality: "Nigerian", marital_status: "Single", state_of_origin: "Bayelsa", address: "Test address", telephone: "08000000000",
  email: "ADA@example.com", chosen_programme: "3 Months Programme", passport_photo: "https://example.invalid/passport.jpg",
  sponsorship: "Self sponsored", sponsor_organization: "", agreed: true,
};
const request = { id, kind: "refund", orderId: id, productId: id, description: "The seam has come undone." };

test("registration requires a valid sponsorship and scholarship organization", () => {
  assert.equal(registrationSchema.safeParse({ ...application, sponsorship: undefined }).success, false);
  assert.equal(registrationSchema.safeParse({ ...application, sponsorship: "Other" }).success, false);
  assert.equal(registrationSchema.safeParse({ ...application, sponsorship: "Scholarship", sponsor_organization: " " }).success, false);
  const scholarship = registrationSchema.parse({ ...application, sponsorship: "Scholarship", sponsor_organization: " Training Trust " });
  assert.equal(scholarship.sponsor_organization, "Training Trust");
  assert.equal(scholarship.email, "ada@example.com");
  assert.equal(scholarship.age, 26);
  for (const sponsorship of ["Self sponsored", "Guardian"]) {
    assert.equal(registrationSchema.parse({ ...application, sponsorship, sponsor_organization: "Stale hidden field" }).sponsor_organization, null);
  }
});

test("registration rejects invalid programme, declaration, dates, and injected server fields", () => {
  for (const invalid of [{ chosen_programme: "Free course" }, { agreed: false }, { date_of_birth: "2999-01-01" }, { date_of_birth: "2000-02-31" }, { status: "accepted" }, { user_id: id }, { email: "invalid" }, { telephone: "not-a-phone" }]) {
    assert.equal(registrationSchema.safeParse({ ...application, ...invalid }).success, false, JSON.stringify(invalid));
  }
  assert.equal(studentReviewSchema.parse({ id: 1, status: "accepted" }).id, "1");
  assert.equal(studentReviewSchema.parse({ id: "9223372036854775807", status: "accepted" }).id, "9223372036854775807");
  for (const invalidId of [id, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "9223372036854775808"]) {
    assert.equal(studentReviewSchema.safeParse({ id: invalidId, status: "accepted" }).success, false);
  }
  assert.equal(studentReviewSchema.safeParse({ id: 1, status: "admin" }).success, false);
});

test("the registration completion text retains the exact requested wording and line break", () => {
  assert.equal(ACADEMY_ADDRESS, "Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State");
  assert.equal(REGISTRATION_COMPLETE_MESSAGE, `Registration completed visit ${ACADEMY_ADDRESS} from Mon-Fri, 8am-5pm, for PAYMENT DETAILS, ORIENTAION and PHYSICAL VERIFICATION\nThank You for choosing Elegant Style Fashion Academy`);
});

test("registration and support alerts use only the designated admin while customer mail keeps its recipient", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.RESEND_API_KEY;
  const previousSender = process.env.RESEND_FROM_EMAIL;
  const calls = [];
  try {
    process.env.RESEND_API_KEY = "unit-test-only";
    process.env.RESEND_FROM_EMAIL = "test@example.invalid";
    globalThis.fetch = async (url, options) => { calls.push(JSON.parse(options.body)); return { ok: true }; };
    await notifyRegistration({ ...application, id: 1 });
    await notifySupportRequest({ id, order_id: id, product_name: "Dress", description: request.description, status: "pending" }, "refund", "customer@example.invalid");
    assert.deepEqual(calls.map((message) => message.to[0]), ["elegantyoufashion18@gmail.com", "customer@example.invalid", "elegantyoufashion18@gmail.com"]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousSender === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = previousSender;
  }
});

test("support requests validate ownership references, lengths, and receipt confirmation", () => {
  assert.equal(requestSchema.safeParse(request).success, true);
  assert.equal(requestSchema.safeParse({ ...request, kind: "complaint" }).success, false);
  assert.equal(requestSchema.safeParse({ ...request, kind: "complaint", received: true }).success, true);
  for (const invalid of [{ description: "Short" }, { description: "a".repeat(2001) }, { status: "approved" }, { user_id: id }, { productId: "invalid" }]) {
    assert.equal(requestSchema.safeParse({ ...request, ...invalid }).success, false);
  }
});

test("request review only accepts forward status changes", () => {
  for (const [kind, expectedStatus, status] of [["refund", "pending", "approved"], ["refund", "pending", "rejected"], ["complaint", "pending", "in_review"], ["complaint", "in_review", "resolved"]]) {
    assert.equal(requestReviewSchema.safeParse({ id, kind, expectedStatus, status }).success, true);
  }
  for (const [kind, expectedStatus, status] of [["refund", "approved", "pending"], ["refund", "pending", "resolved"], ["complaint", "resolved", "in_review"], ["complaint", "in_review", "pending"]]) {
    assert.equal(requestReviewSchema.safeParse({ id, kind, expectedStatus, status }).success, false);
  }
});

test("account changes require password confirmation and enforce password bounds", () => {
  assert.equal(accountActionSchema.safeParse({ action: "deactivate", currentPassword: "current", confirmed: true }).success, true);
  assert.equal(accountActionSchema.safeParse({ action: "deactivate", currentPassword: "current", confirmed: false }).success, false);
  assert.equal(accountActionSchema.safeParse({ action: "password", currentPassword: "current", newPassword: "short" }).success, false);
  assert.equal(accountActionSchema.safeParse({ action: "password", currentPassword: "current", newPassword: "long-password" }).success, true);
});

test("repurchase adds one item without changing existing cart or exceeding checkout limits", () => {
  const cart = [{ id, name: "Existing dress" }];
  assert.deepEqual(repurchaseCart(cart, id), [{ id, quantity: 2 }]);
  assert.deepEqual(repurchaseCart([{ id, quantity: 5 }], id), [{ id, quantity: 6 }]);
  assert.equal(cart.length, 1);
  assert.throws(() => repurchaseCart(Array.from({ length: 10 }, () => ({ id })), id), /10/);
  assert.throws(() => repurchaseCart([{ id, quantity: 10 }], id), /10/);
  assert.throws(() => repurchaseCart(Array.from({ length: 20 }, (_, i) => ({ id: String(i) })), id), /20/);
});

test("registration emails include student details and escape user-controlled HTML", () => {
  const student = { ...registrationSchema.parse(application), id, surname: '<img src=x onerror="alert(1)">', sponsorship: "Scholarship", sponsor_organization: "Trust <script>bad()</script>" };
  const admin = registrationAdminEmail(student, "admin@example.com");
  const accepted = registrationAcceptanceEmail(student);
  for (const message of [admin, accepted]) {
    assert.ok(message.html.includes("&lt;"));
    assert.ok(!message.html.includes("<script>"));
    assert.ok(!message.html.includes("<img src=x"));
    assert.ok(message.text.includes(REGISTRATION_COMPLETE_MESSAGE));
    assert.ok(message.idempotencyKey.includes(id));
  }
  for (const value of [student.email, student.telephone, student.date_of_birth, student.address, student.chosen_programme, student.sponsorship, student.sponsor_organization]) assert.ok(admin.text.includes(String(value)));
});

test("support email references, reason, and shop response are escaped and idempotent", () => {
  const row = { id, order_id: id, product_name: "Dress <b>test</b>", description: "<script>request</script>", status: "approved", response: '<a href="bad">response</a>' };
  const email = supportEmail(row, "refund", "customer@example.com", "customer", true);
  assert.ok(!email.html.includes("<script>"));
  assert.ok(email.html.includes("&lt;script&gt;"));
  assert.ok(email.text.includes("does not itself transfer funds"));
  assert.equal(email.idempotencyKey, `support/refund/${id}/approved/customer`);
});

test("service mail uses server configuration, idempotency, and a sanitized subject", async () => {
  let called;
  assert.equal(await sendServiceEmail({ to: "student@example.com", subject: "Hello\r\nInjected", text: "Body", html: "<p>Body</p>", idempotencyKey: "test/key" }, {
    env: { RESEND_API_KEY: "test-only", RESEND_FROM_EMAIL: "Elegant Style <test@example.com>" },
    fetchImpl: async (url, options) => { called = { url, options }; return { ok: true }; },
  }), true);
  assert.equal(called.url, "https://api.resend.com/emails");
  assert.equal(called.options.headers["Idempotency-Key"], "test/key");
  assert.equal(JSON.parse(called.options.body).subject, "Hello  Injected");
  assert.deepEqual(JSON.parse(called.options.body).to, ["student@example.com"]);
});

test("email configuration, provider failures, and network failures are logged without throwing", async () => {
  const errors = [];
  const message = { to: "student@example.com", subject: "Hello", html: "<p>Body</p>", idempotencyKey: "test/failure" };
  const logger = { error: (...parts) => errors.push(parts) };
  assert.equal(await sendServiceEmail(message, { env: {}, logger }), false);
  const env = { RESEND_API_KEY: "test-only", RESEND_FROM_EMAIL: "test@example.com" };
  assert.equal(await sendServiceEmail(message, { env, logger, fetchImpl: async () => ({ ok: false, status: 503 }) }), false);
  assert.equal(await sendServiceEmail(message, { env, logger, fetchImpl: async () => { throw new Error("Network unavailable"); } }), false);
  assert.equal(errors.length, 3);
});
