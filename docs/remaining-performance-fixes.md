# Remaining performance fixes

- Student applications are filtered and paginated in PostgreSQL, 25 rows per page.
  Bespoke requests use 15 rows per page. Stable date/ID ordering prevents tied-date
  duplicates; empty or deleted last pages clamp to the last valid page. Counts
  cover the full list, not only the visible page. Both RPCs require active admins,
  use SECURITY INVOKER and preserve existing RLS.
- Bespoke reference links are signed only for the visible page, in one batch.
  Submission verifies at most four object names concurrently, retaining exact
  matches and failing closed on missing objects or Storage errors. Notification
  links use one batch signing call before preparing image attachments.
- Stock observers share one timer and one in-flight job per product. Overlapping
  cart/checkout/detail sets are combined in batches of at most 50 IDs. Background
  polling pauses while hidden; focus/visibility events coalesce. Explicit purchase
  checks still fetch current limits; failed requests discard cached availability.
  SQL aggregates held reservations once per requested batch instead of per size.
  Atomic reservation and paid-order stock deduction triggers are unchanged.
- Recommendations rank the full matching category in PostgreSQL and return at most
  six card projections. Ranking keeps distinct-word overlap, price proximity and
  the featured bonus. Inactive/current products and products without approved
  sizes are excluded. Category normalization has a matching partial index.
- Order/refund sections link historical guest orders through an authenticated POST
  before reading order data. The server verifies identity with Auth and checks the
  live session; the service-only RPC records a one-time account/email marker and
  updates only unassigned orders. It does not read the protected Auth tables.
  Order-history GETs and refund/complaint submissions no longer perform claims.
  Linking failures stay inside the order section, with navigation and profile
  settings available. The profile does not require linking. Email changes can
  link a newly verified email once as well.
- Dashboard metrics use one authorized RPC and one aggregate scan per source table,
  replacing five count requests. Four missing complaint/refund foreign-key indexes
  are added. Product listing indexes were already addressed in the previous fix.

## Verification and limits

Isolated database fixtures exceed 1,000 student and bespoke records, cover page
boundaries and filters, compare recommendation ordering with the original scoring
function, enforce private RPC permissions and check repeated/forged account links.
Unit and route tests cover shared polling, hidden tabs, failures, image verification,
batched email signing, read-only history and origin/authentication rejection.

Browser checks use intercepted fixtures: 25/15 rows, filter reset, photo batches,
last-page deletion, account linking before read-only history, desktop/mobile
overflow and a single shared poll across checkout and an open cart. Hidden-tab
suspension is verified through visibility events. No real products, orders,
student applications, bespoke requests, payments or emails are created by tests.

Exact list totals and substring searches still scale with matching records. Ranking
still examines category candidates, although only six projections leave the database.
Unused-index notices are retained until real traffic establishes whether an index
is useful; low usage alone is not evidence that a protective index should be removed.

Final checks: 115 tests passed without skips; lint and the production build passed.
Browser recovery tests passed for list, photo and account-link failures. Supabase
performance advisors now report no missing foreign-key indexes, per-row auth
InitPlan warnings or overlapping permissive-policy warnings. Private claim tracking
has RLS and no browser grants/policies; its advisor information notice is expected.

Account-link permission regression (22 October): hosted `service_role` cannot read
`auth.users`. The server already verifies native Auth identity, confirmed email,
session and active profile before invoking the service-only linking function. The
function now uses that verified identity without broadening Auth-table access.
Regression coverage reproduces the former failure under the actual role grants,
checks repeat claims and rejects forged identity, revoked sessions and browser
roles. All 117 tests, targeted lint, the production build and browser recovery
checks passed. A rollback-only check also succeeded as the live service role.
