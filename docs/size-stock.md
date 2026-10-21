# Stock by size

Admins enter a nonnegative whole-number stock count for S, M, L, XL and XXL when adding or editing a product. Zero disables that size. Stock quantities are private; customers receive only capped purchase limits and see no remaining-stock total. The existing maximum of ten units per size per order still applies.

The product page and cart check current limits on load, focus, every 15 seconds, on Add to cart, and immediately before moving from the cart to checkout. Checkout refreshes availability as well. A stale cart cannot proceed until its size/quantity is updated. These browser checks improve the experience; database reservations provide the actual overselling protection.

`product_size_stock` holds unsold physical stock, including units reserved for pending payments. `shop_stock_reservations` records the product, size and quantity reserved for each order. Both tables have RLS and grant ordinary customers no rows; only active admins can read counts. Stock writes use the authenticated admin API and a service-only atomic function. Edits include a revision, so a stale form cannot overwrite stock changed by a customer purchase. The admin cannot lower stock beneath existing reservations.

An order INSERT reserves every line in the same transaction, locking stock rows in product-ID order. If any size is short, the entire order and all its reservations roll back. Checkout returns 409 before contacting the payment provider. Successful payment changes held reservations to sold and deducts physical stock inside the same transaction as marking the order paid. Replayed notifications do not deduct twice. Product deletion is blocked while there is a pending reservation.

## Pending payments

An open, uncertain or review payment keeps its reservation. Closing a browser, returning through Cancel, a failed collection attempt or an expired hosted checkout does **not** prove that payment cannot arrive later: [Bachs documents late bank-transfer completion after expiry](https://docs.bachs.io/build/use-cases/digital-products). Reservations therefore do not automatically expire or return to sale. Unresolved payments require reconciliation with the payment provider; no automatic release or refund workflow is introduced here. Do not bypass this by increasing stock unless additional physical units actually exist.

The existing historical orders are marked `stock_required=false` to avoid inventing deductions. New orders default to tracked stock. Products without a stock record have zero purchase capacity until an admin sets their quantities. The production catalog was empty when this feature was prepared, following the requested test-product deletion.

## Verification

The isolated PostgreSQL tests cover buying all four units, rejecting a fifth unit, payment deduction/replay, stale admin edits, reserved-unit reductions, product deletion, private table access and rollback of a mixed-product order. In a 1,000-attempt contention check with four Large units, exactly four reservations succeed and 996 fail. PGlite serializes query execution, so this is an atomicity/stock-limit test rather than a hosted multi-connection performance benchmark.

Browser checks use an isolated local backend and create no products in production. They cover admin stock editing, quantity choices 1–4 for four Large gowns, disabled zero-stock sizes, cart limits, changed availability blocking checkout, and lowering quantity to proceed. SDK tests exercise the real Bachs SDK against intercepted fetch responses; they do not make real payments. The payment transport and webhook verification use `@bachs/sdk` 1.0.0 with retained checkout idempotency keys.

Run the tests using `PGLITE_MODULE_PATH` as described in the security-audit report, then `node --experimental-vm-modules --test scripts/*.test.mjs`. The migration is `size_stock_reservations.sql` in `supabase/migrations`.
