# Deleting records and uploaded media

Admin product, bespoke-request and student-registration deletions use
`DELETE /api/admin/media` with a record kind and ID. The server verifies the live
administrator session and request origin. Storage paths are read from the database,
never accepted from the browser.

`admin_delete_with_media` deletes the record in one transaction and returns the
main photo and any gallery references. Existing database triggers durably queue
unreferenced files, including cascaded product-gallery deletions. Pending payment
reservations still prevent product deletion; no media is touched if deletion fails.

The server removes the queued files through the Storage API before returning a
successful cleanup result. It rechecks that another live record does not reference
the file. Shared files stay until their last owner is deleted. This covers product
main/gallery images, student passports and bespoke photos in site storage.

Storage outages return an explicit warning after record deletion, with a manual
retry button. The queue remains durable and the existing once-per-minute worker
also retries. Database-dashboard deletions use this scheduled fallback rather than
the immediate application route. A repeated delete is safe. Email attachments,
downloaded copies, external images and cached browser copies are outside site
storage deletion.

Verification: 120 tests passed with no skips; lint and the production build passed.
The actual deletion triggers were tested for all three record types, gallery
cascades, shared references, repeated deletes, denied browser roles and reservation
rollback. Route checks cover administrator access, origin validation, injected
paths and cleanup failure/retry. Temporary uploads were removed and verified absent
in all three live buckets; no real customer records were deleted during testing.
