# Offline seller payments and shipping

Vendor settlements are arranged directly with the shop. Vendors can update
direct shipments in Sales and shipping. For multiple-vendor orders and shop
pickup, vendors send their items to the shop and administrators record the
shop handoff and final dispatch.

Customer checkout, purchase emails, stock handling and product ownership snapshots
remain available. Admin Shop orders includes customer contact/address details and
the owner of each purchased item. Historical seller/payment records are retained.

Customers receive a shipping or pickup email and confirm each received item in
My orders. Their seven-day online return/refund request window begins at that
confirmation. If a customer does not confirm, an administrator may verify
delivery after the applicable waiting period and record evidence. Confirmation
is idempotent: repeated requests do not restart the deadline. Timely refund
requests remain reviewable after the submission window closes; customers can
contact the shop about later statutory claims.

Vendor payments remain offline and are not released automatically by the site.

The current seven-day deadline is in
`20261118151604_seven_day_refunds_and_guardian_consent.sql` (applied to Supabase).
The matching application changes have not been deployed.

Validation: targeted API/email/state-machine tests, actual PostgreSQL migration
tests through PGlite, lint, production build, and mocked local browser checks.
