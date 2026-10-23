# Passport upload permissions

The passport INSERT and UPDATE policies rejected normal JPG/PNG filenames because
the SQL regex was over-escaped. Exact filename checks now allow `passport.jpg` and
`passport.png` in the authenticated user's own folder.

Storage performs a permission preflight before final object metadata is present.
Checking MIME type and size in that RLS preflight also rejected valid uploads.
The private bucket enforces JPEG/PNG and a 5 MB limit instead. The registration API
independently verifies the uploaded object's ownership, MIME type and size before
creating the application. Passport images remain private; other users cannot write
into an applicant's folder. Existing own-photo/admin read policies are preserved.

The form now gives a readable recovery message for upload failures and clears its
progress timer even if an upload throws. It no longer displays raw database policy
errors to applicants.

Verification includes actual signed-in JPEG upload, replacement and signed preview
through hosted Storage, plus rejection of foreign-folder and unsigned uploads.
Temporary test users and files are removed afterward. Isolated policy tests cover
metadata-free preflight, both filenames, ownership and anonymous access. Bucket
restrictions are checked separately through the Storage API.
