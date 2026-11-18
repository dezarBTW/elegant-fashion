BEGIN;
ALTER POLICY "Users can upload own passport" ON storage.objects
WITH CHECK (bucket_id='student-passports'
 AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
 AND (storage.filename(storage.objects.name) IN ('passport.jpg','passport.png') OR EXISTS (
   SELECT 1 FROM public.students applicant WHERE applicant.user_id=(SELECT auth.uid())
   AND applicant.status='declined' AND applicant.correction_opened_at IS NOT NULL
   AND storage.filename(storage.objects.name)=('passport-' || applicant.decline_revision::text)
 )));
ALTER POLICY "Users can update own passport" ON storage.objects
USING (bucket_id='student-passports' AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text)
WITH CHECK (bucket_id='student-passports'
 AND (storage.foldername(storage.objects.name))[1]=(SELECT auth.uid())::text
 AND (storage.filename(storage.objects.name) IN ('passport.jpg','passport.png') OR EXISTS (
   SELECT 1 FROM public.students applicant WHERE applicant.user_id=(SELECT auth.uid())
   AND applicant.status='declined' AND applicant.correction_opened_at IS NOT NULL
   AND storage.filename(storage.objects.name)=('passport-' || applicant.decline_revision::text)
 )));
COMMIT;
