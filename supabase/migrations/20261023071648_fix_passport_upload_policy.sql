BEGIN;
-- The previous SQL regex contained a doubled backslash and rejected normal
-- passport.jpg/png filenames. Exact names avoid SQL/regex escaping ambiguity.
DROP POLICY IF EXISTS "Users can upload own passport" ON storage.objects;
CREATE POLICY "Users can upload own passport" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='student-passports'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND storage.filename(name) IN ('passport.jpg','passport.png')
 AND metadata->>'mimetype' IN ('image/jpeg','image/png')
 AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880);
DROP POLICY IF EXISTS "Users can update own passport" ON storage.objects;
CREATE POLICY "Users can update own passport" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='student-passports' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)
WITH CHECK (bucket_id='student-passports'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND storage.filename(name) IN ('passport.jpg','passport.png')
 AND metadata->>'mimetype' IN ('image/jpeg','image/png')
 AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880);
COMMIT;
