BEGIN;

-- The applicant may replace the upload while preparing an application or while
-- correcting a declined one. An accepted or pending application's signed copy
-- must remain unchanged for staff review.
ALTER POLICY guardian_consent_update ON storage.objects
USING (bucket_id='guardian-consents'
  AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
  AND (NOT EXISTS(SELECT 1 FROM public.students WHERE user_id=(SELECT auth.uid()))
    OR EXISTS(SELECT 1 FROM public.students WHERE user_id=(SELECT auth.uid())
      AND status='declined' AND correction_opened_at IS NOT NULL)))
WITH CHECK (bucket_id='guardian-consents'
  AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
  AND storage.filename(name) IN ('guardian-consent.pdf','guardian-consent.jpg','guardian-consent.png')
  AND metadata->>'mimetype' IN ('application/pdf','image/jpeg','image/png')
  AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880);

COMMIT;
