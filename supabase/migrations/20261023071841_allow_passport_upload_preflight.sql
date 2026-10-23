BEGIN;
-- Storage checks RLS before final object metadata is present. Enforce file type
-- and size through the Storage bucket; RLS governs identity and destination.
UPDATE storage.buckets SET file_size_limit=5242880,allowed_mime_types=ARRAY['image/jpeg','image/png'] WHERE id='student-passports';
ALTER POLICY "Users can upload own passport" ON storage.objects
WITH CHECK (bucket_id='student-passports'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND storage.filename(name) IN ('passport.jpg','passport.png'));
ALTER POLICY "Users can update own passport" ON storage.objects
USING (bucket_id='student-passports' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)
WITH CHECK (bucket_id='student-passports'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND storage.filename(name) IN ('passport.jpg','passport.png'));
COMMIT;
