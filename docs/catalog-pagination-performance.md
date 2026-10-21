# Catalog pagination and RLS performance

The shop reads `get_shop_product_page`: 12 active products per page. Category,
gender (including unisex), price and literal substring search run before paging.
Search includes product specifications. Card responses contain display fields,
without descriptions, specifications or private stock quantities.

Admin reads `get_admin_product_page`: 24 products with only their matching stock
quantities and revision. Product and stock data use the same statement snapshot.
Filters apply before pagination; available category names are separate metadata.
An active administrator is required. Both RPCs use SECURITY INVOKER and retain RLS.

Ordering is `created_at DESC, id ASC`, including when timestamps are identical.
Pages are clamped to the last existing page, including after deletion; empty
results return page 1. Search is debounced 200 ms and obsolete requests are
aborted. Errors replace the list with an alert rather than editable stale rows.

RLS changes consolidate redundant reads and admin writes, and wrap row-independent
identity/account helpers in scalar SELECTs so PostgreSQL can use InitPlans.
The student read guard and inactive-profile update restriction remain restrictive.
Students remain writable only by the service role. Private stock tables retain
their admin-only read policies. Stock reservation/payment triggers are unchanged.

Indexes match active shop ordering, active category ordering and admin ordering.
Exact totals and substring searches still require counting/scanning matching rows;
this change bounds response size and removes repeated per-row identity checks,
without claiming constant query cost for arbitrarily large catalogs.

## Verification

- `scripts/catalog-pagination-db.test.mjs` uses isolated PostgreSQL with 1,205
  products. It exercises every active-product page, tied timestamps, combined
  filters, literal punctuation, invalid input, private stock, admin pages beyond
  row 1,000, page clamping and InitPlans.
- Before/after access matrices cover guests, two customers, active/inactive admins,
  an inactive customer, products, users, students, stock and related catalog tables.
- Existing checkout, payment, stock reservation and security tests remain included
  in the full test suite.
- Run SQL tests with `PGLITE_MODULE_PATH` pointing to the isolated PGlite runtime
  and `node --experimental-vm-modules --test scripts/*.test.mjs`.
- Browser verification uses intercepted fixture responses, never live products or
  orders, and checks 12/24-item pages, filters, stock editing past row 1,000 and
  mobile/desktop overflow.
- Full suite: 99 tests passed; lint and production build passed. Browser checks
  also verify error responses, recovery and cancellation of obsolete searches.
- Live Supabase advisors after migration: auth RLS InitPlan warnings 5 to 0;
  overlapping permissive-policy findings 27 to 0. Remaining missing foreign-key
  indexes and unused-index notices are separate, lower-priority audit items.
- Live catalog remains empty; no test products or orders were added.
