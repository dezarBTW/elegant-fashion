# Offline seller payments and shipping

Vendor settlements and shipping are arranged directly with the shop. The former
Seller fulfilment & payments dashboard redirects to Shop orders. Vendors retain
read-only Sales history and their existing product management tools.

Customer checkout, purchase emails, stock handling and product ownership snapshots
remain available. Admin Shop orders includes customer contact/address details and
the owner of each purchased item. Historical seller/payment records are retained.

After verifying receipt offline, an active administrator records a verification
note and selects **Delivery completed** in Shop orders. Only paid orders can be
confirmed. The server records delivery for every item and emails the customer the
three-day return/refund deadline. Confirmation is idempotent: repeated requests do
not restart the deadline. Existing item confirmation timestamps are preserved.
Timely refund requests remain reviewable after the submission window closes.

Old seller shipping/payment actions and customer receipt-confirmation writes are
disabled in the API and database. Old customer receipt links direct customers to
contact the shop. No scheduled seller notification polling is introduced.

Migration: `20261106173829_offline_seller_fulfilment.sql` (applied to Supabase).
Deploy the matching application changes yourself; application deployment was not
performed as part of this change.

Validation: targeted API/email/state-machine tests, actual PostgreSQL migration
tests through PGlite, lint, production build, and mocked local browser checks.
