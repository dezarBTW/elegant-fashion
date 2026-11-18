BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_refund_deadline() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE confirmed timestamptz;
BEGIN
  PERFORM 1 FROM public.seller_order_items WHERE order_id=NEW.order_id AND product_id=NEW.product_id ORDER BY id FOR UPDATE;
  SELECT min(confirmed_at) INTO confirmed FROM public.seller_order_items WHERE order_id=NEW.order_id AND product_id=NEW.product_id;
  IF confirmed IS NULL AND NOT EXISTS(SELECT 1 FROM public.seller_order_items WHERE order_id=NEW.order_id AND product_id=NEW.product_id) THEN
    SELECT coalesce(delivery_confirmed_at,customer_received_at) INTO confirmed FROM public.shop_orders WHERE id=NEW.order_id;
  END IF;
  IF confirmed IS NULL OR clock_timestamp()>=confirmed+interval '7 days' THEN
    RAISE EXCEPTION 'Online return/refund requests are available within seven days of confirmed delivery' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.students ADD COLUMN guardian_consent_path text;
ALTER TABLE public.students ADD CONSTRAINT students_guardian_consent_path_check
  CHECK (guardian_consent_path IS NULL OR length(guardian_consent_path) <= 200);

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('guardian-consents','guardian-consents',false,5242880,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,
  allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png'];

CREATE POLICY guardian_consent_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='guardian-consents'
  AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
  AND storage.filename(name) IN ('guardian-consent.pdf','guardian-consent.jpg','guardian-consent.png')
  AND metadata->>'mimetype' IN ('application/pdf','image/jpeg','image/png')
  AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880);
CREATE POLICY guardian_consent_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='guardian-consents' AND
  ((storage.foldername(name))[1]=(SELECT auth.uid())::text OR public.is_admin_user()));
CREATE POLICY guardian_consent_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='guardian-consents' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)
WITH CHECK (bucket_id='guardian-consents'
  AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
  AND storage.filename(name) IN ('guardian-consent.pdf','guardian-consent.jpg','guardian-consent.png')
  AND metadata->>'mimetype' IN ('application/pdf','image/jpeg','image/png')
  AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880);

CREATE OR REPLACE FUNCTION public.storage_path_in_use(p_bucket text,p_path text)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT CASE p_bucket
    WHEN 'bespoke-requests' THEN EXISTS(SELECT 1 FROM public.bespoke_requests WHERE image_paths @> ARRAY[p_path])
    WHEN 'student-passports' THEN EXISTS(SELECT 1 FROM public.students WHERE public.storage_path_from_value('student-passports',passport_photo)=p_path)
    WHEN 'guardian-consents' THEN EXISTS(SELECT 1 FROM public.students WHERE guardian_consent_path=p_path)
    WHEN 'product-images' THEN
      EXISTS(SELECT 1 FROM public.products WHERE public.storage_path_from_value('product-images',image)=p_path)
      OR EXISTS(SELECT 1 FROM public.product_images WHERE public.storage_path_from_value('product-images',url)=p_path)
      OR EXISTS(SELECT 1 FROM public.categories WHERE public.storage_path_from_value('product-images',image_url)=p_path)
    ELSE false END;
$$;

CREATE TRIGGER cleanup_guardian_consent AFTER DELETE OR UPDATE OF guardian_consent_path ON public.students
FOR EACH ROW EXECUTE FUNCTION public.trg_cleanup_single_image('guardian-consents','guardian_consent_path');

CREATE OR REPLACE FUNCTION public.submit_student_application(p_user_id uuid,p_details jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE applicant public.students%ROWTYPE; dob date; consent_path text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_user_id AND is_active IS TRUE) THEN
    RAISE EXCEPTION 'Inactive account' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.students WHERE user_id=p_user_id) THEN
    RAISE EXCEPTION 'An application already exists' USING ERRCODE='23505'; END IF;
  IF p_details->>'sponsorship' IS NULL OR p_details->>'agreed' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Sponsorship and declaration are required' USING ERRCODE='23514'; END IF;
  dob := (p_details->>'date_of_birth')::date;
  consent_path := nullif(p_details->>'guardian_consent_path','');
  IF dob > current_date - interval '13 years' THEN
    RAISE EXCEPTION 'Applicants under 13 cannot apply online' USING ERRCODE='23514'; END IF;
  IF dob > current_date - interval '18 years' AND consent_path IS NULL THEN
    RAISE EXCEPTION 'A signed guardian consent form is required' USING ERRCODE='23514'; END IF;
  IF consent_path IS NOT NULL AND consent_path !~ ('^' || p_user_id::text || '/guardian-consent[.](pdf|jpg|png)$') THEN
    RAISE EXCEPTION 'Invalid guardian consent document' USING ERRCODE='23514'; END IF;
  INSERT INTO public.students(user_id,surname,first_name,middle_name,gender,date_of_birth,age,nationality,
    marital_status,state_of_origin,address,telephone,email,chosen_programme,passport_photo,sponsorship,
    sponsor_organization,guardian_consent_path,status,accepted,registration_email_claimed_at,declaration_accepted_at)
  VALUES(p_user_id,p_details->>'surname',p_details->>'first_name',p_details->>'middle_name',p_details->>'gender',dob,
    (p_details->>'age')::integer,p_details->>'nationality',p_details->>'marital_status',p_details->>'state_of_origin',
    p_details->>'address',p_details->>'telephone',p_details->>'email',p_details->>'chosen_programme',
    p_details->>'passport_photo',p_details->>'sponsorship',
    CASE WHEN p_details->>'sponsorship'='Scholarship' THEN btrim(p_details->>'sponsor_organization') ELSE NULL END,
    CASE WHEN dob > current_date - interval '18 years' THEN consent_path ELSE NULL END,
    'pending',false,now(),now()) RETURNING * INTO applicant;
  RETURN to_jsonb(applicant);
END $$;

CREATE OR REPLACE FUNCTION public.resubmit_student_application(
  p_user_id uuid,p_id bigint,p_changes jsonb,p_passport_photo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE applicant public.students%ROWTYPE; field_name text; photo_path text; dob date; consent_path text;
BEGIN
  SELECT * INTO applicant FROM public.students WHERE id=p_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found' USING ERRCODE='P0002'; END IF;
  IF applicant.status<>'declined' OR applicant.correction_opened_at IS NULL THEN
    RAISE EXCEPTION 'Corrections are not open for this application' USING ERRCODE='23514'; END IF;
  IF jsonb_typeof(p_changes)<>'object' THEN RAISE EXCEPTION 'Invalid correction details' USING ERRCODE='23514'; END IF;
  FOR field_name IN SELECT jsonb_object_keys(p_changes) LOOP
    IF field_name='guardian_consent_path' THEN CONTINUE; END IF;
    IF NOT field_name=ANY(applicant.correction_fields)
      AND NOT(field_name='sponsor_organization' AND 'sponsorship'=ANY(applicant.correction_fields)) THEN
      RAISE EXCEPTION 'Field is not open for correction' USING ERRCODE='23514'; END IF;
  END LOOP;
  photo_path:=public.storage_path_from_value('student-passports',p_passport_photo);
  IF photo_path IS DISTINCT FROM(p_user_id::text || '/passport-' || applicant.decline_revision::text) THEN
    RAISE EXCEPTION 'Upload a new passport photograph' USING ERRCODE='23514'; END IF;
  dob:=CASE WHEN p_changes?'date_of_birth' THEN(p_changes->>'date_of_birth')::date ELSE applicant.date_of_birth END;
  consent_path:=coalesce(nullif(p_changes->>'guardian_consent_path',''),applicant.guardian_consent_path);
  IF dob > current_date-interval '13 years' THEN
    RAISE EXCEPTION 'Applicants under 13 cannot apply online' USING ERRCODE='23514'; END IF;
  IF dob > current_date-interval '18 years' AND consent_path IS NULL THEN
    RAISE EXCEPTION 'A signed guardian consent form is required' USING ERRCODE='23514'; END IF;
  IF consent_path IS NOT NULL AND consent_path !~ ('^' || p_user_id::text || '/guardian-consent[.](pdf|jpg|png)$') THEN
    RAISE EXCEPTION 'Invalid guardian consent document' USING ERRCODE='23514'; END IF;
  UPDATE public.students SET
    surname=CASE WHEN p_changes?'surname' THEN p_changes->>'surname' ELSE surname END,
    first_name=CASE WHEN p_changes?'first_name' THEN p_changes->>'first_name' ELSE first_name END,
    middle_name=CASE WHEN p_changes?'middle_name' THEN p_changes->>'middle_name' ELSE middle_name END,
    gender=CASE WHEN p_changes?'gender' THEN p_changes->>'gender' ELSE gender END,
    date_of_birth=dob,
    age=CASE WHEN p_changes?'age' THEN(p_changes->>'age')::integer ELSE age END,
    nationality=CASE WHEN p_changes?'nationality' THEN p_changes->>'nationality' ELSE nationality END,
    marital_status=CASE WHEN p_changes?'marital_status' THEN p_changes->>'marital_status' ELSE marital_status END,
    state_of_origin=CASE WHEN p_changes?'state_of_origin' THEN p_changes->>'state_of_origin' ELSE state_of_origin END,
    address=CASE WHEN p_changes?'address' THEN p_changes->>'address' ELSE address END,
    telephone=CASE WHEN p_changes?'telephone' THEN p_changes->>'telephone' ELSE telephone END,
    email=CASE WHEN p_changes?'email' THEN p_changes->>'email' ELSE email END,
    chosen_programme=CASE WHEN p_changes?'chosen_programme' THEN p_changes->>'chosen_programme' ELSE chosen_programme END,
    sponsorship=CASE WHEN p_changes?'sponsorship' THEN p_changes->>'sponsorship' ELSE sponsorship END,
    sponsor_organization=CASE
      WHEN p_changes?'sponsorship' AND p_changes->>'sponsorship'<>'Scholarship' THEN NULL
      WHEN p_changes?'sponsor_organization' THEN p_changes->>'sponsor_organization'
      ELSE sponsor_organization END,
    passport_photo=p_passport_photo,
    guardian_consent_path=CASE WHEN dob > current_date-interval '18 years' THEN consent_path ELSE NULL END,
    status='pending',accepted=false,correction_opened_at=NULL
  WHERE id=p_id RETURNING * INTO applicant;
  RETURN to_jsonb(applicant);
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
