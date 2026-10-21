# Security and purchase testing — 21 October 2026

## Scope and test environment

Reviewed the application routes, authentication, checkout, payment webhook, storage access, database grants/functions, and all 20 public tables' RLS configuration. Ran adversarial database tests using a schema-only snapshot of the live database in isolated PostgreSQL (PGlite). No production customer records were copied.

The hosted staging/load test could not be performed: Supabase branching returned `PaymentRequiredException` because the project is on the Free plan. Vercel's [load testing policy](https://vercel.com/kb/guide/what-s-vercel-s-policy-regarding-load-testing-deployments) restricts load testing to Enterprise or prior approval. No subscription was upgraded and no load test was sent to production or a Vercel preview.

The alternative harness runs the **actual checkout and payment-webhook handler source** behind a local Node HTTP server with an isolated PostgreSQL database. Authentication identities, payment-session responses, and email delivery are simulated. It exercises application logic and database writes, but excludes Next.js request dispatch, hosted Supabase Auth/PostgREST/network latency, Vercel scaling/firewall/cold starts, actual payment-provider capacity, and email-provider limits. Results are **not a claim that the live shop supports 1,000 simultaneous purchases**.

## Findings and changes

| Finding | Evidence | Remediation |
| --- | --- | --- |
| Public passport photos | Live bucket configuration was public; anonymous reads of another student's object were reproduced against the copied policies. | Make `student-passports` private, remove the public read policy, and show owner/admin-authorized signed images expiring after five minutes. Preserve existing application references. |
| Email enumeration | Anonymous `check_email_exists` returned whether a supplied email was registered in the isolated database. | Remove the signup availability checks and revoke browser access to the function. Signup uses Supabase Auth directly. |
| Revoked-session token replay | Supabase JWT validity alone does not guarantee the session still exists after logout. | Sensitive customer/admin APIs verify the signed user, then check the session ID and owner in `auth.sessions` through a service-only RPC. Missing/revoked sessions return 401; lookup failures return 503. |
| Logout during payment setup | A pending browser request could otherwise finish after leaving checkout. | Abort checkout requests on logout/account change/unmount and ignore aborted responses. Browser verification confirmed no late payment redirect. A server operation already accepted before logout may still finish; logout cannot undo an already initiated payment. |
| Upload rate-limit bypass | Legacy image-upload request format skipped the rate limiter; an RPC error also allowed uploads. | Both request formats use the shared limiter; limiter failures fail closed with 503. Invalid origin/JSON/oversized payloads receive explicit responses. |
| Excess database privileges | `authenticated` had TRUNCATE on bespoke requests, which bypasses row policies when accessed through SQL. | Revoke TRUNCATE/REFERENCES/TRIGGER from browser roles and unnecessary anonymous profile writes. TRUNCATE was reproduced only in isolated SQL; it was not attempted against production and is not a normal PostgREST operation. |
| Inactive administrator helper | Legacy admin helpers checked the admin flag without checking account activity. | Require both `is_admin` and `is_active`; use the same helper for the products admin policy. |
| Mutable privileged trigger function | `handle_updated_at` was SECURITY DEFINER with no fixed search path. | Use SECURITY INVOKER with an empty search path; revoke direct browser execution. |
| Concurrent checkout collision | A unique-key collision could become a generic service error. | Return a clear 409 for an already-processing attempt. Replays do not create another payment session. |
| Invalid search/stock input | Malformed pagination, price filters and variant IDs could reach the database. | Return 400 for invalid input; search requests now request an accurate result count. |
| Vulnerable dependencies | Initial dependency audit: 17 findings, including one critical and 13 high. | Upgrade Next.js and its lint configuration from 16.2.1 to 16.4.2 and apply compatible dependency fixes. Production dependency audit: **zero known findings**. Five high findings remain in the development-only `braces → micromatch → fast-glob → Next ESLint` chain; the suggested forced fix downgrades the lint framework incompatibly and was not applied. |
| Image regression after framework upgrade | Encoded parentheses in local image paths returned 404 in the updated server. | Pass decoded local filenames to the image optimizer for shop/cart/detail images and update fixed hero/auth image paths. |

## Verification

- **79 automated tests passed**, including the formerly optional isolated database suite; no skipped tests.
- **40 additional database audit checks passed**, including before-fix reproductions and after-fix denials.
- The database tests include anonymous and authenticated roles, account ownership, attempted admin promotion, private storage, protected RPCs, revoked sessions, and forbidden table privileges. Existing registration tests additionally seed multiple users and orders to check access across owners. Empty-table checks alone are not treated as proof of complete tenant isolation.
- Browser tests confirmed guest checkout redirects to sign-in, the cart survives login, logout at checkout prevents purchase, anonymous checkout API requests return JSON errors with 401, and logout during a delayed payment setup does not redirect to payment or crash.
- Payment tests cover invalid/stale signatures, amount mismatches, repeated notifications, and one-time receipt confirmation. External payments and email delivery were simulated; no real purchases, charges, or purchase emails were created.
- Production build and lint checks are required before release. The database migration and live deployment verification are recorded below when released.

## Recorded negative checkout responses

All tested rejected checkout requests returned a JSON `error` message. Expected examples:

| Scenario | HTTP status |
| --- | --- |
| Missing, forged or logged-out token | 401 |
| Another account tries to reuse an order; wrong origin | 403 |
| Malformed JSON; missing/unavailable size; quantity outside 1–10; injected price; invalid/unknown product | 400 |
| Oversized request | 413 |
| Concurrent already-processing checkout | 409 |
| More than 12 checkout attempts per IP per hour | 429 |
| Session database/rate limiter unavailable; payment setup timeout | 503 |
| Payment provider rejects setup | 502 |

An RLS-protected read may correctly return an empty result instead of an error. Hiding other users' rows this way is expected PostgreSQL behaviour. Unsupported methods and missing pages likewise use their appropriate HTTP responses.

## Local load results

All virtual users begin checkout together. The local HTTP client is capped at **100 active TCP connections**, so this is not 1,000 simultaneous network connections. Each user buys the same product in size M, quantity one, at a server-calculated ₦18,000. Each order then receives two signed copies of its simulated payment notification.

| Virtual users | Checkout successes | Checkout elapsed | Median | 95th percentile | Throughput | Paid orders | Duplicate notifications / failures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | 50 / 50 | 1.98 s | 1.95 s | 1.96 s | 25.3/s | 50 | 100 / 0 |
| 200 | 200 / 200 | 2.91 s | 2.88 s | 2.89 s | 68.6/s | 200 | 400 / 0 |
| 1,000 | 1,000 / 1,000 | 10.92 s | 7.38 s | 10.84 s | 91.6/s | 1,000 | 2,000 / 0 |

The 1,000-user phase produced exactly **1,000 orders, 1,000 simulated payment sessions, and 1,000 email batches**, with correct totals. All 2,000 webhook requests returned 200 and replayed events did not duplicate email batches. Webhook processing took another 6.95 seconds. These measurements are from one laptop and one local run, not a capacity guarantee or statistical service-level benchmark.

An earlier unbounded client run encountered connection failures while submitting webhook bursts. Bounding TCP connections eliminated those harness failures. Those failed runs were not counted as successful tests. Separate tests sent ten identical checkout attempts together and observed only one order/payment session. A shared-IP test allowed 12 requests and returned 429 for the next three, as configured.

## Limits requiring attention before a high-traffic launch

1. **Finite stock is not enforced by the current checkout.** Checkout validates product activity and available sizes; it does not reserve/decrement a finite per-size stock count. This test cannot establish protection against overselling the last item. That needs an inventory-reservation feature and concurrency tests for the last unit.
2. **The 12-attempt hourly IP limit can affect a shared network.** A school, office or carrier network may share an IP. No limit was silently raised during testing.
3. **Live cloud capacity remains unmeasured.** A comparable hosted isolated database and a permitted cloud load test are required to measure production-like throughput and provider limits.
4. **Security testing has a defined scope.** This is not certification that every possible attack has been excluded. Hosted real-account cross-user requests and real payment-provider behaviour were not load tested.

## Reproducing the isolated checks

Use Node 24. Create `output/`, then install the test-only engine without changing app dependencies:

```powershell
npm install --prefix output/security-runtime --no-audit --no-fund @electric-sql/pglite@0.3.14
$env:PGLITE_MODULE_PATH=(Resolve-Path output/security-runtime/node_modules/@electric-sql/pglite/dist/index.js).Path
node --experimental-vm-modules --test scripts/*.test.mjs
node scripts/security-database-audit.mjs
node --experimental-vm-modules scripts/security-load.mjs
```

`scripts/fixtures/security-schema-before.json` contains schema metadata only. The load script binds only to loopback and uses an outbound-fetch stub; its simulated payment requests never reach Bachs. Raw results are written under ignored `output/`.
