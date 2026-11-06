# State-machine recovery fixes

The SQL migration was applied to Supabase project `yrzvqvdrahfmmoprgukd` on 6 November 2026 at the owner's request. Application changes remain local; no application deployment was performed. Verified the active five-minute expiry job, 30-minute default, release and email-claim functions, RLS and bespoke status permissions. The initial cleanup released zero holds because there were no held reservations.

## Apply together

The application code requires `supabase/migrations/20261106171124_state_machine_recovery_guards.sql`. Test it on a development database/branch before production. During your deployment, stop new checkout/admin writes, apply the migration, deploy the matching application revision, verify the flows, then reopen writes. Old bespoke browser clients will no longer be able to update statuses directly; reload them after deployment.

The migration backfills reservation deadlines as original creation time plus 30 minutes. Existing old unpaid holds will consequently be eligible for cleanup. Paid/sold stock is preserved. Existing paid orders are **not** automatically emailed again: their historical `emails_claimed_at` cannot prove delivery or failure.

## 1. Stock expiry

- Reservations have `expires_at`; orders have `reservation_expires_at`, both defaulting to 30 minutes from insertion.
- `release_expired_stock_reservations(p_order_id uuid DEFAULT NULL, p_limit integer DEFAULT 100)` releases expired held reservations. It changes their status to `released`, bumps stock revisions and expires the checkout. It does not increment physical stock: holds already reduce the computed purchasable quantity, not the quantity physically stored.
- The function is service-only. An index-backed pg_cron job runs every five minutes when pg_cron is installed at migration time. New checkout attempts also perform bounded cleanup. If you enable pg_cron later, explicitly register the job using the command below, or schedule the routine in your own maintenance system. The function and checkout-triggered cleanup still work without the scheduler.
- Order/stock locks serialize expiry and payment finalization. Payment processing cannot commit released or expired stock, and repeated successful updates cannot deduct stock twice.
- New Bachs sessions use `expires_in_minutes`, rounded down to the remaining reservation lifetime. Expired checkout attempts and status responses do not return a resumable payment URL. The client resets its attempt ID on expiry.
- A successful collection arriving after expiry is recorded as `payment_status='review'`, `payment_review_reason='reservation_expired'`. It does not decrement stock, mark reservations sold, send a payment-success notification or authorize fulfilment. The admin order screen explains the review reason.

**Provider limitation:** a local application cannot guarantee that an already-started external payment will never settle after expiry. Do not describe an expired checkout as proof no money moved. An administrator must verify any such collection with Bachs and arrange a refund or a separately verified new allocation. No automatic refund or late-payment reallocation is implemented here.

If pg_cron was absent during migration, register it after enabling the extension:

```sql
SELECT cron.schedule('elegant-expired-stock-reservations', '*/5 * * * *',
  'SELECT public.release_expired_stock_reservations();');
```

## 2. Paid-order notification outcomes and retry

`order_email_deliveries` is a private audit table with one immutable recipient/message per notification key. It is not the removed vendor polling queue and has no scheduled email worker. Customer, administrator and vendor purchase messages use the same tracked sender.

Each record has `pending`, `sending`, `sent` or `failed` status, attempts, a two-minute sending lease, timestamps and an error summary. `claim_order_email` serializes claims. A successful record is skipped permanently. A crashed sender can be retried after its lease expires; its saved recipient, content and provider idempotency key are reused. A compare-and-set completion write uses the lease token.

`shop_orders.email_status` summarizes each tracked purchase notification batch. `email_tracking_started_at` identifies new tracked paid orders separately from historical claims. A duplicate verified payment webhook may retry incomplete notifications. A provider failure does not undo payment. A database failure recording the outcome is surfaced for webhook retry.

Administrators can use **Retry payment emails** on the Shop orders screen. The server endpoint is `POST /api/admin/order-emails` with `{ "orderId": "uuid" }`; it verifies a live active admin session, same origin and a tracked paid order before retrying. It cannot change payment, stock, recipient or message content.

Resend keeps idempotency records for 24 hours. This implementation blocks ambiguous retries after 23 hours or ten application-level attempts. A blocked attempt becomes failed with an explicit reconciliation note. Inspect the provider log before changing that record: if accepted, record the successful outcome; if definitively never accepted, an administrator can authorize a new operation after investigating. Do not simply delete delivery records or rotate keys to bypass ambiguity. `sent` means the provider accepted the request, not that the recipient read it or that no later bounce occurred.

Scope: this adds durable outcomes/recovery to **paid-order purchase notifications**. Other email workflows, such as student acceptance and fulfilment notices, retain their existing send mechanisms.

## 3. Auth hydration

`AuthContext` associates every hydration with an identity and monotonically increasing request generation. Initial session lookup, auth events, explicit logout, identity changes and unmount invalidate stale generations. A profile is applied only when its ID matches the request, the generation remains current and a fresh SDK session read still reports that identity. New identities clear previous profile/admin permissions while hydrating. Async auth work is deferred outside the Supabase auth callback to avoid auth-lock deadlocks.

## 4. Bespoke review

The transition map in `src/lib/bespokeWorkflow.mjs` is:

```text
new -> contacted -> quoted -> confirmed -> completed
 |         |          |          |
 +---------+----------+----------+--> cancelled
```

Completed and cancelled are terminal. Earlier states can be cancelled, but cannot skip forward or move backward. The UI offers only allowed transitions. `PATCH /api/admin/bespoke` requires `{id, expectedStatus, status}`, checks admin identity and origin, validates the transition, and updates with `WHERE id = id AND status = expectedStatus`. A stale/missing row returns 409. A database trigger also enforces the transition map, and browser roles lose direct UPDATE privilege so they cannot bypass the API's expected-status requirement.

## Verification

```powershell
node --test scripts/state-machine-recovery.test.mjs
node --experimental-vm-modules --test scripts/order-management.test.mjs scripts/checkout.test.mjs scripts/vendor-direct-emails.test.mjs scripts/vendor-settlement.test.mjs
npm run build
```

The new tests execute the actual migration in isolated in-memory Postgres via the development-only PGlite package. They do not touch the remote database, send real emails or create Bachs charges. pg_cron's scheduler itself requires verification on a development Supabase instance; the cleanup function is covered locally. No live payment-provider or mailbox delivery was tested.

References: [Bachs checkout sessions](https://docs.bachs.io/guides/checkout/checkout-sessions), [Bachs Node SDK](https://github.com/bachsdev/bachs-node), [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
