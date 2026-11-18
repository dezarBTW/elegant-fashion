BEGIN;
CREATE OR REPLACE FUNCTION public.resubmit_student_application(
  p_user_id uuid, p_id bigint, p_changes jsonb, p_passport_photo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE applicant public.students%ROWTYPE; field_name text; photo_path text;
BEGIN
  SELECT * INTO applicant FROM public.students WHERE id = p_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002'; END IF;
  IF applicant.status <> 'declined' OR applicant.correction_opened_at IS NULL THEN
    RAISE EXCEPTION 'Corrections are not open for this application' USING ERRCODE = '23514';
  END IF;
  IF jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION 'Invalid correction details' USING ERRCODE = '23514';
  END IF;
  FOR field_name IN SELECT jsonb_object_keys(p_changes) LOOP
    IF NOT field_name = ANY(applicant.correction_fields)
      AND NOT (field_name = 'sponsor_organization' AND 'sponsorship' = ANY(applicant.correction_fields)) THEN
      RAISE EXCEPTION 'Field is not open for correction' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  photo_path := public.storage_path_from_value('student-passports', p_passport_photo);
  IF photo_path IS DISTINCT FROM (p_user_id::text || '/passport-' || applicant.decline_revision::text) THEN
    RAISE EXCEPTION 'Upload a new passport photograph' USING ERRCODE = '23514';
  END IF;
  UPDATE public.students SET
    surname = CASE WHEN p_changes ? 'surname' THEN p_changes->>'surname' ELSE surname END,
    first_name = CASE WHEN p_changes ? 'first_name' THEN p_changes->>'first_name' ELSE first_name END,
    middle_name = CASE WHEN p_changes ? 'middle_name' THEN p_changes->>'middle_name' ELSE middle_name END,
    gender = CASE WHEN p_changes ? 'gender' THEN p_changes->>'gender' ELSE gender END,
    date_of_birth = CASE WHEN p_changes ? 'date_of_birth' THEN (p_changes->>'date_of_birth')::date ELSE date_of_birth END,
    age = CASE WHEN p_changes ? 'age' THEN (p_changes->>'age')::integer ELSE age END,
    nationality = CASE WHEN p_changes ? 'nationality' THEN p_changes->>'nationality' ELSE nationality END,
    marital_status = CASE WHEN p_changes ? 'marital_status' THEN p_changes->>'marital_status' ELSE marital_status END,
    state_of_origin = CASE WHEN p_changes ? 'state_of_origin' THEN p_changes->>'state_of_origin' ELSE state_of_origin END,
    address = CASE WHEN p_changes ? 'address' THEN p_changes->>'address' ELSE address END,
    telephone = CASE WHEN p_changes ? 'telephone' THEN p_changes->>'telephone' ELSE telephone END,
    email = CASE WHEN p_changes ? 'email' THEN p_changes->>'email' ELSE email END,
    chosen_programme = CASE WHEN p_changes ? 'chosen_programme' THEN p_changes->>'chosen_programme' ELSE chosen_programme END,
    sponsorship = CASE WHEN p_changes ? 'sponsorship' THEN p_changes->>'sponsorship' ELSE sponsorship END,
    sponsor_organization = CASE
      WHEN p_changes ? 'sponsorship' AND p_changes->>'sponsorship' <> 'Scholarship' THEN NULL
      WHEN p_changes ? 'sponsor_organization' THEN p_changes->>'sponsor_organization'
      ELSE sponsor_organization END,
    passport_photo = p_passport_photo, status = 'pending', accepted = false,
    correction_opened_at = NULL
    WHERE id = p_id RETURNING * INTO applicant;
  RETURN to_jsonb(applicant);
END;
$$;
REVOKE ALL ON FUNCTION public.resubmit_student_application(uuid,bigint,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_student_application(uuid,bigint,jsonb,text) TO service_role;

ALTER POLICY "Users can upload own passport" ON storage.objects
WITH CHECK (bucket_id='student-passports'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND (storage.filename(name) IN ('passport.jpg','passport.png') OR EXISTS (
   SELECT 1 FROM public.students s WHERE s.user_id=(SELECT auth.uid())
   AND s.status='declined' AND s.correction_opened_at IS NOT NULL
   AND storage.filename(name)=('passport-' || s.decline_revision::text)
 )));
ALTER POLICY "Users can update own passport" ON storage.objects
USING (bucket_id='student-passports' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)
WITH CHECK (bucket_id='student-passports'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND (storage.filename(name) IN ('passport.jpg','passport.png') OR EXISTS (
   SELECT 1 FROM public.students s WHERE s.user_id=(SELECT auth.uid())
   AND s.status='declined' AND s.correction_opened_at IS NOT NULL
   AND storage.filename(name)=('passport-' || s.decline_revision::text)
 )));
NOTIFY pgrst, 'reload schema';
COMMIT;
