BEGIN;

-- Existing applications retain NULL sponsorship rather than invented historical values.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS sponsorship TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_organization TEXT,
  ADD COLUMN IF NOT EXISTS registration_email_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acceptance_email_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declaration_accepted_at TIMESTAMPTZ;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_sponsorship_check;
ALTER TABLE public.students ADD CONSTRAINT students_sponsorship_check CHECK (
  (sponsorship IS NULL AND sponsor_organization IS NULL) OR
  (sponsorship IS NOT NULL AND sponsorship IN ('Self sponsored', 'Guardian') AND sponsor_organization IS NULL) OR
  (sponsorship IS NOT NULL AND sponsorship = 'Scholarship' AND sponsor_organization IS NOT NULL AND length(btrim(sponsor_organization)) BETWEEN 1 AND 160)
);
UPDATE public.students SET acceptance_email_claimed_at = now()
WHERE (accepted IS TRUE OR status = 'accepted') AND acceptance_email_claimed_at IS NULL;

CREATE OR REPLACE FUNCTION public.is_active_account() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND is_active IS TRUE);
$$;
CREATE OR REPLACE FUNCTION public.is_active_account_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND is_active IS TRUE AND is_admin IS TRUE);
$$;
REVOKE ALL ON FUNCTION public.is_active_account(), public.is_active_account_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_account(), public.is_active_account_admin() TO authenticated, service_role;

-- Deactivation and reactivation are server operations; a retained JWT cannot reactivate itself.
DROP POLICY IF EXISTS users_active_updates ON public.users;
CREATE POLICY users_active_updates ON public.users AS RESTRICTIVE FOR UPDATE TO authenticated
USING (is_active IS TRUE) WITH CHECK (is_active IS TRUE);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.students FROM anon, authenticated;
REVOKE SELECT ON public.students FROM anon;
GRANT SELECT ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
DROP POLICY IF EXISTS students_account_read ON public.students;
CREATE POLICY students_account_read ON public.students FOR SELECT TO authenticated
USING (public.is_active_account() AND (user_id = (SELECT auth.uid()) OR public.is_active_account_admin()));
DROP POLICY IF EXISTS students_account_read_guard ON public.students;
CREATE POLICY students_account_read_guard ON public.students AS RESTRICTIVE FOR SELECT TO authenticated
USING (public.is_active_account() AND (user_id = (SELECT auth.uid()) OR public.is_active_account_admin()));

CREATE OR REPLACE FUNCTION public.submit_student_application(p_user_id UUID, p_details JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE applicant public.students%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND is_active IS TRUE) THEN
    RAISE EXCEPTION 'Inactive account' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.students WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'An application already exists' USING ERRCODE = '23505';
  END IF;
  IF p_details->>'sponsorship' IS NULL OR p_details->>'agreed' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Sponsorship and declaration are required' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.students (user_id, surname, first_name, middle_name, gender, date_of_birth, age, nationality,
    marital_status, state_of_origin, address, telephone, email, chosen_programme, passport_photo, sponsorship,
    sponsor_organization, status, accepted, registration_email_claimed_at, declaration_accepted_at)
  VALUES (p_user_id, p_details->>'surname', p_details->>'first_name', p_details->>'middle_name', p_details->>'gender',
    (p_details->>'date_of_birth')::date, (p_details->>'age')::integer, p_details->>'nationality', p_details->>'marital_status',
    p_details->>'state_of_origin', p_details->>'address', p_details->>'telephone', p_details->>'email',
    p_details->>'chosen_programme', p_details->>'passport_photo', p_details->>'sponsorship',
    CASE WHEN p_details->>'sponsorship' = 'Scholarship' THEN btrim(p_details->>'sponsor_organization') ELSE NULL END,
    'pending', false, now(), now()) RETURNING * INTO applicant;
  RETURN to_jsonb(applicant);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_student_application(p_id BIGINT, p_status TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE applicant public.students%ROWTYPE; send_acceptance BOOLEAN;
BEGIN
  IF p_status NOT IN ('pending', 'accepted', 'declined') THEN RAISE EXCEPTION 'Invalid status' USING ERRCODE = '23514'; END IF;
  SELECT * INTO applicant FROM public.students WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002'; END IF;
  send_acceptance := p_status = 'accepted' AND applicant.acceptance_email_claimed_at IS NULL;
  UPDATE public.students SET status = p_status, accepted = (p_status = 'accepted'),
    acceptance_email_claimed_at = CASE WHEN send_acceptance THEN now() ELSE acceptance_email_claimed_at END
    WHERE id = p_id RETURNING * INTO applicant;
  RETURN jsonb_build_object('student', to_jsonb(applicant), 'send_acceptance', send_acceptance);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_student_application(UUID, JSONB), public.review_student_application(BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_student_application(UUID, JSONB), public.review_student_application(BIGINT, TEXT) TO service_role;

-- Guest checkout is unchanged. The account API claims unassigned orders using a verified email.
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS shop_orders_account_idx ON public.shop_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_unclaimed_email_idx ON public.shop_orders (customer_email) WHERE user_id IS NULL;
DROP POLICY IF EXISTS customer_read_paid_orders ON public.shop_orders;
CREATE POLICY customer_read_paid_orders ON public.shop_orders FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) AND payment_status = 'paid' AND public.is_active_account());
-- Only the columns needed by the ownership-checking trigger are available to clients.
-- The dashboard's server route returns the remaining display fields.
GRANT SELECT (id, user_id, items, payment_status) ON public.shop_orders TO authenticated;

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id), product_id UUID NOT NULL,
  product_name TEXT NOT NULL DEFAULT '', description TEXT NOT NULL CHECK (length(btrim(description)) BETWEEN 10 AND 2000),
  received_confirmed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  response TEXT CHECK (length(response) <= 2000), reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id, product_id)
);
CREATE TABLE IF NOT EXISTS public.product_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id), product_id UUID NOT NULL,
  product_name TEXT NOT NULL DEFAULT '', description TEXT NOT NULL CHECK (length(btrim(description)) BETWEEN 10 AND 2000),
  received_confirmed BOOLEAN NOT NULL DEFAULT false CHECK (received_confirmed IS TRUE),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')),
  response TEXT CHECK (length(response) <= 2000), reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id, product_id)
);
CREATE INDEX IF NOT EXISTS refund_requests_account_idx ON public.refund_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_complaints_account_idx ON public.product_complaints (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.guard_customer_request() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE purchased_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT item->>'name' INTO purchased_name FROM public.shop_orders orders
    CROSS JOIN LATERAL jsonb_array_elements(orders.items) item
    WHERE orders.id = NEW.order_id AND orders.user_id = NEW.user_id AND orders.payment_status = 'paid'
      AND item->>'productId' = NEW.product_id::text LIMIT 1;
    IF purchased_name IS NULL THEN RAISE EXCEPTION 'Product must belong to an owned paid order' USING ERRCODE = '23514'; END IF;
    NEW.product_name := purchased_name;
    NEW.created_at := now();
    NEW.updated_at := NEW.created_at;
  ELSE
    IF (NEW.id, NEW.user_id, NEW.order_id, NEW.product_id, NEW.product_name, NEW.description, NEW.received_confirmed, NEW.created_at)
      IS DISTINCT FROM (OLD.id, OLD.user_id, OLD.order_id, OLD.product_id, OLD.product_name, OLD.description, OLD.received_confirmed, OLD.created_at) THEN
      RAISE EXCEPTION 'Request ownership and original details cannot change' USING ERRCODE = '23514';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (TG_TABLE_NAME = 'refund_requests' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) OR
      (TG_TABLE_NAME = 'product_complaints' AND OLD.status = 'pending' AND NEW.status IN ('in_review', 'resolved', 'rejected')) OR
      (TG_TABLE_NAME = 'product_complaints' AND OLD.status = 'in_review' AND NEW.status IN ('resolved', 'rejected'))
    ) THEN RAISE EXCEPTION 'Invalid request status transition' USING ERRCODE = '23514'; END IF;
    NEW.reviewed_by := coalesce((SELECT auth.uid()), NEW.reviewed_by);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_customer_request() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_complaints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refund_requests, public.product_complaints FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.refund_requests, public.product_complaints TO service_role;
GRANT SELECT ON public.refund_requests, public.product_complaints TO authenticated;
GRANT INSERT (id, user_id, order_id, product_id, description, received_confirmed) ON public.refund_requests, public.product_complaints TO authenticated;
GRANT UPDATE (status, response) ON public.refund_requests, public.product_complaints TO authenticated;

DROP TRIGGER IF EXISTS guard_refund_request ON public.refund_requests;
CREATE TRIGGER guard_refund_request BEFORE INSERT OR UPDATE ON public.refund_requests FOR EACH ROW EXECUTE FUNCTION public.guard_customer_request();
DROP TRIGGER IF EXISTS guard_product_complaint ON public.product_complaints;
CREATE TRIGGER guard_product_complaint BEFORE INSERT OR UPDATE ON public.product_complaints FOR EACH ROW EXECUTE FUNCTION public.guard_customer_request();

DROP POLICY IF EXISTS refund_read_own_or_admin ON public.refund_requests;
CREATE POLICY refund_read_own_or_admin ON public.refund_requests FOR SELECT TO authenticated
USING (public.is_active_account() AND (user_id = (SELECT auth.uid()) OR public.is_active_account_admin()));
DROP POLICY IF EXISTS refund_insert_own ON public.refund_requests;
CREATE POLICY refund_insert_own ON public.refund_requests FOR INSERT TO authenticated
WITH CHECK (public.is_active_account() AND user_id = (SELECT auth.uid()) AND status = 'pending' AND response IS NULL AND reviewed_by IS NULL);
DROP POLICY IF EXISTS refund_admin_update ON public.refund_requests;
CREATE POLICY refund_admin_update ON public.refund_requests FOR UPDATE TO authenticated
USING (public.is_active_account_admin()) WITH CHECK (public.is_active_account_admin());
DROP POLICY IF EXISTS complaint_read_own_or_admin ON public.product_complaints;
CREATE POLICY complaint_read_own_or_admin ON public.product_complaints FOR SELECT TO authenticated
USING (public.is_active_account() AND (user_id = (SELECT auth.uid()) OR public.is_active_account_admin()));
DROP POLICY IF EXISTS complaint_insert_own ON public.product_complaints;
CREATE POLICY complaint_insert_own ON public.product_complaints FOR INSERT TO authenticated
WITH CHECK (public.is_active_account() AND user_id = (SELECT auth.uid()) AND status = 'pending' AND response IS NULL AND reviewed_by IS NULL AND received_confirmed IS TRUE);
DROP POLICY IF EXISTS complaint_admin_update ON public.product_complaints;
CREATE POLICY complaint_admin_update ON public.product_complaints FOR UPDATE TO authenticated
USING (public.is_active_account_admin()) WITH CHECK (public.is_active_account_admin());

CREATE TABLE IF NOT EXISTS public.account_action_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, action TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL, request_count INTEGER NOT NULL,
  PRIMARY KEY (user_id, action)
);
ALTER TABLE public.account_action_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_action_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.account_action_limits TO service_role;
CREATE OR REPLACE FUNCTION public.consume_account_action_limit(p_user_id UUID, p_action TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE count_now INTEGER; window_size INTERVAL; maximum INTEGER;
BEGIN
  IF p_action NOT IN ('password', 'deactivate', 'refund', 'complaint') THEN RAISE EXCEPTION 'Invalid action'; END IF;
  window_size := CASE WHEN p_action IN ('password', 'deactivate') THEN INTERVAL '15 minutes' ELSE INTERVAL '1 hour' END;
  maximum := CASE WHEN p_action IN ('password', 'deactivate') THEN 5 ELSE 10 END;
  INSERT INTO public.account_action_limits AS limits (user_id, action, window_started_at, request_count)
  VALUES (p_user_id, p_action, now(), 1)
  ON CONFLICT (user_id, action) DO UPDATE SET
    window_started_at = CASE WHEN limits.window_started_at <= now() - window_size THEN now() ELSE limits.window_started_at END,
    request_count = CASE WHEN limits.window_started_at <= now() - window_size THEN 1 ELSE limits.request_count + 1 END
  RETURNING request_count INTO count_now;
  RETURN count_now <= maximum;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_account_action_limit(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_account_action_limit(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
