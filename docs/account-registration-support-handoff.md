# Elegant Style: registration and customer account implementation

Prepared 17 October 2026. All source changes below are already applied in this workspace. This document contains the complete contents of every new or changed deployment/test source file for this request; no file bodies are abbreviated.

## 1. File plan

Use the existing navbar logo, Supabase Auth/database, Resend styling, CSS variables, cart, and admin shell. No application dependencies or UI libraries were added.

Assumptions: paid guest orders are linked by the signed-in user's server-verified, confirmed email; repurchase adds one unit at current availability and price; complaints use a text description and receipt confirmation; refund approval records a decision, with the shop arranging the payment refund separately through Bachs.

- Change **.env.example** — Remove address and recipient variables; document the shared existing address and fixed admin recipient.
- Create **scripts/account-registration-db.test.mjs** — Test the actual SQL twice against isolated PostgreSQL, including adversarial RLS and admission claims.
- Create **scripts/account-registration.test.mjs** — Test validation, exact wording, cart limits, escaped emails, idempotency keys, and delivery failures.
- Create **src/app/account/AccountShell.js** — Protect the customer area and reuse the admin dashboard layout and sidebar.
- Create **src/app/account/account.module.css** — Provide responsive account forms, focus states, messages, and request cards.
- Create **src/app/account/layout.js** — Apply the account shell and noindex metadata.
- Create **src/app/account/orders/page.js** — Show paid purchases, repurchase items, and submit refund/received-product complaint forms.
- Create **src/app/account/page.js** — Show the profile, change password, and confirm soft deactivation.
- Create **src/app/account/requests/page.js** — Expose the customer request-history page.
- Change **src/app/admin/AdminShell.js** — Add the refunds and complaints navigation link.
- Change **src/app/admin/bespoke/page.js** — Fix effect initialization so the repository lint check passes.
- Create **src/app/admin/customer-requests/page.js** — Expose the matching admin request-review page.
- Change **src/app/admin/students/page.js** — Show sponsorship details and route admission changes through the server.
- Create **src/app/api/account/orders/route.js** — Return paginated paid orders owned by the verified account.
- Create **src/app/api/account/requests/route.js** — Validate purchased-product ownership, create deduplicated requests, notify recipients, and list owned requests.
- Create **src/app/api/account/route.js** — Reauthenticate password changes and deactivation, enforce attempt limits, and revoke sessions.
- Create **src/app/api/admin/customer-requests/route.js** — Require active admin access, return contact details, enforce status transitions and stale-edit checks, and notify customers.
- Create **src/app/api/admin/students/route.js** — Perform server-only admission changes and dispatch the single claimed acceptance email.
- Create **src/app/api/registrations/route.js** — Validate registration and owned passport upload, insert atomically, and notify the admin.
- Change **src/app/course/fashionschool.css** — Style the conditional sponsoring-organization field.
- Change **src/app/course/page.js** — Add sponsorship validation and conditional input, submit through the API, and show the exact completion message.
- Change **src/app/course/registration/[id]/page.js** — Display sponsorship and the shared completion message.
- Change **src/app/curriculum/page.js** — Fix reduced-motion counter initialization for clean lint.
- Change **src/app/privacy/page.js** — Document sponsorship, account order matching, support requests, and related service emails.
- Change **src/app/terms/page.js** — Describe the new account, registration, repurchase, refund, and complaint workflows.
- Change **src/components/CookieConsent.js** — Fix initial browser-storage synchronization for clean lint.
- Change **src/components/Navbar.js** — Link the avatar to /account and add the mobile drawer logo and keyboard navigation.
- Change **src/components/Navbar.module.css** — Style the mobile logo, hide closed drawer links, and preserve avatar dimensions.
- Create **src/components/SupportRequests.js** — Share the paginated customer/admin request list and administrative review form.
- Create **src/lib/accountContracts.mjs** — Define strict request, account-action, review, and cart-limit contracts.
- Create **src/lib/accountServer.js** — Authenticate active accounts, validate origins and bodies, and link owned guest orders by verified email.
- Create **src/lib/clientApi.js** — Send authenticated client API requests with the current bearer token.
- Change **src/lib/orderEmails.mjs** — Share the branded email helpers and the sole administrator recipient constant.
- Create **src/lib/registration.mjs** — Reuse the existing shop address; validate sponsorship and numeric student application IDs.
- Create **src/lib/registrationEmails.mjs** — Build escaped admin-registration and student-acceptance emails.
- Create **src/lib/supportEmails.mjs** — Build escaped customer confirmations, admin alerts, and status emails.
- Create **supabase/migrations/20261017112938_account_registration_support.sql** — Add sponsorship, atomic admission/registration functions, account order ownership, support tables/RLS, and server rate limits.
- Change **src/app/api/bespoke/submit/route.ts** — Route bespoke administrator notifications to the same fixed recipient.
- Change **scripts/order-management.test.mjs** — Verify that obsolete recipient settings cannot change the designated admin recipient.
- Create **src/lib/checkoutServer.js** — Generate a random personal receipt token and persist only its hash.
- Create **src/lib/orderManagement.mjs** — Expose the customer receipt timestamp in protected order responses.
- Create **src/app/api/bachs/webhook/route.js** — Claim a receipt-confirmation token atomically with successful payment and pass the raw token only to the customer email builder.
- Create **src/app/admin/orders/page.js** — Show customer-confirmed receipt and the confirmation time in the admin order dashboard.
- Create **src/app/api/checkout/orders/[id]/received/route.js** — Validate personal links and explicit consent, and record receipt only once for paid orders.
- Create **src/app/order-received/[id]/page.js** — Render the private, noindex confirmation page with no-referrer metadata.
- Create **src/app/order-received/[id]/ReceiptConfirmation.js** — Ask the customer to explicitly confirm receipt of every ordered product, including guest buyers.
- Create **supabase/migrations/20261017122424_customer_order_receipt.sql** — Add the protected receipt-token hash and customer receipt timestamp; already applied to Supabase.
- Create **docs/account-registration-support-handoff.md** — this complete copy/paste handoff and deployment checklist.

The small changes in the bespoke dashboard, curriculum counter, cookie-consent initialization, and existing student-loading effects resolve baseline lint failures. Guest checkout, payment verification, webhook signatures, Google sign-in, and navbar dimensions retain their existing behavior. The ready-to-wear skeleton, scroll-motion, policy bullet, and New Year copyright changes already present in the project are retained.

## 2. SQL migrations, in order

Applied successfully on 17 October 2026 to **Elegant Style Fashion** (project yrzvqvdrahfmmoprgukd). Supabase recorded migrations **20261017112938_account_registration_support** and **20261017122424_customer_order_receipt**; the local filenames match those versions. The required earlier migrations were already present. Do not reapply it to that project as a deployment step. The complete SQL below is retained for review and other environments. Historical applications retain null sponsorship, and previously accepted rows are claimed to prevent surprise emails. The acceptance function uses BIGINT because the live students.id column is an identity BIGINT.

Registration INSERT/UPDATE now runs through authenticated server routes. Direct browser writes to students are revoked so admission email claims cannot be bypassed by the old UI. The support tables permit authenticated customers to insert/read their own requests and active admins to read/update statuses/responses. No client can choose order ownership, change payment data, or promote a request to approved. A restrictive students read policy also constrains older broad read policies.

```sql
-- supabase/migrations/20261017112938_account_registration_support.sql
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

-- supabase/migrations/20261017122424_customer_order_receipt.sql
BEGIN;

ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS receipt_confirmation_hash TEXT,
  ADD COLUMN IF NOT EXISTS customer_received_at TIMESTAMPTZ;
ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_receipt_confirmation_hash_check;
ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_receipt_confirmation_hash_check
  CHECK (receipt_confirmation_hash IS NULL OR receipt_confirmation_hash ~ '^[a-f0-9]{64}$');
ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_customer_received_check;
ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_customer_received_check
  CHECK (customer_received_at IS NULL OR (payment_status = 'paid' AND receipt_confirmation_hash IS NOT NULL));

COMMENT ON COLUMN public.shop_orders.receipt_confirmation_hash IS 'SHA-256 hash of the personal receipt-confirmation token. The raw token is only included in the customer payment email.';
COMMENT ON COLUMN public.shop_orders.customer_received_at IS 'When the customer explicitly confirmed receipt of every product in this order; separate from staff fulfilment status.';

-- Existing server-only writes and restricted customer SELECT grants remain in force.
REVOKE UPDATE (receipt_confirmation_hash, customer_received_at) ON public.shop_orders FROM PUBLIC, anon, authenticated;
REVOKE SELECT (receipt_confirmation_hash, customer_received_at) ON public.shop_orders FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
```

## 3. Full source files

Paths below are relative to the project root. Both migrations appear once, in the ordered SQL block above. The handoff itself and generated QA screenshots are not deployment source files.

### .env.example

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL="Elegant Style <requests@elegantstyle.com.ng>"
# Admin alerts use elegantyoufashion18@gmail.com; the academy reuses the existing shop address.
# Optional: content value from the Google Search Console HTML verification tag.
GOOGLE_SITE_VERIFICATION=
# Bachs checkout: server-only secrets. Start with a sandbox key.
BACHS_API_KEY=
BACHS_WEBHOOK_SECRET=
```

### scripts/account-registration-db.test.mjs

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Optional isolated PostgreSQL runtime; never connects to a Supabase project.
// Set PGLITE_MODULE_PATH to @electric-sql/pglite/dist/index.js to run this suite.
const modulePath = process.env.PGLITE_MODULE_PATH;
const migration = await readFile(new URL("../supabase/migrations/20261017112938_account_registration_support.sql", import.meta.url), "utf8");
const receiptMigration = await readFile(new URL("../supabase/migrations/20261017122424_customer_order_receipt.sql", import.meta.url), "utf8");
const ids = {
  alice: "11111111-1111-4111-8111-111111111111", bob: "22222222-2222-4222-8222-222222222222",
  admin: "33333333-3333-4333-8333-333333333333", product: "44444444-4444-4444-8444-444444444444",
  order: "55555555-5555-4555-8555-555555555555", otherOrder: "66666666-6666-4666-8666-666666666666",
  unpaid: "77777777-7777-4777-8777-777777777777", refund: "88888888-8888-4888-8888-888888888888",
  legacy: 99, complaint: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

test("account migration and adversarial row security", { skip: !modulePath && "Set PGLITE_MODULE_PATH to run isolated SQL checks." }, async (t) => {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
      CREATE TABLE public.users (id uuid PRIMARY KEY REFERENCES auth.users(id), email text, is_admin boolean DEFAULT false, is_active boolean DEFAULT true);
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
      GRANT ALL ON public.users TO service_role;
      CREATE FUNCTION public.is_admin_user() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
        AS $$ SELECT coalesce((SELECT is_admin FROM public.users WHERE id = auth.uid()), false) $$;
      CREATE POLICY profile_read ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
      CREATE POLICY profile_update ON public.users FOR UPDATE TO authenticated USING (id = auth.uid())
        WITH CHECK (id = auth.uid() AND coalesce(is_admin, false) = public.is_admin_user());
      CREATE TABLE public.students (
        id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, user_id uuid REFERENCES auth.users(id), surname text, first_name text, middle_name text,
        gender text, date_of_birth date, age integer, nationality text, marital_status text, state_of_origin text,
        address text, telephone text, email text, chosen_programme text, passport_photo text,
        status text DEFAULT 'pending', accepted boolean DEFAULT false, created_at timestamptz DEFAULT now()
      );
      ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON public.students TO anon, authenticated, service_role;
      CREATE POLICY legacy_broad_read ON public.students FOR SELECT TO authenticated USING (true);
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/20261016070952_bachs_checkout_orders.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/20261016122711_order_emails_admin_management.sql", import.meta.url), "utf8"));
    for (const [name, id] of Object.entries({ alice: ids.alice, bob: ids.bob, admin: ids.admin })) {
      await db.query("INSERT INTO auth.users VALUES ($1)", [id]);
      await db.query("INSERT INTO public.users (id,email,is_admin) VALUES ($1,$2,$3)", [id, `${name}@example.invalid`, name === "admin"]);
    }
    await db.query("INSERT INTO public.students (id,user_id,status,accepted) VALUES ($1,$2,'accepted',true)", [ids.legacy, ids.bob]);
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(receiptMigration);
    await db.exec(receiptMigration);

    async function asRole(role, userId, operation) {
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [userId || ""]);
      await db.exec(`SET ROLE ${role}`);
      try { return await operation(); } finally { await db.exec("RESET ROLE"); }
    }
    async function scalar(sql, params = []) { return Object.values((await db.query(sql, params)).rows[0])[0]; }
    const application = {
      surname: "Applicant", first_name: "Alice", middle_name: "", gender: "Female", date_of_birth: "2000-01-01", age: 26,
      nationality: "Nigerian", marital_status: "Single", state_of_origin: "Bayelsa", address: "Test address", telephone: "08000000000",
      email: "alice@example.invalid", chosen_programme: "3 Months Programme", passport_photo: "https://example.invalid/photo.jpg",
      sponsorship: "Scholarship", sponsor_organization: "Training Trust", agreed: true,
    };
    let studentId;
    await t.test("legacy rows survive and service-only registration deduplicates", async () => {
      assert.equal(await scalar("SELECT sponsorship FROM public.students WHERE id=$1", [ids.legacy]), null);
      assert.equal(await scalar("SELECT acceptance_email_claimed_at IS NOT NULL FROM public.students WHERE id=$1", [ids.legacy]), true);
      await asRole("authenticated", ids.alice, async () => {
        await assert.rejects(db.query("SELECT public.submit_student_application($1,$2::jsonb)", [ids.alice, JSON.stringify(application)]), { code: "42501" });
        await assert.rejects(db.query("INSERT INTO public.students (user_id) VALUES ($1)", [ids.alice]), { code: "42501" });
      });
      await asRole("service_role", "", async () => {
        studentId = (await scalar("SELECT public.submit_student_application($1,$2::jsonb)", [ids.alice, JSON.stringify(application)])).id;
        await assert.rejects(db.query("SELECT public.submit_student_application($1,$2::jsonb)", [ids.alice, JSON.stringify(application)]), { code: "23505" });
      });
      await assert.rejects(db.query("UPDATE public.students SET sponsorship=NULL,sponsor_organization='Hidden sponsor' WHERE id=$1", [studentId]), { code: "23514" });
      await assert.rejects(db.query("UPDATE public.students SET sponsor_organization='' WHERE id=$1", [studentId]), { code: "23514" });
    });
    await t.test("acceptance claims exactly one attempt, including reacceptance", async () => {
      await asRole("authenticated", ids.alice, () => assert.rejects(db.query("SELECT public.review_student_application($1,'accepted')", [studentId]), { code: "42501" }));
      await asRole("service_role", "", async () => {
        const review = (status) => scalar("SELECT public.review_student_application($1,$2)", [studentId, status]);
        assert.equal((await review("accepted")).send_acceptance, true);
        assert.equal((await review("accepted")).send_acceptance, false);
        await review("declined");
        assert.equal((await review("accepted")).send_acceptance, false);
        assert.equal((await scalar("SELECT public.review_student_application($1,'accepted')", [ids.legacy])).send_acceptance, false);
      });
    });
    await t.test("student reads override old broad policies", async () => {
      await asRole("authenticated", ids.alice, async () => assert.equal(await scalar("SELECT count(*)::int FROM public.students"), 1));
      await asRole("authenticated", ids.admin, async () => assert.equal(await scalar("SELECT count(*)::int FROM public.students"), 2));
      await asRole("anon", "", () => assert.rejects(db.query("SELECT * FROM public.students"), { code: "42501" }));
    });
    for (const [id, owner, paid] of [[ids.order, ids.alice, true], [ids.otherOrder, ids.bob, true], [ids.unpaid, ids.alice, false]]) {
      await db.query(`INSERT INTO public.shop_orders
        (id,user_id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,receipt_hash,request_fingerprint,payment_status,paid_at,payment_id,paid_event_id)
        VALUES ($1,$2,'Customer','test@example.invalid','08000000000','{"method":"pickup"}',$3::jsonb,10000,0,10000,repeat('a',64),repeat('b',64),$4,$5,$6,$7)`,
      [id, owner, JSON.stringify([{ productId: ids.product, name: "Purchased dress", quantity: 1, unitAmountMinor: 10000, lineAmountMinor: 10000 }]), paid ? "paid" : "pending", paid ? new Date() : null, paid ? `payment-${id}` : null, paid ? `event-${id}` : null]);
    }
    await t.test("customer receipt columns are protected and require a paid order", async () => {
      await assert.rejects(db.query("UPDATE public.shop_orders SET receipt_confirmation_hash='invalid' WHERE id=$1", [ids.order]), { code: "23514" });
      await assert.rejects(db.query("UPDATE public.shop_orders SET customer_received_at=now() WHERE id=$1", [ids.order]), { code: "23514" });
      await assert.rejects(db.query("UPDATE public.shop_orders SET receipt_confirmation_hash=repeat('c',64),customer_received_at=now() WHERE id=$1", [ids.unpaid]), { code: "23514" });
      await db.query("UPDATE public.shop_orders SET receipt_confirmation_hash=repeat('c',64),customer_received_at=now() WHERE id=$1", [ids.order]);
      assert.equal(await scalar("SELECT customer_received_at IS NOT NULL FROM public.shop_orders WHERE id=$1", [ids.order]), true);
      await asRole("authenticated", ids.alice, async () => {
        await assert.rejects(db.query("SELECT receipt_confirmation_hash FROM public.shop_orders"), { code: "42501" });
        await assert.rejects(db.query("UPDATE public.shop_orders SET customer_received_at=now() WHERE id=$1", [ids.order]), { code: "42501" });
      });
    });
    await t.test("customers see only owned paid orders and cannot alter or claim them", async () => {
      await asRole("authenticated", ids.alice, async () => {
        assert.deepEqual((await db.query("SELECT id FROM public.shop_orders")).rows.map((r) => r.id), [ids.order]);
        await assert.rejects(db.query("SELECT receipt_hash FROM public.shop_orders"), { code: "42501" });
        await assert.rejects(db.query("UPDATE public.shop_orders SET user_id=$1 WHERE id=$2", [ids.alice, ids.otherOrder]), { code: "42501" });
      });
    });
    const insert = (table, userId, orderId, id, received = false, product = ids.product) => db.query(
      `INSERT INTO public.${table} (id,user_id,order_id,product_id,description,received_confirmed) VALUES ($1,$2,$3,$4,'The product needs review',$5) RETURNING id,product_name,status`, [id, userId, orderId, product, received]);
    await t.test("RLS permits own requests while rejecting forged ownership and unpaid products", async () => {
      await asRole("authenticated", ids.alice, async () => {
        const own = (await insert("refund_requests", ids.alice, ids.order, ids.refund)).rows[0];
        assert.equal(own.product_name, "Purchased dress"); assert.equal(own.status, "pending");
        await assert.rejects(insert("refund_requests", ids.bob, ids.otherOrder, crypto.randomUUID()));
        await assert.rejects(insert("refund_requests", ids.alice, ids.otherOrder, crypto.randomUUID()));
        await assert.rejects(insert("refund_requests", ids.alice, ids.unpaid, crypto.randomUUID()));
        await assert.rejects(insert("refund_requests", ids.alice, ids.order, crypto.randomUUID(), false, ids.admin));
        await assert.rejects(insert("refund_requests", ids.alice, ids.order, crypto.randomUUID()), { code: "23505" });
        await assert.rejects(insert("product_complaints", ids.alice, ids.order, crypto.randomUUID(), false), { code: "42501" });
        await insert("product_complaints", ids.alice, ids.order, ids.complaint, true);
        assert.equal((await db.query("UPDATE public.refund_requests SET status='approved' RETURNING id")).rows.length, 0);
        await assert.rejects(db.query("UPDATE public.refund_requests SET description='Rewritten description'"), { code: "42501" });
      });
      await asRole("authenticated", ids.bob, async () => {
        assert.equal(await scalar("SELECT count(*)::int FROM public.refund_requests"), 0);
        assert.equal(await scalar("SELECT count(*)::int FROM public.product_complaints"), 0);
      });
      await asRole("anon", "", () => assert.rejects(db.query("SELECT * FROM public.refund_requests"), { code: "42501" }));
    });
    await t.test("admins can review, with immutable details and forward-only status transitions", async () => {
      await asRole("authenticated", ids.admin, async () => {
        assert.equal(await scalar("SELECT count(*)::int FROM public.refund_requests"), 1);
        await db.query("UPDATE public.refund_requests SET status='approved',response='Please contact the shop' WHERE id=$1", [ids.refund]);
        assert.equal(await scalar("SELECT reviewed_by FROM public.refund_requests WHERE id=$1", [ids.refund]), ids.admin);
        await assert.rejects(db.query("UPDATE public.refund_requests SET status='pending' WHERE id=$1", [ids.refund]), { code: "23514" });
        await db.query("UPDATE public.product_complaints SET status='in_review' WHERE id=$1", [ids.complaint]);
        await db.query("UPDATE public.product_complaints SET status='resolved' WHERE id=$1", [ids.complaint]);
        await assert.rejects(db.query("DELETE FROM public.refund_requests WHERE id=$1", [ids.refund]), { code: "42501" });
      });
      await assert.rejects(db.query("UPDATE public.refund_requests SET user_id=$1 WHERE id=$2", [ids.bob, ids.refund]), { code: "23514" });
    });
    await t.test("inactive accounts cannot read, submit, or reactivate themselves", async () => {
      await db.query("UPDATE public.users SET is_active=false WHERE id=$1", [ids.alice]);
      await asRole("authenticated", ids.alice, async () => {
        assert.equal(await scalar("SELECT count(*)::int FROM public.students"), 0);
        assert.equal(await scalar("SELECT count(*)::int FROM public.refund_requests"), 0);
        assert.equal(await scalar("SELECT count(*)::int FROM public.shop_orders"), 0);
        assert.equal((await db.query("UPDATE public.users SET is_active=true WHERE id=$1 RETURNING id", [ids.alice])).rows.length, 0);
        await assert.rejects(insert("product_complaints", ids.alice, ids.order, crypto.randomUUID(), true));
      });
    });
    await t.test("rate limits are atomic, bounded, and unavailable to client roles", async () => {
      await asRole("authenticated", ids.bob, () => assert.rejects(db.query("SELECT public.consume_account_action_limit($1,'password')", [ids.bob]), { code: "42501" }));
      await asRole("service_role", "", async () => {
        for (let attempt = 1; attempt <= 6; attempt++) assert.equal(await scalar("SELECT public.consume_account_action_limit($1,'password')", [ids.bob]), attempt <= 5);
        for (let attempt = 1; attempt <= 11; attempt++) assert.equal(await scalar("SELECT public.consume_account_action_limit($1,'refund')", [ids.bob]), attempt <= 10);
      });
    });
  } finally { await db.close(); }
});
```

### scripts/account-registration.test.mjs

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { ACADEMY_ADDRESS, REGISTRATION_COMPLETE_MESSAGE, registrationSchema, studentReviewSchema } from "../src/lib/registration.mjs";
import { accountActionSchema, requestSchema, requestReviewSchema, repurchaseCart } from "../src/lib/accountContracts.mjs";
import { notifyRegistration, registrationAdminEmail, registrationAcceptanceEmail } from "../src/lib/registrationEmails.mjs";
import { notifySupportRequest, supportEmail } from "../src/lib/supportEmails.mjs";
import { sendServiceEmail } from "../src/lib/orderEmails.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const application = {
  surname: "Applicant", first_name: "Ada", middle_name: "", gender: "Female", date_of_birth: "2000-01-01", age: "26",
  nationality: "Nigerian", marital_status: "Single", state_of_origin: "Bayelsa", address: "Test address", telephone: "08000000000",
  email: "ADA@example.com", chosen_programme: "3 Months Programme", passport_photo: "https://example.invalid/passport.jpg",
  sponsorship: "Self sponsored", sponsor_organization: "", agreed: true,
};
const request = { id, kind: "refund", orderId: id, productId: id, description: "The seam has come undone." };

test("registration requires a valid sponsorship and scholarship organization", () => {
  assert.equal(registrationSchema.safeParse({ ...application, sponsorship: undefined }).success, false);
  assert.equal(registrationSchema.safeParse({ ...application, sponsorship: "Other" }).success, false);
  assert.equal(registrationSchema.safeParse({ ...application, sponsorship: "Scholarship", sponsor_organization: " " }).success, false);
  const scholarship = registrationSchema.parse({ ...application, sponsorship: "Scholarship", sponsor_organization: " Training Trust " });
  assert.equal(scholarship.sponsor_organization, "Training Trust");
  assert.equal(scholarship.email, "ada@example.com");
  assert.equal(scholarship.age, 26);
  for (const sponsorship of ["Self sponsored", "Guardian"]) {
    assert.equal(registrationSchema.parse({ ...application, sponsorship, sponsor_organization: "Stale hidden field" }).sponsor_organization, null);
  }
});

test("registration rejects invalid programme, declaration, dates, and injected server fields", () => {
  for (const invalid of [{ chosen_programme: "Free course" }, { agreed: false }, { date_of_birth: "2999-01-01" }, { date_of_birth: "2000-02-31" }, { status: "accepted" }, { user_id: id }, { email: "invalid" }, { telephone: "not-a-phone" }]) {
    assert.equal(registrationSchema.safeParse({ ...application, ...invalid }).success, false, JSON.stringify(invalid));
  }
  assert.equal(studentReviewSchema.parse({ id: 1, status: "accepted" }).id, "1");
  assert.equal(studentReviewSchema.parse({ id: "9223372036854775807", status: "accepted" }).id, "9223372036854775807");
  for (const invalidId of [id, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "9223372036854775808"]) {
    assert.equal(studentReviewSchema.safeParse({ id: invalidId, status: "accepted" }).success, false);
  }
  assert.equal(studentReviewSchema.safeParse({ id: 1, status: "admin" }).success, false);
});

test("the registration completion text retains the exact requested wording and line break", () => {
  assert.equal(ACADEMY_ADDRESS, "Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State");
  assert.equal(REGISTRATION_COMPLETE_MESSAGE, `Registration completed visit ${ACADEMY_ADDRESS} from Mon-Fri, 8am-5pm, for PAYMENT DETAILS, ORIENTAION and PHYSICAL VERIFICATION\nThank You for choosing Elegant Style Fashion Academy`);
});

test("registration and support alerts use only the designated admin while customer mail keeps its recipient", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.RESEND_API_KEY;
  const previousSender = process.env.RESEND_FROM_EMAIL;
  const calls = [];
  try {
    process.env.RESEND_API_KEY = "unit-test-only";
    process.env.RESEND_FROM_EMAIL = "test@example.invalid";
    globalThis.fetch = async (url, options) => { calls.push(JSON.parse(options.body)); return { ok: true }; };
    await notifyRegistration({ ...application, id: 1 });
    await notifySupportRequest({ id, order_id: id, product_name: "Dress", description: request.description, status: "pending" }, "refund", "customer@example.invalid");
    assert.deepEqual(calls.map((message) => message.to[0]), ["elegantyoufashion18@gmail.com", "customer@example.invalid", "elegantyoufashion18@gmail.com"]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousSender === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = previousSender;
  }
});

test("support requests validate ownership references, lengths, and receipt confirmation", () => {
  assert.equal(requestSchema.safeParse(request).success, true);
  assert.equal(requestSchema.safeParse({ ...request, kind: "complaint" }).success, false);
  assert.equal(requestSchema.safeParse({ ...request, kind: "complaint", received: true }).success, true);
  for (const invalid of [{ description: "Short" }, { description: "a".repeat(2001) }, { status: "approved" }, { user_id: id }, { productId: "invalid" }]) {
    assert.equal(requestSchema.safeParse({ ...request, ...invalid }).success, false);
  }
});

test("request review only accepts forward status changes", () => {
  for (const [kind, expectedStatus, status] of [["refund", "pending", "approved"], ["refund", "pending", "rejected"], ["complaint", "pending", "in_review"], ["complaint", "in_review", "resolved"]]) {
    assert.equal(requestReviewSchema.safeParse({ id, kind, expectedStatus, status }).success, true);
  }
  for (const [kind, expectedStatus, status] of [["refund", "approved", "pending"], ["refund", "pending", "resolved"], ["complaint", "resolved", "in_review"], ["complaint", "in_review", "pending"]]) {
    assert.equal(requestReviewSchema.safeParse({ id, kind, expectedStatus, status }).success, false);
  }
});

test("account changes require password confirmation and enforce password bounds", () => {
  assert.equal(accountActionSchema.safeParse({ action: "deactivate", currentPassword: "current", confirmed: true }).success, true);
  assert.equal(accountActionSchema.safeParse({ action: "deactivate", currentPassword: "current", confirmed: false }).success, false);
  assert.equal(accountActionSchema.safeParse({ action: "password", currentPassword: "current", newPassword: "short" }).success, false);
  assert.equal(accountActionSchema.safeParse({ action: "password", currentPassword: "current", newPassword: "long-password" }).success, true);
});

test("repurchase adds one item without changing existing cart or exceeding checkout limits", () => {
  const cart = [{ id, name: "Existing dress" }];
  assert.deepEqual(repurchaseCart(cart, id), [...cart, { id }]);
  assert.equal(cart.length, 1);
  assert.throws(() => repurchaseCart(Array.from({ length: 10 }, () => ({ id })), id), /10/);
  assert.throws(() => repurchaseCart(Array.from({ length: 20 }, (_, i) => ({ id: String(i) })), id), /20/);
});

test("registration emails include student details and escape user-controlled HTML", () => {
  const student = { ...registrationSchema.parse(application), id, surname: '<img src=x onerror="alert(1)">', sponsorship: "Scholarship", sponsor_organization: "Trust <script>bad()</script>" };
  const admin = registrationAdminEmail(student, "admin@example.com");
  const accepted = registrationAcceptanceEmail(student);
  for (const message of [admin, accepted]) {
    assert.ok(message.html.includes("&lt;"));
    assert.ok(!message.html.includes("<script>"));
    assert.ok(!message.html.includes("<img src=x"));
    assert.ok(message.text.includes(REGISTRATION_COMPLETE_MESSAGE));
    assert.ok(message.idempotencyKey.includes(id));
  }
  for (const value of [student.email, student.telephone, student.date_of_birth, student.address, student.chosen_programme, student.sponsorship, student.sponsor_organization]) assert.ok(admin.text.includes(String(value)));
});

test("support email references, reason, and shop response are escaped and idempotent", () => {
  const row = { id, order_id: id, product_name: "Dress <b>test</b>", description: "<script>request</script>", status: "approved", response: '<a href="bad">response</a>' };
  const email = supportEmail(row, "refund", "customer@example.com", "customer", true);
  assert.ok(!email.html.includes("<script>"));
  assert.ok(email.html.includes("&lt;script&gt;"));
  assert.ok(email.text.includes("does not itself transfer funds"));
  assert.equal(email.idempotencyKey, `support/refund/${id}/approved/customer`);
});

test("service mail uses server configuration, idempotency, and a sanitized subject", async () => {
  let called;
  assert.equal(await sendServiceEmail({ to: "student@example.com", subject: "Hello\r\nInjected", text: "Body", html: "<p>Body</p>", idempotencyKey: "test/key" }, {
    env: { RESEND_API_KEY: "test-only", RESEND_FROM_EMAIL: "Elegant Style <test@example.com>" },
    fetchImpl: async (url, options) => { called = { url, options }; return { ok: true }; },
  }), true);
  assert.equal(called.url, "https://api.resend.com/emails");
  assert.equal(called.options.headers["Idempotency-Key"], "test/key");
  assert.equal(JSON.parse(called.options.body).subject, "Hello  Injected");
  assert.deepEqual(JSON.parse(called.options.body).to, ["student@example.com"]);
});

test("email configuration, provider failures, and network failures are logged without throwing", async () => {
  const errors = [];
  const message = { to: "student@example.com", subject: "Hello", html: "<p>Body</p>", idempotencyKey: "test/failure" };
  const logger = { error: (...parts) => errors.push(parts) };
  assert.equal(await sendServiceEmail(message, { env: {}, logger }), false);
  const env = { RESEND_API_KEY: "test-only", RESEND_FROM_EMAIL: "test@example.com" };
  assert.equal(await sendServiceEmail(message, { env, logger, fetchImpl: async () => ({ ok: false, status: 503 }) }), false);
  assert.equal(await sendServiceEmail(message, { env, logger, fetchImpl: async () => { throw new Error("Network unavailable"); } }), false);
  assert.equal(errors.length, 3);
});
```

### src/app/account/AccountShell.js

```javascript
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import styles from "../admin/adminShell.module.css";

const sections = [{ href: "/account", label: "Profile & account" }, { href: "/account/orders", label: "My orders" }, { href: "/account/requests", label: "Refunds & complaints" }];

export default function AccountShell({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace("/sign-in"); }, [user, loading, router]);
  if (loading || !user) return <div className={styles.centerBox} role="status">{loading ? "Loading your account…" : "Redirecting to sign in…"}</div>;
  return <div className={styles.shell}><div className={styles.inner}>
    <nav className={styles.sidebar} aria-label="Account sections">
      <span className={styles.sideTitle}>My account</span>
      {sections.map((section) => <Link key={section.href} href={section.href} className={`${styles.sideLink} ${pathname === section.href ? styles.sideLinkActive : ""}`} aria-current={pathname === section.href ? "page" : undefined}>{section.label}</Link>)}
      {isAdmin && <><div className={styles.sideDivider} /><Link className={styles.sideLink} href="/admin">Admin dashboard</Link></>}
      <div className={styles.sideDivider} /><Link className={styles.sideLink} href="/ready-to-wear">Continue shopping</Link>
    </nav>
    <main className={styles.content}>{children}</main>
  </div></div>;
}
```

### src/app/account/account.module.css

```css
.stack { display: grid; gap: 20px; }
.form { display: grid; gap: 16px; max-width: 600px; }
.form label { display: grid; gap: 7px; font-weight: 600; }
.form input, .form textarea, .form select { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--white); color: var(--ink); font: inherit; }
.form textarea { min-height: 120px; resize: vertical; }
.form :is(input, textarea, select, button):focus-visible { outline: 2px solid var(--gold-deep); outline-offset: 3px; }
.form .check { display: flex; align-items: start; gap: 10px; font-weight: 400; }
.check input { width: 18px; min-height: 18px; height: 18px; flex-shrink: 0; margin-top: 4px; }
.success { padding: 14px; background: var(--success-bg); color: var(--success); border-radius: 8px; }
.hint { color: var(--stone); font-size: 14px; }
.details { display: grid; gap: 12px; margin: 16px 0; overflow-wrap: anywhere; }
.details dt { color: var(--stone); font-size: 13px; }
.details dd { margin: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
.item { padding: 16px 0; border-top: 1px solid var(--line); }
.item h3 { font-size: 17px; margin-bottom: 5px; }
.reference { overflow-wrap: anywhere; font-size: 13px; color: var(--stone); }
.message { white-space: pre-wrap; overflow-wrap: anywhere; margin: 12px 0; }
.panel { margin-top: 16px; padding: 20px; border: 1px solid var(--line); border-radius: 10px; }
.pagination { display: flex; gap: 14px; align-items: center; justify-content: center; margin-top: 20px; }
@media (max-width: 600px) { .panel { padding: 14px; } .actions > button { flex: 1 1 auto; } }
```

### src/app/account/layout.js

```javascript
import AccountShell from "./AccountShell";

export const metadata = { title: "My account", robots: { index: false, follow: false } };
export default function AccountLayout({ children }) { return <AccountShell>{children}</AccountShell>; }
```

### src/app/account/orders/page.js

```javascript
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/clientApi";
import { CART_KEY, readCart } from "@/lib/checkout.mjs";
import { repurchaseCart } from "@/lib/accountContracts.mjs";
import { supabase } from "@/lib/supabaseClient";
import styles from "../../admin/adminShell.module.css";
import account from "../account.module.css";

const money = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

export default function AccountOrders() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [description, setDescription] = useState("");
  const [received, setReceived] = useState(false);
  const requestId = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch(`/api/account/orders?page=${page}`, { signal: controller.signal }).then((result) => {
      setOrders(result.orders); setTotal(result.total); setError("");
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page]);

  async function repurchase(item) {
    setError(""); setMessage(""); setBusy(true);
    try {
      const { data, error: productError } = await supabase.from("products").select("id").eq("id", item.productId).eq("is_active", true).maybeSingle();
      if (productError) throw new Error("Unable to check availability. Try again.");
      if (!data) throw new Error("This product is no longer available.");
      localStorage.setItem(CART_KEY, JSON.stringify(repurchaseCart(readCart(), item.productId)));
      setMessage(`${item.name} added to your cart. Current prices apply at checkout.`);
    } catch (err) { setError(err.message || "Your cart could not be saved."); }
    finally { setBusy(false); }
  }

  function openRequest(kind, order, item) {
    setSelected({ kind, order, item }); setDescription(""); setReceived(false); setError(""); setMessage(""); requestId.current = crypto.randomUUID();
  }

  async function submitRequest(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await authenticatedFetch("/api/account/requests", { method: "POST", body: JSON.stringify({ id: requestId.current, kind: selected.kind, orderId: selected.order.id, productId: selected.item.productId, description, received }) });
      setMessage(result.duplicate ? "A request for this product has already been submitted. View it in Refunds & complaints." : "Your request has been saved. You can follow its progress in Refunds & complaints.");
      setSelected(null);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <>
    <div className={styles.pageHeader}><div><h1 className={styles.pageTitle}>My orders</h1><p className={styles.pageSub}>Your paid ready-to-wear purchases and order progress.</p></div></div>
    <p className={account.hint}>Orders are matched to your verified account email. Guest checkout still works. <Link href="/account/requests">View refunds & complaints</Link>.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={account.success} role="status">{message} <Link href="/checkout">Go to checkout</Link></p>}
    {loading ? <p role="status">Loading your orders…</p> : !orders.length ? <p className={styles.empty}>No paid orders match this account email yet. <Link href="/ready-to-wear">Visit the shop</Link>.</p> : <div className={account.stack}>
      {orders.map((order) => <article className={styles.card} key={order.id}>
        <h2 className={styles.cardTitle}>{new Date(order.created_at).toLocaleDateString("en-GB")}: {money(order.total_minor)}</h2>
        <p className={account.reference}>Order {order.id}</p><p>Payment: {order.payment_status} · Order progress: {order.fulfillment_status}</p>
        {order.customer_received_at && <p className={account.success}>You confirmed receipt on {new Date(order.customer_received_at).toLocaleString("en-GB")}.</p>}
        {order.items.map((item) => <div className={account.item} key={item.productId}><h3>{item.name}</h3><p>{item.quantity} × {money(item.unitAmountMinor)} · {money(item.lineAmountMinor)}</p>
          <div className={account.actions}><button className={styles.btn} type="button" disabled={busy} onClick={() => repurchase(item)}>Buy again</button><button className={styles.btn} type="button" disabled={busy} onClick={() => openRequest("refund", order, item)}>Request refund</button><button className={styles.btn} type="button" disabled={busy} onClick={() => openRequest("complaint", order, item)}>Make a complaint</button></div>
        </div>)}
      </article>)}
    </div>}
    {selected && <section className={account.panel} aria-labelledby="request-heading"><h2 id="request-heading">{selected.kind === "refund" ? "Request a refund" : "Complain about a received product"}</h2><p>{selected.item.name}</p>
      <form className={account.form} onSubmit={submitRequest}>
        <label>{selected.kind === "refund" ? "Reason for the refund request" : "Describe your complaint"}<textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={2000} required disabled={busy} /></label>
        {selected.kind === "complaint" && <label className={account.check}><input type="checkbox" checked={received} onChange={(event) => setReceived(event.target.checked)} required disabled={busy} />I confirm I received this product.</label>}
        {selected.kind === "refund" && <p className={account.hint}>The shop reviews each request. Approval does not itself issue a payment refund; the shop arranges any refund through Bachs.</p>}
        <div className={account.actions}><button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? "Submitting…" : "Submit request"}</button><button type="button" className={styles.btn} disabled={busy} onClick={() => setSelected(null)}>Cancel</button></div>
      </form>
    </section>}
    {total > 20 && <nav className={account.pagination} aria-label="Order pages"><button className={styles.btn} disabled={page === 1 || loading} onClick={() => { setPage(page - 1); setLoading(true); }}>Previous</button><span>{page} / {Math.ceil(total / 20)}</span><button className={styles.btn} disabled={page * 20 >= total || loading} onClick={() => { setPage(page + 1); setLoading(true); }}>Next</button></nav>}
  </>;
}
```

### src/app/account/page.js

```javascript
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { authenticatedFetch } from "@/lib/clientApi";
import styles from "../admin/adminShell.module.css";
import account from "./account.module.css";

export default function Account() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [deactivating, setDeactivating] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function changePassword(event) {
    event.preventDefault();
    setError(""); setMessage("");
    if (passwords.next !== passwords.confirm) { setError("The new passwords do not match."); return; }
    setBusy(true);
    try {
      const result = await authenticatedFetch("/api/account", { method: "POST", body: JSON.stringify({ action: "password", currentPassword: passwords.current, newPassword: passwords.next }) });
      setPasswords({ current: "", next: "", confirm: "" }); setMessage(result.message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function deactivate(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await authenticatedFetch("/api/account", { method: "POST", body: JSON.stringify({ action: "deactivate", currentPassword: deactivatePassword, confirmed }) });
      logout();
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      router.replace("/sign-in?deactivated=true");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className={account.stack}>
    <div className={styles.pageHeader}><div><h1 className={styles.pageTitle}>Profile & account</h1><p className={styles.pageSub}>Your details, password, and account access.</p></div></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={account.success} role="status">{message}</p>}
    <section className={styles.card} aria-labelledby="profile-title"><h2 id="profile-title" className={styles.cardTitle}>Your profile</h2>
      <dl className={account.details}><div><dt>Username</dt><dd>{userData?.username || user?.email?.split("@")[0]}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Account status</dt><dd>Active</dd></div></dl>
      <p className={account.hint}>Order history uses the verified email address you supplied at checkout. Contact the shop if an order used another email.</p>
    </section>
    <section className={styles.card} aria-labelledby="password-title"><h2 id="password-title" className={styles.cardTitle}>Change password</h2>
      <p className={account.hint}>Use at least 8 characters. Need to set or recover a password? <Link href="/forgot-password">Reset your password</Link>.</p>
      <form className={account.form} onSubmit={changePassword}>
        <label>Current password<input type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} required maxLength={256} disabled={busy} /></label>
        <label>New password<input type="password" autoComplete="new-password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} required minLength={8} maxLength={128} disabled={busy} /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} required minLength={8} maxLength={128} disabled={busy} /></label>
        <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>{busy ? "Please wait…" : "Update password"}</button>
      </form>
    </section>
    <section className={styles.card} aria-labelledby="deactivate-title"><h2 id="deactivate-title" className={styles.cardTitle}>Deactivate account</h2>
      <p className={account.hint}>Deactivation disables sign-in and signs you out. Applications, orders, and support records are retained. Contact Elegant Style to request reactivation or data deletion.</p>
      {!deactivating ? <button className={`${styles.btn} ${styles.btnDanger}`} type="button" onClick={() => setDeactivating(true)}>Deactivate my account</button> : <form className={account.form} onSubmit={deactivate}>
        <label>Confirm your password<input type="password" autoComplete="current-password" value={deactivatePassword} onChange={(event) => setDeactivatePassword(event.target.value)} required disabled={busy} maxLength={256} /></label>
        <label className={account.check}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required disabled={busy} />I understand that I will be signed out and cannot sign in until the shop reactivates my account.</label>
        <div className={account.actions}><button className={`${styles.btn} ${styles.btnDanger}`} type="submit" disabled={busy || !confirmed}>Confirm deactivation</button><button className={styles.btn} type="button" disabled={busy} onClick={() => { setDeactivating(false); setDeactivatePassword(""); setConfirmed(false); }}>Keep my account</button></div>
      </form>}
    </section>
  </div>;
}
```

### src/app/account/requests/page.js

```javascript
import SupportRequests from "@/components/SupportRequests";
export default function AccountRequests() { return <SupportRequests />; }
```

### src/app/admin/AdminShell.js

```javascript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./adminShell.module.css";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Shop orders" },
  { href: "/admin/customer-requests", label: "Refunds & complaints" },
  { href: "/admin/students", label: "Student applications" },
  { href: "/admin/bespoke", label: "Bespoke requests" },
];

// Everything under /admin goes through this layout. Non-admins only ever see the
// "Access denied" message: no admin navigation and no admin page is rendered for them.
// The database enforces the same rule with row-level security, so this is a second lock.
export default function AdminLayout({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className={styles.centerBox} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden="true" />
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className={styles.centerBox}>
        <h1 className={styles.pageTitle}>Access denied</h1>
        <p className={styles.pageSub}>You need an administrator account to open this page.</p>
        <Link href="/" className={`${styles.btn} ${styles.btnPrimary}`}>
          Go to home
        </Link>
      </div>
    );
  }

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <nav className={styles.sidebar} aria-label="Admin sections">
          <span className={styles.sideTitle}>Admin</span>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.sideLink} ${isActive(item) ? styles.sideLinkActive : ""}`}
              aria-current={isActive(item) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <div className={styles.sideDivider} />
          <Link href="/" className={styles.sideLink}>
            Back to website
          </Link>
        </nav>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
```

### src/app/admin/bespoke/page.js

```javascript
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { consumeRateLimit, formatRetryMessage } from "@/lib/sanitizeInput";
import { BESPOKE_STATUSES, formatDateTime, toWhatsAppUrl } from "../adminUtils";
import styles from "../adminShell.module.css";

const BUCKET = "bespoke-requests";
const SIGNED_URL_SECONDS = 60 * 60;

const badgeClass = (status) => {
  const key = `badge${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return `${styles.badge} ${styles[key] || ""}`;
};

// Bespoke outfit requests sent from /bespoke/request. The photos live in a private bucket, so
// they are shown through short-lived signed links that only admins are allowed to create.
export default function BespokeRequests() {
  const { user, isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadRequests = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("bespoke_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Could not load bespoke requests:", fetchError);
      setError("Could not load bespoke requests. Please refresh the page.");
      setLoading(false);
      return;
    }

    setError("");
    const rows = data || [];
    setRequests(rows);
    setLoading(false);

    const paths = rows.flatMap((row) => row.image_paths || []);
    if (paths.length === 0) {
      setImageUrls({});
      return;
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);

    if (signError) {
      console.error("Could not create photo links:", signError);
      return;
    }

    const urls = {};
    (signed || []).forEach((item) => {
      if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
    });
    setImageUrls(urls);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(loadRequests, 0);
    return () => clearTimeout(timer);
  }, [isAdmin, loadRequests]);

  const counts = useMemo(() => {
    const result = { all: requests.length };
    BESPOKE_STATUSES.forEach((status) => {
      result[status.key] = 0;
    });
    requests.forEach((request) => {
      if (result[request.status] !== undefined) result[request.status] += 1;
    });
    return result;
  }, [requests]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (tab !== "all" && request.status !== tab) return false;
      if (!term) return true;
      const haystack = `${request.name || ""} ${request.phone || ""} ${request.description || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [requests, tab, search]);

  const updateStatus = async (request, nextStatus) => {
    if (!user || busyId || request.status === nextStatus) return;

    const rateLimit = consumeRateLimit(`admin-bespoke-write:${user.id}`, 60, 60 * 1000);
    if (!rateLimit.allowed) {
      setError(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setBusyId(request.id);
    setError("");

    const { error: updateError } = await supabase
      .from("bespoke_requests")
      .update({ status: nextStatus })
      .eq("id", request.id);

    setBusyId(null);

    if (updateError) {
      console.error("Could not update request:", updateError);
      setError("Could not update this request. Please try again.");
      return;
    }

    setRequests((current) =>
      current.map((item) => (item.id === request.id ? { ...item, status: nextStatus } : item)),
    );
  };

  const deleteRequest = async (request) => {
    if (!user || busyId) return;

    const label = request.name || request.phone;
    if (!window.confirm(`Delete the request from ${label}? Its photos will be deleted too. This cannot be undone.`)) {
      return;
    }

    const rateLimit = consumeRateLimit(`admin-bespoke-delete:${user.id}`, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      setError(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setBusyId(request.id);
    setError("");

    const { error: deleteError } = await supabase.from("bespoke_requests").delete().eq("id", request.id);

    setBusyId(null);

    if (deleteError) {
      console.error("Could not delete request:", deleteError);
      setError("Could not delete this request. Please try again.");
      return;
    }

    // The database queues the request's photos for removal from storage automatically.
    setRequests((current) => current.filter((item) => item.id !== request.id));
  };

  if (!isAdmin) return null;

  const tabs = [{ key: "all", label: "All" }, ...BESPOKE_STATUSES];

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Bespoke requests</h1>
          <p className={styles.pageSub}>Outfit requests from customers. Track each one from first contact to delivery.</p>
        </div>
        <button type="button" className={styles.btn} onClick={loadRequests}>
          Refresh
        </button>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.tabs} role="tablist" aria-label="Request status">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`${styles.tab} ${tab === item.key ? styles.tabActive : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label} ({counts[item.key] ?? 0})
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search by name, phone or description"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search requests"
        />
      </div>

      {loading ? (
        <div className={styles.empty} role="status">Loading requests...</div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          {search || tab !== "all" ? "No requests match this view." : "No bespoke requests yet."}
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((request) => {
            const whatsApp = toWhatsAppUrl(request.phone);
            const busy = busyId === request.id;
            const photos = (request.image_paths || []).filter((path) => imageUrls[path]);

            return (
              <article key={request.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.cardTitle}>{request.name || "No name given"}</h2>
                    <p className={styles.meta}>
                      {request.phone} · {formatDateTime(request.created_at)}
                    </p>
                  </div>
                  <span className={badgeClass(request.status)}>{request.status}</span>
                </div>

                <p className={styles.desc}>{request.description}</p>

                {photos.length > 0 && (
                  <div className={styles.thumbs}>
                    {photos.map((path, index) => (
                      <a key={path} href={imageUrls[path]} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrls[path]}
                          alt={`Reference photo ${index + 1} from ${request.name || request.phone}`}
                          className={styles.thumb}
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className={styles.actions}>
                  <a className={styles.btn} href={`tel:${request.phone}`}>
                    Call
                  </a>
                  {whatsApp && (
                    <a className={styles.btn} href={whatsApp} target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    disabled={busy}
                    onClick={() => deleteRequest(request)}
                  >
                    Delete
                  </button>
                </div>

                <div className={styles.statusPills} role="group" aria-label="Set status">
                  {BESPOKE_STATUSES.map((status) => (
                    <button
                      key={status.key}
                      type="button"
                      className={`${styles.pill} ${request.status === status.key ? styles.pillActive : ""}`}
                      disabled={busy}
                      aria-pressed={request.status === status.key}
                      onClick={() => updateStatus(request, status.key)}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
```

### src/app/admin/customer-requests/page.js

```javascript
import SupportRequests from "@/components/SupportRequests";
export default function AdminCustomerRequests() { return <SupportRequests admin />; }
```

### src/app/admin/students/page.js

```javascript
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { consumeRateLimit, formatRetryMessage } from "@/lib/sanitizeInput";
import { formatDate, formatDateTime, getProgrammePrice, getStudentStatus, toWhatsAppUrl } from "../adminUtils";
import styles from "../adminShell.module.css";
import { authenticatedFetch } from "@/lib/clientApi";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "all", label: "All" },
];

const badgeClass = (status) =>
  `${styles.badge} ${
    status === "accepted" ? styles.badgeAccepted : status === "declined" ? styles.badgeDeclined : styles.badgePending
  }`;

const fullName = (student) =>
  [student.surname, student.first_name, student.middle_name].filter(Boolean).join(" ") || student.name || "Unnamed applicant";

// Fashion academy applications: review, accept or decline. Only admins can read or change
// the students table (enforced by row-level security in the database).
export default function StudentApplications() {
  const { user, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Old links like /course/accepted-students send people here with ?tab=accepted.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (TABS.some((item) => item.key === requested)) {
      const frame = requestAnimationFrame(() => setTab(requested));
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Could not load students:", fetchError);
      setError("Could not load student applications. Please refresh the page.");
    } else {
      setStudents(data || []);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadStudents();
  }, [isAdmin, loadStudents]);

  useEffect(() => {
    if (!selected) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const counts = useMemo(() => {
    const result = { all: students.length, pending: 0, accepted: 0, declined: 0 };
    students.forEach((student) => {
      const status = getStudentStatus(student);
      if (result[status] !== undefined) result[status] += 1;
    });
    return result;
  }, [students]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      if (tab !== "all" && getStudentStatus(student) !== tab) return false;
      if (!term) return true;
      const haystack = `${fullName(student)} ${student.email || ""} ${student.telephone || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [students, tab, search]);

  const updateStatus = async (student, nextStatus) => {
    if (!user || busyId) return;

    if (nextStatus === "declined" && !window.confirm(`Decline the application from ${fullName(student)}?`)) {
      return;
    }

    const rateLimit = consumeRateLimit(`admin-student-write:${user.id}`, 60, 60 * 1000);
    if (!rateLimit.allowed) {
      setError(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setBusyId(student.id);
    setError("");

    try {
      const result = await authenticatedFetch("/api/admin/students", { method: "PATCH", body: JSON.stringify({ id: student.id, status: nextStatus }) });
      setStudents((current) => current.map((item) => item.id === student.id ? result.student : item));
      setSelected((current) => current?.id === student.id ? result.student : current);
    } catch (error) { setError(error.message || "Could not update this application."); }
    finally { setBusyId(null); }
  };

  const renderActions = (student) => {
    const status = getStudentStatus(student);
    const busy = busyId === student.id;
    return (
      <div className={styles.actions}>
        {status !== "accepted" && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={busy}
            onClick={() => updateStatus(student, "accepted")}
          >
            {busy ? "Saving..." : "Accept"}
          </button>
        )}
        {status !== "declined" && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={busy}
            onClick={() => updateStatus(student, "declined")}
          >
            Decline
          </button>
        )}
        {status !== "pending" && (
          <button type="button" className={styles.btn} disabled={busy} onClick={() => updateStatus(student, "pending")}>
            Move to pending
          </button>
        )}
      </div>
    );
  };

  if (!isAdmin) return null;

  const selectedStatus = selected ? getStudentStatus(selected) : "pending";
  const selectedWhatsApp = selected ? toWhatsAppUrl(selected.telephone) : null;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Student applications</h1>
          <p className={styles.pageSub}>Review fashion academy applications and accept or decline them.</p>
        </div>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.tabs} role="tablist" aria-label="Application status">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`${styles.tab} ${tab === item.key ? styles.tabActive : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label} ({counts[item.key]})
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search by name, email or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search applications"
        />
      </div>

      {loading ? (
        <div className={styles.empty} role="status">Loading applications...</div>
      ) : visible.length === 0 ? (
        <div className={styles.empty}>
          {search ? "No applications match your search." : "No applications in this list."}
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((student) => {
            const status = getStudentStatus(student);
            return (
              <article key={student.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.cardTitle}>{fullName(student)}</h2>
                    <p className={styles.meta}>
                      {student.email}
                      {student.telephone ? ` · ${student.telephone}` : ""}
                    </p>
                    <p className={styles.meta}>
                      {student.chosen_programme}
                      {getProgrammePrice(student.chosen_programme) ? ` (${getProgrammePrice(student.chosen_programme)})` : ""}
                      {student.created_at ? ` · Applied ${formatDate(student.created_at)}` : ""}
                    </p>
                  </div>
                  <span className={badgeClass(status)}>{status}</span>
                </div>
                <div className={styles.actions}>
                  <button type="button" className={styles.btn} onClick={() => setSelected(student)}>
                    View details
                  </button>
                </div>
                {renderActions(student)}
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setSelected(null)}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <div>
                <h2 id="student-detail-title" className={styles.modalTitle}>{fullName(selected)}</h2>
                <p className={styles.meta}>
                  <span className={badgeClass(selectedStatus)}>{selectedStatus}</span>
                  {selected.created_at ? ` Applied ${formatDateTime(selected.created_at)}` : ""}
                </p>
              </div>
              <button type="button" className={styles.btn} onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div className={styles.detailLayout}>
              {selected.passport_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.passport_photo} alt={`Passport photo of ${fullName(selected)}`} className={styles.passport} />
              ) : (
                <div className={styles.noPassport}>No passport photo</div>
              )}

              <dl className={styles.detailGrid}>
                {[
                  ["Gender", selected.gender],
                  ["Date of birth", formatDate(selected.date_of_birth)],
                  ["Age", selected.age ? `${selected.age} years` : ""],
                  ["Nationality", selected.nationality],
                  ["State of origin", selected.state_of_origin],
                  ["Marital status", selected.marital_status],
                  ["Telephone", selected.telephone],
                  ["Email", selected.email],
                  ["Address", selected.address],
                  ["Sponsorship", selected.sponsorship || "Not recorded"],
                  ["Sponsor organization", selected.sponsor_organization || "Not applicable"],
                  [
                    "Programme",
                    `${selected.chosen_programme || ""}${
                      getProgrammePrice(selected.chosen_programme) ? ` (${getProgrammePrice(selected.chosen_programme)})` : ""
                    }`,
                  ],
                ].map(([label, text]) => (
                  <div key={label}>
                    <dt className={styles.detailLabel}>{label}</dt>
                    <dd className={styles.detailValue}>{text || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className={styles.actions} style={{ marginTop: "1.25rem" }}>
              {selected.telephone && (
                <a className={styles.btn} href={`tel:${selected.telephone}`}>
                  Call
                </a>
              )}
              {selectedWhatsApp && (
                <a className={styles.btn} href={selectedWhatsApp} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              )}
            </div>
            <div style={{ marginTop: "0.75rem" }}>{renderActions(selected)}</div>
          </section>
        </div>
      )}
    </>
  );
}
```

### src/app/api/account/orders/route.js

```javascript
import { NextResponse } from "next/server";
import { claimAccountOrders, requireActiveAccount } from "@/lib/accountServer";
import { OrderRequestError } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const rawPage = new URL(request.url).searchParams.get("page") || "1";
    if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1 || Number(rawPage) > 100000) throw new OrderRequestError("Invalid page.", 400);
    const page = Number(rawPage), pageSize = 20;
    await claimAccountOrders(db, user);
    const { data, count, error } = await db.from("shop_orders")
      .select("id,created_at,items,total_minor,payment_status,fulfillment_status,delivery,customer_received_at", { count: "exact" })
      .eq("user_id", user.id).eq("payment_status", "paid").order("created_at", { ascending: false }).order("id", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return NextResponse.json({ orders: data, total: count, page, pageSize }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Account orders failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to load your orders." }, { status: error.status || 503 });
  }
}
```

### src/app/api/account/requests/route.js

```javascript
import { after, NextResponse } from "next/server";
import { claimAccountOrders, readAccountBody, requireActiveAccount } from "@/lib/accountServer";
import { requestQuerySchema, requestSchema, REQUEST_TABLES } from "@/lib/accountContracts.mjs";
import { notifySupportRequest } from "@/lib/supportEmails.mjs";
import { OrderRequestError } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error) {
  if (!(error instanceof OrderRequestError)) console.error("Customer request failed", error?.code || error?.message);
  return json({ error: error instanceof OrderRequestError ? error.message : "Unable to complete this request." }, error.status || 503);
}

export async function GET(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const parsed = requestQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new OrderRequestError("Invalid request filter.", 400);
    const { kind, page } = parsed.data, pageSize = 20;
    const { data, count, error } = await db.from(REQUEST_TABLES[kind]).select("id,order_id,product_id,product_name,description,status,response,created_at,updated_at", { count: "exact" })
      .eq("user_id", user.id).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return json({ requests: data, total: count, page, pageSize });
  } catch (error) { return failure(error); }
}

export async function POST(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const input = await readAccountBody(request, requestSchema, 6000);
    const { data: allowed, error: limitError } = await db.rpc("consume_account_action_limit", { p_user_id: user.id, p_action: input.kind });
    if (limitError) throw limitError;
    if (!allowed) throw new OrderRequestError("Too many requests. Please wait an hour before submitting another.", 429);
    await claimAccountOrders(db, user);
    const { data: order, error: orderError } = await db.from("shop_orders").select("id,items,customer_email,user_id,payment_status").eq("id", input.orderId).eq("user_id", user.id).maybeSingle();
    if (orderError) throw orderError;
    const item = order?.items?.find((line) => line.productId === input.productId);
    if (!item || order.payment_status !== "paid") throw new OrderRequestError("Choose a purchased product from your own paid order.", 403);
    const table = REQUEST_TABLES[input.kind];
    const { data, error } = await db.from(table).insert({
      id: input.id, user_id: user.id, order_id: order.id, product_id: input.productId, product_name: item.name,
      description: input.description, ...(input.kind === "complaint" ? { received_confirmed: true } : {}),
    }).select("*").single();
    if (error?.code === "23505") {
      const { data: existing, error: lookupError } = await db.from(table).select("*").eq("user_id", user.id).eq("order_id", order.id).eq("product_id", input.productId).maybeSingle();
      if (lookupError || !existing) throw new OrderRequestError("This request reference has already been used. Refresh and try again.", 409);
      return json({ request: existing, duplicate: true });
    }
    if (error) throw error;
    after(() => notifySupportRequest(data, input.kind, user.email));
    return json({ request: data }, 201);
  } catch (error) { return failure(error); }
}
```

### src/app/api/account/route.js

```javascript
import { NextResponse } from "next/server";
import { accountActionSchema } from "@/lib/accountContracts.mjs";
import { passwordClient, readAccountBody, requireActiveAccount } from "@/lib/accountServer";
import { OrderRequestError } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  let auth;
  try {
    const { db, user, token } = await requireActiveAccount(request);
    const input = await readAccountBody(request, accountActionSchema, 4000);
    const { data: allowed, error: limitError } = await db.rpc("consume_account_action_limit", { p_user_id: user.id, p_action: input.action });
    if (limitError) throw limitError;
    if (!allowed) throw new OrderRequestError("Too many attempts. Please wait 15 minutes before trying again.", 429);
    auth = passwordClient();
    const { data, error: passwordError } = await auth.auth.signInWithPassword({ email: user.email, password: input.currentPassword });
    if (passwordError || data.user?.id !== user.id) throw new OrderRequestError("Your current password is incorrect.", 400);
    if (input.action === "password") {
      const { error } = await auth.auth.updateUser({ password: input.newPassword });
      if (error) throw new OrderRequestError("Password could not be changed. Check the password requirements and try again.", 400);
      return NextResponse.json({ message: "Password changed successfully." });
    }
    const { data: changed, error } = await db.from("users").update({ is_active: false }).eq("id", user.id).select("id").single();
    if (error || !changed) throw error || new Error("Account was not updated");
    const { error: revokeError } = await db.auth.admin.signOut(token, "global");
    if (revokeError) console.error("Deactivated account session revocation failed", revokeError.message);
    return NextResponse.json({ deactivated: true, message: "Your account is deactivated. Contact Elegant Style to request reactivation." });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Account action failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to update your account." }, { status: error.status || 503 });
  } finally {
    if (auth) await auth.auth.signOut({ scope: "local" }).catch(() => {});
  }
}
```

### src/app/api/admin/customer-requests/route.js

```javascript
import { after, NextResponse } from "next/server";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { readAccountBody } from "@/lib/accountServer";
import { OrderRequestError, requireOrderAdmin } from "@/lib/orderManagement.mjs";
import { requestQuerySchema, requestReviewSchema, REQUEST_TABLES } from "@/lib/accountContracts.mjs";
import { notifySupportRequest } from "@/lib/supportEmails.mjs";

export const runtime = "nodejs";
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error) {
  if (!(error instanceof OrderRequestError)) console.error("Customer request review failed", error?.code || error?.message);
  return json({ error: error instanceof OrderRequestError ? error.message : "Unable to manage customer requests." }, error.status || 503);
}

export async function GET(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const parsed = requestQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new OrderRequestError("Invalid request filter.", 400);
    const { kind, page } = parsed.data, pageSize = 25;
    const { data, count, error } = await db.from(REQUEST_TABLES[kind]).select("id,order_id,product_id,product_name,description,status,response,created_at,updated_at,order:shop_orders(customer_name,customer_email,customer_phone)", { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return json({ requests: data, total: count, page, pageSize });
  } catch (error) { return failure(error); }
}

export async function PATCH(request) {
  try {
    const db = checkoutDatabase();
    const admin = await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, requestReviewSchema, 6000);
    const { data: changed, error } = await db.from(REQUEST_TABLES[input.kind]).update({ status: input.status, response: input.response, reviewed_by: admin.id })
      .eq("id", input.id).eq("status", input.expectedStatus).select("*").maybeSingle();
    if (error) throw error;
    if (!changed) throw new OrderRequestError("This request changed. Refresh before updating it.", 409);
    after(async () => {
      try {
        const { data: customer, error: userError } = await db.auth.admin.getUserById(changed.user_id);
        if (userError) console.error("Customer notification lookup failed", userError.message);
        await notifySupportRequest(changed, input.kind, customer?.user?.email, true);
      } catch (mailError) { console.error("Customer status email failed", mailError.message); }
    });
    return json({ request: changed });
  } catch (error) { return failure(error); }
}
```

### src/app/api/admin/students/route.js

```javascript
import { after, NextResponse } from "next/server";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { OrderRequestError, requireOrderAdmin } from "@/lib/orderManagement.mjs";
import { readAccountBody } from "@/lib/accountServer";
import { studentReviewSchema } from "@/lib/registration.mjs";
import { notifyAcceptance } from "@/lib/registrationEmails.mjs";

export const runtime = "nodejs";

export async function PATCH(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, studentReviewSchema);
    const { data, error } = await db.rpc("review_student_application", { p_id: input.id, p_status: input.status });
    if (error?.code === "P0002") throw new OrderRequestError("Student application not found.", 404);
    if (error) throw error;
    if (data.send_acceptance) after(() => notifyAcceptance(data.student));
    return NextResponse.json({ student: data.student }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Student review failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to update this application." }, { status: error.status || 503 });
  }
}
```

### src/app/api/registrations/route.js

```javascript
import { after, NextResponse } from "next/server";
import { registrationSchema } from "@/lib/registration.mjs";
import { notifyRegistration } from "@/lib/registrationEmails.mjs";
import { readAccountBody, requireActiveAccount } from "@/lib/accountServer";
import { OrderRequestError } from "@/lib/orderManagement.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { db, user } = await requireActiveAccount(request);
    const input = await readAccountBody(request, registrationSchema);
    const photo = new URL(input.passport_photo);
    const expected = `/storage/v1/object/public/student-passports/${user.id}/`;
    if (photo.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin ||
      !photo.pathname.startsWith(expected) || !/^passport\.(jpg|png)$/.test(photo.pathname.slice(expected.length)) || photo.search) {
      throw new OrderRequestError("Upload your own passport photograph before submitting.", 400);
    }
    const fileName = photo.pathname.slice(expected.length);
    const { data: files, error: fileError } = await db.storage.from("student-passports").list(user.id, { limit: 10 });
    const file = files?.find((entry) => entry.name === fileName);
    if (fileError || !file || !["image/jpeg", "image/png"].includes(file.metadata?.mimetype) ||
      Number(file.metadata?.size || 0) <= 0 || Number(file.metadata.size) > 5 * 1024 * 1024) {
      throw new OrderRequestError("Your passport photograph could not be verified. Upload it again.", 400);
    }
    const { data, error } = await db.rpc("submit_student_application", { p_user_id: user.id, p_details: input });
    if (error?.code === "23505") throw new OrderRequestError("You already have a registration. Open your registration details.", 409);
    if (error) throw error;
    after(() => notifyRegistration(data));
    return NextResponse.json({ registration: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof OrderRequestError)) console.error("Student registration failed", error?.code || error?.message);
    return NextResponse.json({ error: error instanceof OrderRequestError ? error.message : "Unable to submit your registration. Please try again." }, { status: error.status || 503 });
  }
}
```

### src/app/course/fashionschool.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-top: 90px;
  font-weight: 600;
}

.body {
  font-family: var(--font-sans);
  background: var(--paper);
  min-height: 100vh;
  display: block;
  padding: 40px 1.5rem 4rem;
}

.form-container {
  background: var(--white);
  max-width: 700px;
  width: 100%;
  margin: 0 auto;
  border: 1px solid var(--line);
}

.curriculum-card {
  display: block;
  max-width: 700px;
  margin: 1.5rem auto;
  padding: 1.5rem 1.75rem;
  background: var(--ink);
  border: 1px solid var(--ink);
  color: var(--paper);
  text-decoration: none;
  transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}

.curriculum-card:hover {
  background: var(--ink-soft);
  box-shadow: 0 12px 28px rgba(20, 18, 13, 0.16);
  transform: translateY(-3px);
}

.curriculum-card:focus-visible {
  outline: 2px solid var(--gold-deep);
  outline-offset: 4px;
}

.curriculum-card h2 {
  margin: 0 0 0.6rem;
  color: var(--gold-bright);
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 600;
}

.curriculum-card p {
  margin: 0;
  line-height: 1.6;
}

.curriculum-card span {
  display: inline-block;
  margin-top: 1rem;
  color: var(--gold-bright);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.form-header {
  padding: 2.25rem 2.5rem 1.25rem;
  border-bottom: 1px dashed var(--line);
}

.form-header h1 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.9rem;
  color: var(--ink);
}

.registration-progress {
  margin-top: 1.5rem;
}

.registration-progress-copy {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.55rem;
  color: var(--stone);
  font-size: 0.82rem;
}

.registration-progress-copy strong {
  color: var(--ink);
  font-weight: 600;
}

.registration-progress-track {
  height: 0.45rem;
  overflow: hidden;
  background: var(--paper-dim);
  border-radius: 999px;
}

.registration-progress-track span {
  display: block;
  height: 100%;
  background: var(--gold-deep);
  border-radius: inherit;
  transition: width 0.25s ease;
}

.form-body {
  padding: 1.75rem 2.5rem 2.5rem;
}

.question {
  margin-bottom: 2rem;
}

.question-number {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  font-weight: 600;
  color: var(--gold-deep);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.question-label {
  font-size: 0.95rem;
  color: var(--ink);
  margin-bottom: 10px;
}

.field-error {
  margin: 0.45rem 0 0;
  color: var(--danger);
  font-size: 0.85rem;
  line-height: 1.4;
}

.required {
  color: var(--danger);
}

.input-field {
  width: 100%;
  padding: 0.85rem 1rem;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: var(--font-sans);
  color: var(--ink);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--gold-deep);
  box-shadow: 0 0 0 3px rgba(161, 122, 70, 0.15);
}

.textarea {
  width: 100%;
  padding: 0.85rem 1rem;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: var(--font-sans);
  color: var(--ink);
  min-height: 100px;
  resize: vertical;
}

.textarea:focus {
  outline: none;
  border-color: var(--gold-deep);
  box-shadow: 0 0 0 3px rgba(161, 122, 70, 0.15);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: var(--ink);
  cursor: pointer;
}

.radio-option input[type="radio"] {
  width: 18px;
  height: 18px;
  accent-color: var(--gold-deep);
}

.declaration {
  background: var(--paper);
  padding: 1.25rem;
  border: 1px dashed var(--line);
  border-radius: var(--radius);
  margin: 1.75rem 0;
}

.declaration-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--stone);
  margin-bottom: 0.9rem;
}

.agree-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: var(--ink);
  cursor: pointer;
}

.agree-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--gold-deep);
}

.submit-btn {
  width: 100%;
  padding: 1rem;
  background: var(--ink);
  color: var(--paper);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.25s ease;
}

.submit-btn:hover {
  background: var(--ink-soft);
}

.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.submit-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: var(--paper);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
  margin-right: 10px;
}

@media (max-width: 600px) {
  .form-container {
    margin: 10px;
  }
  .form-header,
  .form-body {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  .registration-progress-copy {
    flex-direction: column;
    gap: 0.25rem;
  }
}

/* Loading state */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--paper);
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid var(--line);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-container p {
  font-size: 1.05rem;
  color: var(--stone);
}

/* Auth modal */
.auth-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 13, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.auth-modal {
  background: var(--white);
  padding: 2.5rem;
  border: 1px solid var(--line);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.auth-modal h2 {
  margin: 0 0 1rem 0;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--ink);
  font-size: 1.5rem;
}

.auth-modal p {
  margin: 0 0 1.5rem 0;
  color: var(--stone);
  font-size: 1rem;
  line-height: 1.5;
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.auth-btn {
  padding: 0.875rem 1.5rem;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  transition: all 0.25s ease;
}

.auth-btn.primary {
  background: var(--gold);
  color: var(--ink);
}

.auth-btn.primary:hover {
  background: var(--ink);
  color: var(--white);
}

.auth-btn.secondary {
  background: var(--paper-dim);
  color: var(--ink);
}

.auth-btn.secondary:hover {
  background: var(--ink);
  color: var(--white);
}

.close-btn {
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: 0.9rem;
  color: var(--stone);
  cursor: pointer;
  transition: all 0.25s ease;
}

.close-btn:hover {
  background: var(--ink);
  color: var(--white);
  border-color: var(--ink);
}

/* Passport preview */
.passport-preview {
  margin-top: 1rem;
}

.passport-image {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: var(--radius);
  border: 2px solid var(--line);
}

/* Upload progress bar */
.upload-progress-container {
  margin-top: 1rem;
  width: 100%;
  background-color: var(--line);
  border-radius: var(--radius);
  height: 8px;
  overflow: hidden;
}

.upload-progress-bar {
  height: 100%;
  background-color: var(--gold);
  width: 0%;
  transition: width 0.3s ease;
}

/* Success modal */
.success-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 13, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.success-modal {
  background: var(--white);
  padding: 3rem;
  border: 1px solid var(--line);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.success-icon {
  margin-bottom: 1.5rem;
}

.success-modal h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.5rem;
  color: var(--ink);
  margin-bottom: 0.75rem;
}

.success-modal p {
  font-size: 1rem;
  color: var(--stone);
  margin-bottom: 2rem;
}

.success-modal-btn {
  padding: 0.875rem 2rem;
  background: var(--gold);
  color: var(--ink);
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s ease;
}

.success-modal-btn:hover {
  background: var(--gold-bright);
}

/* Admin panel */
.admin-panel {
  background: var(--white);
  max-width: 900px;
  margin: 100px auto 30px;
  border: 1px solid var(--line);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem 2rem;
  background: var(--ink);
  color: var(--paper);
}

.admin-header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.4rem;
}

.admin-link-btn {
  padding: 0.6rem 1rem;
  background: var(--gold);
  color: var(--ink);
  text-decoration: none;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.25s ease;
}

.admin-link-btn:hover {
  background: var(--gold-bright);
}

.search-container {
  padding: 1.5rem 2rem;
  border-bottom: 1px dashed var(--line);
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: 1rem;
  color: var(--ink);
  outline: none;
  transition: border-color 0.25s ease;
}

.search-input:focus {
  border-color: var(--gold-deep);
  box-shadow: 0 0 0 3px rgba(161, 122, 70, 0.15);
}

.pending-students {
  padding: 1.75rem 2rem;
}

.pending-students h3 {
  margin: 0 0 1.25rem 0;
  font-size: 1.2rem;
  color: var(--ink);
  font-weight: 600;
}

.students-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.student-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  transition: border-color 0.25s ease;
}

.student-card:hover {
  border-color: var(--gold-deep);
}

.student-info h4 {
  margin: 0 0 6px 0;
  font-size: 1.05rem;
  color: var(--ink);
  font-weight: 600;
}

.student-info p {
  margin: 3px 0;
  font-size: 0.9rem;
  color: var(--stone);
}

.student-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.view-btn {
  padding: 0.7rem 1.4rem;
  background: var(--gold-deep);
  color: var(--white);
  border: none;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition: opacity 0.25s ease;
}

.view-btn:hover {
  opacity: 0.85;
}

.accept-btn {
  padding: 0.7rem 1.4rem;
  background: var(--success);
  color: var(--white);
  border: none;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.25s ease;
}

.accept-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.accept-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sponsor-organization { display: grid; gap: 8px; margin-top: 16px; }

.no-pending {
  padding: 2rem;
  text-align: center;
  color: var(--stone);
  font-size: 1rem;
}

@media (max-width: 600px) {
  .admin-panel {
    margin: 80px 10px 20px;
  }

  .admin-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .student-card {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .curriculum-card {
  max-width: 350px;
  margin: 1.5rem ;
}

  .accept-btn {
    width: 100%;
  }
}
```

### src/app/course/page.js

```javascript
"use client";
import styles from "./fashionschool.css";
import { useState, useEffect } from "react";
import { authenticatedFetch } from "@/lib/clientApi";
import { REGISTRATION_COMPLETE_MESSAGE, SPONSORSHIP_OPTIONS, registrationSchema } from "@/lib/registration.mjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { consumeRateLimit, formatRetryMessage, sanitizeEmail, sanitizeText, validateImageFile } from "@/lib/sanitizeInput";
import { getCachedValue, invalidateCachedValue, setCachedValue } from "@/lib/browserCache";
import BackToTopButton from "@/components/BackToTopButton";

const REGISTRATION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const requiredFields = [
  "surname", "first_name", "gender", "date_of_birth", "age", "nationality",
  "marital_status", "state_of_origin", "address", "telephone", "email",
  "chosen_programme", "sponsorship", "passport_photo", "agreed",
];

// African countries list
const africanCountries = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros",
  "Democratic Republic of the Congo", "Republic of the Congo", "Djibouti",
  "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon",
  "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Ivory Coast", "Kenya",
  "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania",
  "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria",
  "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone",
  "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo",
  "Tunisia", "Uganda", "Zambia", "Zimbabwe"
];

// States / provinces / regions for every African country, keyed by the
// country names used in the `africanCountries` list above.
const africanStates = {
  "Algeria": ["Adrar", "Aïn Defla", "Aïn Témouchent", "Algiers", "Annaba", "Batna", "Béchar", "Béjaïa", "Biskra", "Blida", "Bordj Bou Arréridj", "Bouira", "Boumerdès", "Chlef", "Constantine", "Djelfa", "El Bayadh", "El Oued", "El Tarf", "Ghardaïa", "Guelma", "Illizi", "Jijel", "Khenchela", "Laghouat", "M'Sila", "Mascara", "Médéa", "Mila", "Mostaganem", "Naâma", "Oran", "Ouargla", "Oum El Bouaghi", "Relizane", "Saïda", "Sétif", "Sidi Bel Abbès", "Skikda", "Souk Ahras", "Tamanrasset", "Tébessa", "Tiaret", "Tindouf", "Tipaza", "Tissemsilt", "Tizi Ouzou", "Tlemcen"],
  "Angola": ["Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango", "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla", "Luanda", "Lunda Norte", "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire"],
  "Benin": ["Alibori", "Atacora", "Atlantique", "Borgou", "Collines", "Couffo", "Donga", "Littoral", "Mono", "Ouémé", "Plateau", "Zou"],
  "Botswana": ["Central", "Ghanzi", "Kgalagadi", "Kgatleng", "Kweneng", "North-East", "North-West", "South-East", "Southern"],
  "Burkina Faso": ["Boucle du Mouhoun", "Cascades", "Centre", "Centre-Est", "Centre-Nord", "Centre-Ouest", "Centre-Sud", "Est", "Hauts-Bassins", "Nord", "Plateau-Central", "Sahel", "Sud-Ouest"],
  "Burundi": ["Bubanza", "Bujumbura Mairie", "Bujumbura Rural", "Cankuzo", "Cibitoke", "Gitega", "Karuzi", "Kayanza", "Kirundo", "Makamba", "Muramvya", "Muyinga", "Mwaro", "Ngozi", "Rumonge", "Rutana", "Ruyigi"],
  "Cabo Verde": ["Boa Vista", "Brava", "Maio", "Mosteiros", "Paul", "Porto Novo", "Praia", "Ribeira Brava", "Ribeira Grande", "Ribeira Grande de Santiago", "Sal", "Santa Catarina", "Santa Catarina do Fogo", "Santa Cruz", "São Domingos", "São Filipe", "São Lourenço dos Órgãos", "São Miguel", "São Salvador do Mundo", "São Vicente", "Tarrafal", "Tarrafal de São Nicolau"],
  "Cameroon": ["Adamaoua", "Centre", "East", "Far North", "Littoral", "North", "Northwest", "South", "Southwest", "West"],
  "Central African Republic": ["Bamingui-Bangoran", "Bangui", "Basse-Kotto", "Haute-Kotto", "Haut-Mbomou", "Kémo", "Lobaye", "Mambéré-Kadéï", "Mbomou", "Nana-Grébizi", "Nana-Mambéré", "Ombella-M'Poko", "Ouaka", "Ouham", "Ouham-Pendé", "Sangha-Mbaéré", "Vakaga"],
  "Chad": ["Batha", "Borkou", "Chari-Baguirmi", "Ennedi-Est", "Ennedi-Ouest", "Guéra", "Hadjer-Lamis", "Kanem", "Lac", "Logone Occidental", "Logone Oriental", "Mandoul", "Mayo-Kebbi Est", "Mayo-Kebbi Ouest", "Moyen-Chari", "N'Djamena", "Ouaddaï", "Salamat", "Sila", "Tandjilé", "Tibesti", "Wadi Fira"],
  "Comoros": ["Anjouan", "Grande Comore", "Mohéli"],
  "Democratic Republic of the Congo": ["Bas-Uélé", "Équateur", "Haut-Katanga", "Haut-Lomami", "Haut-Uélé", "Ituri", "Kasaï", "Kasaï Central", "Kasaï Oriental", "Kinshasa", "Kongo Central", "Kwango", "Kwilu", "Lomami", "Lualaba", "Maï-Ndombe", "Maniema", "Mongala", "Nord-Kivu", "Nord-Ubangi", "Sankuru", "Sud-Kivu", "Sud-Ubangi", "Tanganyika", "Tshopo", "Tshuapa"],
  "Republic of the Congo": ["Bouenza", "Brazzaville", "Cuvette", "Cuvette-Ouest", "Kouilou", "Lékoumou", "Likouala", "Niari", "Plateaux", "Pointe-Noire", "Pool", "Sangha"],
  "Djibouti": ["Ali Sabieh", "Arta", "Dikhil", "Djibouti", "Obock", "Tadjourah"],
  "Egypt": ["Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia", "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr El Sheikh", "Luxor", "Matruh", "Minya", "Monufia", "New Valley", "North Sinai", "Port Said", "Qalyubia", "Qena", "Red Sea", "Sharqia", "Sohag", "South Sinai", "Suez"],
  "Equatorial Guinea": ["Annobón", "Bioko Norte", "Bioko Sur", "Centro Sur", "Djibloho", "Kié-Ntem", "Litoral", "Wele-Nzas"],
  "Eritrea": ["Anseba", "Debub", "Gash-Barka", "Maekel", "Northern Red Sea", "Southern Red Sea"],
  "Eswatini": ["Hhohho", "Lubombo", "Manzini", "Shiselweni"],
  "Ethiopia": ["Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Central Ethiopia", "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama", "Somali", "South Ethiopia", "South West Ethiopia", "Tigray"],
  "Gabon": ["Estuaire", "Haut-Ogooué", "Moyen-Ogooué", "Ngounié", "Nyanga", "Ogooué-Ivindo", "Ogooué-Lolo", "Ogooué-Maritime", "Woleu-Ntem"],
  "Gambia": ["Banjul", "Central River", "Lower River", "North Bank", "Upper River", "West Coast"],
  "Ghana": ["Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra", "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West", "Volta", "Western", "Western North"],
  "Guinea": ["Boké", "Conakry", "Faranah", "Kankan", "Kindia", "Labé", "Mamou", "Nzérékoré"],
  "Guinea-Bissau": ["Bafatá", "Biombo", "Bissau", "Bolama", "Cacheu", "Gabú", "Oio", "Quinara", "Tombali"],
  "Ivory Coast": ["Abidjan", "Bas-Sassandra", "Comoé", "Denguélé", "Gôh-Djiboua", "Lacs", "Lagunes", "Montagnes", "Sassandra-Marahoué", "Savanes", "Vallée du Bandama", "Woroba", "Yamoussoukro", "Zanzan"],
  "Kenya": ["Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans-Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"],
  "Lesotho": ["Berea", "Butha-Buthe", "Leribe", "Mafeteng", "Maseru", "Mohale's Hoek", "Mokhotlong", "Qacha's Nek", "Quthing", "Thaba-Tseka"],
  "Liberia": ["Bomi", "Bong", "Gbarpolu", "Grand Bassa", "Grand Cape Mount", "Grand Gedeh", "Grand Kru", "Lofa", "Margibi", "Maryland", "Montserrado", "Nimba", "River Cess", "River Gee", "Sinoe"],
  "Libya": ["Al Butnan", "Al Jabal al Akhdar", "Al Jabal al Gharbi", "Al Jafara", "Al Jufrah", "Al Kufrah", "Al Marj", "Al Marqab", "Al Wahat", "An Nuqat al Khams", "Az Zawiya", "Benghazi", "Derna", "Ghat", "Misrata", "Murqub", "Murzuq", "Nalut", "Sabha", "Surt", "Tripoli", "Wadi al Hayaa", "Wadi ash Shati'", "Sha'biyat"],
  "Madagascar": ["Alaotra-Mangoro", "Amoron'i Mania", "Analamanga", "Analanjirofo", "Androy", "Anosy", "Atsimo-Andrefana", "Atsimo-Atsinanana", "Atsinanana", "Betsiboka", "Boeny", "Bongolava", "Diana", "Haute Matsiatra", "Ihorombe", "Itasy", "Melaky", "Menabe", "Sava", "Sofia", "Vakinankaratra", "Vatovavy-Fitovinany"],
  "Malawi": ["Balaka", "Blantyre", "Chikwawa", "Chiradzulu", "Chitipa", "Dedza", "Dowa", "Karonga", "Kasungu", "Likoma", "Lilongwe", "Machinga", "Mangochi", "Mchinji", "Mulanje", "Mwanza", "Mzimba", "Neno", "Nkhata Bay", "Nkhotakota", "Nsanje", "Ntcheu", "Ntchisi", "Phalombe", "Rumphi", "Salima", "Thyolo", "Zomba"],
  "Mali": ["Bamako", "Gao", "Kayes", "Kidal", "Koulikoro", "Ménaka", "Mopti", "Ségou", "Sikasso", "Taoudénit", "Tombouctou"],
  "Mauritania": ["Adrar", "Assaba", "Brakna", "Dakhlet Nouadhibou", "Gorgol", "Guidimaka", "Hodh Ech Chargui", "Hodh El Gharbi", "Inchiri", "Nouakchott-Nord", "Nouakchott-Ouest", "Nouakchott-Sud", "Tagant", "Tiris Zemmour", "Trarza"],
  "Mauritius": ["Agaléga", "Black River", "Flacq", "Grand Port", "Moka", "Pamplemousses", "Plaines Wilhems", "Port Louis", "Rivière du Rempart", "Rodrigues", "Savanne"],
  "Morocco": ["Beni Mellal-Khénifra", "Casablanca-Settat", "Draa-Tafilalet", "Fès-Meknès", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Marrakech-Safi", "Oriental", "Rabat-Salé-Kénitra", "Souss-Massa", "Tangier-Tetouan-Al Hoceima", "Dakhla-Oued Ed-Dahab"],
  "Mozambique": ["Cabo Delgado", "Gaza", "Inhambane", "Manica", "Maputo", "Maputo City", "Nampula", "Niassa", "Sofala", "Tete", "Zambezia"],
  "Namibia": ["Erongo", "Hardap", "Karas", "Kavango East", "Kavango West", "Khomas", "Kunene", "Ohangwena", "Omaheke", "Omusati", "Oshana", "Oshikoto", "Otjozondjupa", "Zambezi"],
  "Niger": ["Agadez", "Diffa", "Dosso", "Maradi", "Tahoua", "Tillabéri", "Zinder"],
  "Nigeria": ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"],
  "Rwanda": ["Eastern", "Kigali", "Northern", "Southern", "Western"],
  "Sao Tome and Principe": ["Cantagalo", "Caué", "Lembá", "Lobata", "Mé-Zóchi", "Príncipe", "São Tomé"],
  "Senegal": ["Dakar", "Diourbel", "Fatick", "Kaffrine", "Kaolack", "Kédougou", "Kolda", "Louga", "Matam", "Saint-Louis", "Sédhiou", "Tambacounda", "Thiès", "Ziguinchor"],
  "Seychelles": ["Anse aux Pins", "Anse Boileau", "Anse Etoile", "Anse Royale", "Anse Volandry", "Au Cap", "Baie Lazare", "Baie Sainte Anne", "Beau Vallon", "Bel Air", "Bel Ombre", "Cascade", "English River", "Glacis", "Grand'Anse Mahé", "Grand'Anse Praslin", "La Digue", "Les Mamelles", "Mont Buxton", "Mont Fleuri", "Plaisance", "Pointe Larue", "Port Glaud", "Roche Caiman", "Saint Louis", "Takamaka", "Ile Perseverance"],
  "Sierra Leone": ["Bo", "Bombali", "Bonthe", "Kailahun", "Kambia", "Kenema", "Koinadugu", "Kono", "Moyamba", "Pujehun", "Port Loko", "Tonkolili", "Western Area Freetown", "Western Area Rural"],
  "Somalia": ["Awdal", "Bakool", "Banaadir", "Bari", "Bay", "Galguduud", "Gedo", "Hiiraan", "Jubbada Dhexe", "Jubbada Hoose", "Mudug", "Nugaal", "Sanaag", "Shabelle Dhexe", "Shabelle Hoose", "Sool", "Togdheer", "Woqooyi Galbeed"],
  "South Africa": ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"],
  "South Sudan": ["Central Equatoria", "Eastern Equatoria", "Jonglei", "Lakes", "Northern Bahr el Ghazal", "Unity", "Upper Nile", "Warrap", "Western Bahr el Ghazal", "Western Equatoria"],
  "Sudan": ["Al Jazirah", "Al Qadarif", "Blue Nile", "Central Darfur", "East Darfur", "Kassala", "Khartoum", "North Darfur", "North Kordofan", "Northern", "Red Sea", "River Nile", "Sennar", "South Darfur", "South Kordofan", "West Darfur", "West Kordofan", "White Nile"],
  "Tanzania": ["Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Unguja North", "Unguja South", "Unguja Urban West"],
  "Togo": ["Centrale", "Kara", "Maritime", "Plateaux", "Savanes"],
  "Tunisia": ["Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan", "Kasserine", "Kef", "Mahdia", "Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"],
  "Uganda": ["Abim", "Adjumani", "Agago", "Alebtong", "Amolatar", "Amudat", "Amuria", "Amuru", "Apac", "Arua", "Budaka", "Bududa", "Bugiri", "Buhweju", "Buikwe", "Bukedea", "Bukwa", "Bukwo", "Bulambuli", "Buliisa", "Bundibugyo", "Bushenyi", "Busia", "Butaleja", "Buvuma", "Buyende", "Central Kampala", "Dokolo", "Gomba", "Gulu", "Hoima", "Ibanda", "Iganga", "Isingiro", "Jinja", "Kaabong", "Kabale", "Kabarole", "Kaberamaido", "Kagadi", "Kalangala", "Kaliro", "Kal Kampala", "Kampala", "Kamuli Kamuli", "Kamwenge", "Kanungu", "Kapchorwa", "Kasese", "Katakwi", "Kayunga", "Kibaale", "Kiboga", "Kibuku", "Kiruhura", "Kiryandongo", "Kisoro", "Kitgum", "Koboko", "Kole", "Kotido", "Kumi", "Kween", "Kyankwanzi", "Kyegegwa", "Kyenjojo", "Lamwo", "Lira", "Luuka", "Luweero", "Lwengo", "Lyantonde", "Manafwa", "Maracha", "Masaka", "Masindi", "Mayuge", "Mbale", "Mbarara", "Mitooma", "Mityana", "Moroto", "Moyo", "Mpigi", "Mubende", "Mukono", "Nakapiripirit", "Nakaseke", "Nakasongola", "Namayingo", "Namutumba", "Napak", "Nebbi", "Ngora", "Ntoroko", "Ntungamo", "Nwoya", "Oyam", "Pader", "Pallisa", "Rakai", "Rubirizi", "Rukungiri", "Sembabule", "Serere", "Sheema", "Sironko", "Soroti", "Tororo", "Wakiso", "Yumbe", "Zombo"],
  "Zambia": ["Central", "Copperbelt", "Eastern", "Luapula", "Lusaka", "Muchinga", "Northern", "North-Western", "Southern", "Western"],
  "Zimbabwe": ["Bulawayo", "Harare", "Manicaland", "Mashonaland Central", "Mashonaland East", "Mashonaland West", "Masvingo", "Matabeleland North", "Matabeleland South", "Midlands"],
};

const initialFormData = {
  surname: "", first_name: "", middle_name: "", gender: "", date_of_birth: "",
  age: "", nationality: "", marital_status: "", state_of_origin: "", address: "",
  telephone: "", email: "", chosen_programme: "", sponsorship: "", sponsor_organization: "", passport_photo: "", agreed: false,
};

function validateField(name, value) {
  if (name === "agreed") return value ? "" : "You must agree before submitting.";
  if (name === "passport_photo") return value ? "" : "Please upload your passport photograph.";
  if (!String(value || "").trim()) return "This field is required.";
  if (name === "email" && !/^\S+@\S+\.\S+$/.test(value)) return "Enter a valid email address.";
  if (name === "age" && (Number(value) < 1 || Number(value) > 100)) return "Enter an age between 1 and 100.";
  if (name === "telephone" && String(value).replace(/\D/g, "").length < 7) return "Enter a valid telephone number.";
  return "";
}

function FieldError({ message }) {
  return message ? <p className="field-error" role="alert">{message}</p> : null;
}

export default function Course() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingRegistration, setCheckingRegistration] = useState(true);

  const [formData, setFormData] = useState(initialFormData);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [draftLoaded, setDraftLoaded] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!user) {
      if (!loading) window.queueMicrotask(() => setCheckingRegistration(false));
      return;
    }
    let mounted = true;
    supabase.from("students").select("id").eq("user_id", user.id).order("created_at").limit(1).maybeSingle().then(({ data }) => {
      if (!mounted) return;
      if (data) router.push(`/course/registration/${data.id}`);
      else setCheckingRegistration(false);
    }).catch(() => { if (mounted) setCheckingRegistration(false); });
    return () => { mounted = false; };
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const draft = getCachedValue(`registration-draft:${user.id}`);
    if (draft) setFormData((current) => ({ ...current, ...draft }));
    setDraftLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!user || !draftLoaded) return;
    const { passport_photo, ...draft } = formData;
    setCachedValue(`registration-draft:${user.id}`, draft, REGISTRATION_DRAFT_TTL_MS);
  }, [formData, user, draftLoaded]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const safeValue = name === "email" ? sanitizeEmail(value) : sanitizeText(value);
    setFormData((prev) => ({
      ...prev,
      [name]: safeValue,
      ...(name === "sponsorship" && safeValue !== "Scholarship" ? { sponsor_organization: "" } : {}),
    }));
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, safeValue) }));
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleAgreementChange = (e) => {
    const agreed = e.target.checked;
    setFormData((prev) => ({ ...prev, agreed }));
    setTouchedFields((prev) => ({ ...prev, agreed: true }));
    setFieldErrors((prev) => ({ ...prev, agreed: validateField("agreed", agreed) }));
  };

  const handlePassportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.message);
      e.target.value = "";
      return;
    }

    try {
      const filePath = `${user.id}/passport.${validation.extension}`;

      // Reset and start progress simulation
      setUploadProgress(0);
      
      // Simulate progress increments - start immediately visible
      setUploadProgress(1); // Ensure bar is visible immediately
      
      // Simulate progress increments
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          // Slow down progress as it gets higher to simulate realistic upload
          const increment = prev < 30 ? 10 : prev < 70 ? 5 : prev < 90 ? 2 : 1;
          const newProgress = Math.min(prev + increment, 95); // Cap at 95% until upload completes
          return newProgress;
        });
      }, 100); // Update every 100ms for smoother animation

      const { error: uploadError } = await supabase.storage
        .from('student-passports')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: true,
        });

      // Clear progress interval
      clearInterval(progressInterval);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert(`Error uploading passport: ${uploadError.message || "Please try again."}`);
        setUploadProgress(0);
        return;
      }

      // Complete progress
      setUploadProgress(100);

      const { data: { publicUrl } } = supabase.storage
        .from('student-passports')
        .getPublicUrl(filePath);

      setFormData((prev) => ({
        ...prev,
        passport_photo: publicUrl,
      }));
      setTouchedFields((prev) => ({ ...prev, passport_photo: true }));
      setFieldErrors((prev) => ({ ...prev, passport_photo: "" }));

      // Brief pause at 100% then reset
      setTimeout(() => {
        setUploadProgress(0);
      }, 1500);

      alert("Passport photo uploaded successfully!");
    } catch (error) {
      console.error("Passport upload error:", error);
      alert(`Error uploading passport: ${error?.message || "Please try again."}`);
      setUploadProgress(0);
    }
  };

  const fieldsToValidate = formData.sponsorship === "Scholarship" ? [...requiredFields, "sponsor_organization"] : requiredFields;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = Object.fromEntries(
      fieldsToValidate.map((name) => [name, validateField(name, formData[name])]).filter(([, error]) => error)
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouchedFields(Object.fromEntries(fieldsToValidate.map((name) => [name, true])));
      return;
    }

    const rateLimit = consumeRateLimit(`registration:${user.id}`, 20, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      alert(formatRetryMessage(rateLimit.retryAfterMs));
      return;
    }

    setSubmitting(true);

    try {
      const parsed = registrationSchema.safeParse(formData);
      if (!parsed.success) {
        setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])));
        setTouchedFields(Object.fromEntries(fieldsToValidate.map((name) => [name, true])));
        return;
      }
      const { registration } = await authenticatedFetch("/api/registrations", { method: "POST", body: JSON.stringify(parsed.data) });
      invalidateCachedValue(`registration-draft:${user.id}`);
      setRegistrationId(registration.id);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(error.message || "Error submitting application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    if (registrationId) {
      router.push(`/course/registration/${registrationId}`);
    }
  };

  const completedFields = fieldsToValidate.filter(
    (name) => !validateField(name, formData[name])
  ).length;
  const isFormValid = completedFields === fieldsToValidate.length;
  const progress = Math.round((completedFields / fieldsToValidate.length) * 100);

  if (loading || checkingRegistration) {
    return (
      <div className="loading-container">
        <div className="spinner" aria-hidden="true" />
        <p>Loading fashion school...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-modal-overlay">
        <div className="auth-modal">
          <h2>Sign In Required</h2>
          <p>You need to sign in to access the student registration form.</p>
          <div className="auth-buttons">
            <Link href="/sign-in" className="auth-btn primary">
              Sign In
            </Link>
            <Link href="/sign-up" className="auth-btn secondary">
              Sign Up
            </Link>
          </div>
          <button className="close-btn" onClick={() => router.push("/")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="body">
      <>
          <h1 className="header">STUDENT REGISTRATION FORM</h1>
          <Link href="/curriculum" className="curriculum-card">
            <h2>View Our Curriculum</h2>
            <p>
              Haven&apos;t viewed our curriculum yet? Click here to get acquainted
              with the programme, what you&apos;ll learn, and your options before
              registering.
            </p>
            <span aria-hidden="true">Explore the curriculum &rarr;</span>
          </Link>
          <div className="form-container">
            <div className="form-header">
              <h1>Personal Information</h1>
              <div className="registration-progress" aria-label={`${progress}% of registration completed`}>
                <div className="registration-progress-copy">
                  <span>Registration progress</span>
                  <strong>{completedFields} of {requiredFields.length} completed</strong>
                </div>
                <div className="registration-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

        <form onSubmit={handleSubmit} className="form-body" noValidate>
          {/* Surname */}
          <div className="question">
            <div className="question-number">1. Surname/Last Name <span className="required">*</span></div>
            <div className="question-label">Your surname is your family name</div>
            <input
              type="text"
              name="surname"
              className="input-field"
              placeholder="Enter your answer"
              value={formData.surname}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.surname && <FieldError message={fieldErrors.surname} />}
          </div>

          {/* First Name */}
          <div className="question">
            <div className="question-number">2. First Name <span className="required">*</span></div>
            <div className="question-label">The name you are commonly known by</div>
            <input
              type="text"
              name="first_name"
              className="input-field"
              placeholder="Enter your answer"
              value={formData.first_name}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.first_name && <FieldError message={fieldErrors.first_name} />}
          </div>

          {/* Middle Name */}
          <div className="question">
            <div className="question-number">3. Middle Name</div>
            <div className="question-label">An additional name (if you have one)</div>
            <input
              type="text"
              name="middle_name"
              className="input-field"
              placeholder="Enter your answer"
              value={formData.middle_name}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
            />
          </div>

          {/* Gender */}
          <div className="question">
            <div className="question-number">4. Gender <span className="required">*</span></div>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={formData.gender === "Male"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Male
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={formData.gender === "Female"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Female
              </label>
            </div>
            {touchedFields.gender && <FieldError message={fieldErrors.gender} />}
          </div>

          {/* Date of Birth */}
          <div className="question">
            <div className="question-number">5. Date of Birth <span className="required">*</span></div>
            <input
              type="date"
              name="date_of_birth"
              className="input-field"
              value={formData.date_of_birth}
              onChange={(e) => {
                handleInputChange(e);
                // Auto-calculate age when date of birth changes
                if (e.target.value) {
                  const birthDate = new Date(e.target.value);
                  const today = new Date();
                  let age = today.getFullYear() - birthDate.getFullYear();
                  const monthDiff = today.getMonth() - birthDate.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                  }
                  setFormData(prev => ({ ...prev, age: age.toString() }));
                } else {
                  setFormData(prev => ({ ...prev, age: "" }));
                }
              }}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.date_of_birth && <FieldError message={fieldErrors.date_of_birth} />}
          </div>

          {/* Age */}
          <div className="question">
            <div className="question-number">6. Age <span className="required">*</span></div>
            <input
              type="number"
              name="age"
              className="input-field"
              placeholder="Calculated from date of birth"
              min="1"
              max="100"
              value={formData.age}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
              readOnly
            />
            {touchedFields.age && <FieldError message={fieldErrors.age} />}
          </div>

          {/* Nationality */}
          <div className="question">
            <div className="question-number">7. Nationality <span className="required">*</span></div>
            <select
              name="nationality"
              className="input-field"
              value={formData.nationality}
              onChange={(e) => {
                handleInputChange(e);
                // Reset state of origin when the country changes so the
                // selected state always belongs to the chosen nationality.
                setFormData((prev) => ({ ...prev, state_of_origin: "" }));
                setTouchedFields((prev) => ({ ...prev, state_of_origin: false }));
                setFieldErrors((prev) => ({ ...prev, state_of_origin: "" }));
              }}
              onBlur={handleFieldBlur}
              required
            >
              <option value="">Select your nationality</option>
              {africanCountries.map(country => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {touchedFields.nationality && <FieldError message={fieldErrors.nationality} />}
          </div>

          {/* Marital Status */}
          <div className="question">
            <div className="question-number">8. Marital Status <span className="required">*</span></div>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="marital_status"
                  value="Single"
                  checked={formData.marital_status === "Single"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Single
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="marital_status"
                  value="Married"
                  checked={formData.marital_status === "Married"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                Married
              </label>
            </div>
            {touchedFields.marital_status && <FieldError message={fieldErrors.marital_status} />}
          </div>

          {/* State of Origin */}
          <div className="question">
            <div className="question-number">9. State of Origin <span className="required">*</span></div>
            <select
              name="state_of_origin"
              className="input-field"
              value={formData.state_of_origin}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              disabled={!formData.nationality}
              required
            >
              <option value="">
                {formData.nationality ? "Select your state/region" : "Select your nationality first"}
              </option>
              {(africanStates[formData.nationality] || []).map(state => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {touchedFields.state_of_origin && <FieldError message={fieldErrors.state_of_origin} />}
          </div>

          {/* Address */}
          <div className="question">
            <div className="question-number">10. Address <span className="required">*</span></div>
            <textarea
              name="address"
              className="textarea"
              placeholder="Enter your full address"
              value={formData.address}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.address && <FieldError message={fieldErrors.address} />}
          </div>

          {/* Telephone */}
          <div className="question">
            <div className="question-number">11. Telephone <span className="required">*</span></div>
            <input
              type="tel"
              name="telephone"
              className="input-field"
              placeholder="Enter your phone number"
              value={formData.telephone}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.telephone && <FieldError message={fieldErrors.telephone} />}
          </div>

          {/* Email */}
          <div className="question">
            <div className="question-number">12. Email Address <span className="required">*</span></div>
            <input
              type="email"
              name="email"
              className="input-field"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleFieldBlur}
              required
            />
            {touchedFields.email && <FieldError message={fieldErrors.email} />}
          </div>

          {/* Chosen Programme */}
          <div className="question">
            <div className="question-number">13. Chosen Programme <span className="required">*</span></div>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="chosen_programme"
                  value="3 Months Programme"
                  checked={formData.chosen_programme === "3 Months Programme"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                3 Months Programme <span style={{color: 'black'}}>(₦150,000)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="chosen_programme"
                  value="6 Months Programme"
                  checked={formData.chosen_programme === "6 Months Programme"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                6 Months Programme <span style={{color: 'black'}}>(₦200,000)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="chosen_programme"
                  value="1 Year Programme"
                  checked={formData.chosen_programme === "1 Year Programme"}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  required
                />
                1 Year Programme <span style={{color: 'black'}}>(₦300,000)</span>
              </label>
            </div>
            {touchedFields.chosen_programme && <FieldError message={fieldErrors.chosen_programme} />}
          </div>

          <div className="question" role="group" aria-labelledby="sponsorship-heading">
            <div id="sponsorship-heading" className="question-number">14. Sponsorship <span className="required">*</span></div>
            <div className="radio-group">
              {SPONSORSHIP_OPTIONS.map((option) => <label className="radio-option" key={option}>
                <input type="radio" name="sponsorship" value={option} checked={formData.sponsorship === option} onChange={handleInputChange} onBlur={handleFieldBlur} required />
                {option}
              </label>)}
            </div>
            {touchedFields.sponsorship && <FieldError message={fieldErrors.sponsorship} />}
            {formData.sponsorship === "Scholarship" && <label className="sponsor-organization">Sponsoring organization <span className="required">*</span>
              <input className="input-field" name="sponsor_organization" value={formData.sponsor_organization} onChange={handleInputChange} onBlur={handleFieldBlur} placeholder="state the organization sponsoring your training" maxLength={160} required />
              {touchedFields.sponsor_organization && <FieldError message={fieldErrors.sponsor_organization} />}
            </label>}
          </div>

          {/* Passport Photograph */}
          <div className="question">
            <div className="question-number">15. Passport Photograph <span className="required">*</span></div>
            <div className="question-label">Upload a clear passport photo (JPG, JPEG, or PNG, max 5MB)</div>
            <input
              type="file"
              className="input-field"
              accept=".jpg,.jpeg,.png"
              onChange={handlePassportUpload}
              required
            />
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress-container">
                <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
            {uploadProgress === 100 && (
              <div className="upload-progress-container">
                <div className="upload-progress-bar" style={{ width: '100%' }}></div>
              </div>
            )}
            {formData.passport_photo && (
              <div className="passport-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.passport_photo}
                  alt="Passport Preview"
                  className="passport-image"
                />
              </div>
            )}
            {touchedFields.passport_photo && <FieldError message={fieldErrors.passport_photo} />}
          </div>

          <div className="declaration">
            <div className="declaration-text">
              I hereby apply for training at <strong>Elegant Style</strong> and have completed this form to the best of my knowledge.
            </div>
            <label className="agree-checkbox">
              <input type="checkbox" id="agree" checked={formData.agreed} onChange={handleAgreementChange} required />
              <span>I agree</span>
            </label>
            {touchedFields.agreed && <FieldError message={fieldErrors.agreed} />}
          </div>

          <button type="submit" className="submit-btn" disabled={submitting || !isFormValid}>
            {submitting ? (
              <>
                <span className="submit-spinner" aria-hidden="true" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </button>
        </form>
      </div>
        </>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="success-modal-overlay">
          <div className="success-modal">
            <div className="success-icon">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Registration Successful!</h2>
            <p style={{ whiteSpace: "pre-line" }}>{REGISTRATION_COMPLETE_MESSAGE}</p>
            <button className="success-modal-btn" onClick={handleCloseModal}>
              View Registration Details
            </button>
          </div>
        </div>
      )}
      <BackToTopButton />
    </div>
  );
}
```

### src/app/course/registration/[id]/page.js

```javascript
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./registration.module.css";
import Image from "next/image";
import { REGISTRATION_COMPLETE_MESSAGE } from "@/lib/registration.mjs";

export default function RegistrationDetails() {
  const params = useParams();
  const router = useRouter();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchRegistrationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        console.error("Error fetching registration:", error);
      } else {
        if (mounted) setRegistration(data);
      }
    } catch (error) {
      console.error("Error fetching registration:", error);
    } finally {
      if (mounted) setLoading(false);
    }
    };
    fetchRegistrationDetails();
    return () => { mounted = false; };
  }, [params.id]);

  const getProgrammePrice = (programme) => {
    if (programme === "3 Months Programme") {
      return "₦150,000";
    } else if (programme === "6 Months Programme") {
      return "₦200,000";
    } else if (programme === "1 Year Programme") {
      return "₦300,000";
    }
    return "";
  };

  const getAdmissionMessage = (accepted) => {
    if (accepted) {
      return "You have successfully been admitted into Elegant Style Academy";
    }
    return null;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Loading registration details...</p>
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Registration Not Found</h2>
          <p>The registration details could not be found.</p>
          <button onClick={() => router.push("/course")} className={styles.backBtn}>
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Registration Details</h1>
        <p>Application submitted on {new Date(registration.created_at).toLocaleDateString()}</p>
      </div>

      <div className={styles.content}>
        {/* Admission Message (if accepted) */}
        {registration.accepted && (
          <div className={styles.admissionCard}>
            <div className={styles.admissionIcon}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Congratulations!</h2>
            <p>{getAdmissionMessage(registration.accepted)}</p>
          </div>
        )}

        {/* Passport Photo Section */}
        <div className={styles.passportSection}>
          {registration.passport_photo ? (
            <Image
              src={registration.passport_photo}
              alt="Passport Photograph"
              width={200}
              height={200}
              className={styles.passportImage}
            />
          ) : (
            <div className={styles.noPassport}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p>No passport photo uploaded</p>
            </div>
          )}
        </div>

        {/* Personal Information Card */}
        <div className={styles.card}>
          <h2>Personal Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Full Name</label>
              <p>{registration.surname} {registration.first_name} {registration.middle_name || ""}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Gender</label>
              <p>{registration.gender}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Date of Birth</label>
              <p>{new Date(registration.date_of_birth).toLocaleDateString()}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Age</label>
              <p>{registration.age} years</p>
            </div>
            <div className={styles.infoItem}>
              <label>Nationality</label>
              <p>{registration.nationality}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Marital Status</label>
              <p>{registration.marital_status}</p>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className={styles.card}>
          <h2>Contact Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>State of Origin</label>
              <p>{registration.state_of_origin}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Address</label>
              <p>{registration.address}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Telephone</label>
              <p>{registration.telephone}</p>
            </div>
            <div className={styles.infoItem}>
              <label>Email</label>
              <p>{registration.email}</p>
            </div>
          </div>
        </div>

        {/* Programme Information Card */}
        <div className={styles.card}>
          <h2>Programme Information</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Chosen Programme</label>
              <p>{registration.chosen_programme}</p>
            </div>
            <div className={styles.infoItem}><label>Sponsorship</label><p>{registration.sponsorship || "Not recorded"}</p></div>
            {registration.sponsor_organization && <div className={styles.infoItem}><label>Sponsor organization</label><p>{registration.sponsor_organization}</p></div>}
          </div>
        </div>

        {/* Pricing Section (only show if not accepted) */}
        {!registration.accepted && (
          <div className={styles.pricingCard}>
            <h2>Training Cost</h2>
            <p className={styles.price}>{getProgrammePrice(registration.chosen_programme)}</p>
            <p className={styles.priceNote} style={{ whiteSpace: "pre-line" }}>
              {REGISTRATION_COMPLETE_MESSAGE}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {registration.accepted && <p className={styles.priceNote} style={{ whiteSpace: "pre-line" }}>{REGISTRATION_COMPLETE_MESSAGE}</p>}
        <div className={styles.actions}>
          {registration.accepted && (
            <button onClick={() => window.print()} className={styles.printBtn}>
              Print Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### src/app/curriculum/page.js

```javascript
"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./curriculum.module.css";
import ScrollRevealRoot from "@/components/ScrollRevealRoot";
import BackToTopButton from "@/components/BackToTopButton";

function StudentsIcon() {
  return (
    <svg
      className={styles.statSvg}
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg
      className={styles.statSvg}
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7h6M9 11h4" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg
      className={styles.statSvg}
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      <path d="m9 8 2 2 4-4" />
    </svg>
  );
}

const threeMonthModules = [
  {
    number: "Module 01",
    title: "Beginner Sewing & Garment Construction",
    description:
      "Master machine operations, precision stitching, seam allowances, and foundational garment assembly.",
  },
  {
    number: "Module 02",
    title: "Pattern Drafting & Cutting",
    description:
      "Learn accurate body measurements, foundational blocks, dart manipulation, and precise fabric cutting.",
  },
  {
    number: "Module 03",
    title: "Clothing Construction / Cut-and-Sew",
    description:
      "Hands-on construction of essential garments, standard fitting techniques, and professional edge finishing.",
  },
];

const sixMonthModules = [
  {
    number: "Module 01",
    title: "Complete Foundation Track",
    description:
      "Full coverage of beginner sewing mechanics, block drafting, accurate cutting, and core garment assembly.",
  },
  {
    number: "Module 02",
    title: "Fashion Illustration & Sketching",
    description:
      "Figure drawing, translating creative ideas to paper, rendering textures, and designing coherent fashion collections.",
  },
  {
    number: "Module 03",
    title: "Specialized Garment Types",
    description:
      "Advanced tailoring techniques, bespoke collars, structured sleeves, eveningwear, and intricate finishes.",
  },
  {
    number: "Module 04",
    title: "Business & Entrepreneurship",
    description:
      "Costing and pricing strategies, studio setup, client consultation workflow, and launching your own fashion label.",
  },
];

const benefits = [
  "Additional or primary income generation",
  "Entrepreneurship and self-employment opportunities",
  "Practical, marketable technical skills",
  "Creativity and self-expression boost",
  "Improved professional portfolio and credibility",
  "Networking and industry exposure",
];

export default function Curriculum() {
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      const reducedMotionTimer = setTimeout(() => setStudentCount(1000), 0);
      return () => clearTimeout(reducedMotionTimer);
    }

    const target = 1000;
    const duration = 1500;
    const intervalTime = 20;
    const totalSteps = Math.ceil(duration / intervalTime);
    let step = 0;
    let timerId;

    const countUp = () => {
      step += 1;
      const progress = Math.min(step / totalSteps, 1);
      // Ease-out curve for smooth deceleration towards 1000
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeOut * target);
      setStudentCount(current);

      if (progress < 1) {
        timerId = setTimeout(countUp, intervalTime);
      } else {
        setStudentCount(target);
      }
    };

    timerId = setTimeout(countUp, 50);

    return () => clearTimeout(timerId);
  }, []);

  const formattedStudents =
    studentCount >= 1000 ? "1k+" : `${studentCount.toLocaleString()}+`;

  return (
    <ScrollRevealRoot className={styles.page}>
      <div className={styles.pageHeader} data-reveal>
        <span className={styles.eyebrow}>The programme</span>
        <h1 className={styles.pageTitle}>Fashion School Curriculum</h1>
        <p className={styles.pageSubtitle}>
          What you&apos;ll learn on the path to becoming a professional fashion designer
        </p>
      </div>

      <div className={styles.pageContainer}>
        {/* Top Key Metrics Strip - First Content Seen */}
        <section className={styles.statsSection} aria-label="Curriculum highlights & achievements">
          <div className={styles.statsGrid}>
            <div data-reveal data-reveal-delay="0">
              <div className={styles.statCard}>
                <div className={styles.statIconWrapper}>
                  <StudentsIcon />
                </div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>{formattedStudents}</span>
                  <h3 className={styles.statLabel}>Students Empowered</h3>
                  <p className={styles.statDescription}>
                    Trained across bespoke tailoring and professional garment construction.
                  </p>
                </div>
              </div>
            </div>

            <div data-reveal data-reveal-delay="90">
              <div className={styles.statCard}>
                <div className={styles.statIconWrapper}>
                  <CoursesIcon />
                </div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>10</span>
                  <h3 className={styles.statLabel}>Standard Fashion Courses</h3>
                  <p className={styles.statDescription}>
                    Curated modules spanning foundational sewing to advanced couture techniques.
                  </p>
                </div>
              </div>
            </div>

            <div data-reveal data-reveal-delay="180">
              <div className={styles.statCard}>
                <div className={styles.statIconWrapper}>
                  <SuccessIcon />
                </div>
                <div className={styles.statBody}>
                  <span className={styles.statValue}>99%</span>
                  <h3 className={styles.statLabel}>Success Rate</h3>
                  <p className={styles.statDescription}>
                    Of committed graduates establish independent studios or industry careers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Month Programme Section */}
        <section className={styles.programSection}>
          <div className={styles.programHeader} data-reveal>
            <div className={styles.titleWrapper}>
              <span className={styles.programBadge}>Foundation</span>
              <h2 className={styles.programTitle}>3-Month Programme</h2>
            </div>
            <p className={styles.programFee}>&#8358;150,000</p>
          </div>
          <p className={styles.programDescription} data-reveal data-reveal-delay="80">
            An intensive foundational course designed to take you from zero sewing experience to confidently drafting, cutting, and sewing polished everyday garments.
          </p>
          <div className={styles.cardsGrid}>
            {threeMonthModules.map((item, index) => (
              <div key={item.title} data-reveal data-reveal-delay={String(index * 90)}>
                <div className={styles.moduleCard}>
                  <span className={styles.moduleNumber}>{item.number}</span>
                  <h3 className={styles.moduleTitle}>{item.title}</h3>
                  <p className={styles.moduleDescription}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6-Month Programme Section */}
        <section className={styles.programSection}>
          <div className={styles.programHeader} data-reveal>
            <div className={styles.titleWrapper}>
              <span className={styles.programBadge}>Advanced</span>
              <h2 className={styles.programTitle}>6-Month Programme</h2>
            </div>
            <p className={styles.programFee}>&#8358;200,000</p>
          </div>
          <p className={styles.programDescription} data-reveal data-reveal-delay="80">
            Everything in the 3-month foundation track, plus specialized couture techniques, professional fashion illustration, and comprehensive business modules to launch your fashion career.
          </p>
          <div className={styles.cardsGrid}>
            {sixMonthModules.map((item, index) => (
              <div key={item.title} data-reveal data-reveal-delay={String(index * 90)}>
                <div className={styles.moduleCard}>
                  <span className={styles.moduleNumber}>{item.number}</span>
                  <h3 className={styles.moduleTitle}>{item.title}</h3>
                  <p className={styles.moduleDescription}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.programSection}>
          <div className={styles.programHeader} data-reveal>
            <div className={styles.titleWrapper}>
              <h2 className={styles.programTitle}>1-Year Programme</h2>
            </div>
            <p className={styles.programFee}>&#8358;300,000</p>
          </div>
          <p className={styles.programDescription} data-reveal>
            A full year of fashion training. Contact the academy for the detailed training schedule.
          </p>
        </section>

        {/* Benefits Section */}
        <div className={styles.benefitsSection} data-reveal>
          <h3 className={styles.benefitsHeading}>What You Stand to Gain</h3>
          <div className={styles.benefitsGrid}>
            {benefits.map((benefit) => (
              <p key={benefit} className={styles.benefitItem}>
                {benefit}
              </p>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className={styles.ctaBanner} data-reveal>
          <h3>Ready to start your fashion journey?</h3>
          <p>Register now for our upcoming cohort at Elegant Style Academy.</p>
          <Link href="/course" className={styles.ctaButton}>
            Enroll in Fashion School
          </Link>
        </div>
      </div>
      <BackToTopButton />
    </ScrollRevealRoot>
  );
}
```

### src/app/privacy/page.js

```javascript
"use client";
import Link from "next/link";
import { openCookieSettings } from "@/lib/cookieConsent";
import styles from "./privacy.module.css";

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Legal</span>
          <h1>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last updated: <time dateTime="2026-10-17">17 October 2026</time></p>
        </header>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Information We Collect</h2>
            <p>
              Elegant Style is responsible for the personal information handled through elegantstyle.com.ng and our shop and fashion academy at Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State, Nigeria. This policy covers accounts, training applications, bespoke requests, ready-to-wear orders, and the browser storage used to provide these services.
            </p>

            <h3>Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Email address</li>
              <li>Password credentials handled by Supabase Auth, which stores password hashes rather than readable passwords</li>
              <li>Account identifiers, email confirmation and recovery information, session information, and active or inactive account status</li>
            </ul>

            <h3>Student Registration Data</h3>
            <p>When you apply for our fashion school programmes, we collect:</p>
            <ul>
              <li>Full name (surname, first name, middle name)</li>
              <li>Gender</li>
              <li>Date of birth and age</li>
              <li>Nationality</li>
              <li>Marital status</li>
              <li>State of origin</li>
              <li>Residential address</li>
              <li>Telephone number</li>
              <li>Email address</li>
              <li>Chosen programme (3-month, 6-month, or 1-year)</li>
              <li>Sponsorship type (Self sponsored, Guardian, or Scholarship) and the sponsoring organization for a scholarship</li>
              <li>Passport photograph</li>
              <li>Your account identifier, application reference, submission date, and application or admission status</li>
            </ul>
            <p>
              While you complete the application, the site saves a draft of the form fields in this browser, linked to your account, with a 24-hour expiry renewed when you edit the form. The draft excludes the passport photo. Expired drafts are discarded when read, and the draft is removed after successful submission. Other people using the same browser may be able to access locally stored information; clear site data when using a shared device.
            </p>

            <h3>Product and Order Data</h3>
            <p>You can browse the shop and use checkout without creating an account. When you place an order, we collect:</p>
            <ul>
              <li>Your name, email address, and phone number</li>
              <li>Your pickup or delivery choice and, for delivery, your street address, city, and state</li>
              <li>Product identifiers, item names, quantities, prices, delivery charges, and order total</li>
              <li>Order and payment-provider references, payment confirmation and timestamps, and fulfilment progress</li>
              <li>Security identifiers used to recognise the browser that placed the order and avoid reusing a checkout with changed details</li>
            </ul>
            <p>
              Bachs collects payment details on its hosted checkout. We receive payment references and confirmation information, rather than your card number, PIN, or card security code. A saved cart contains product identifiers in your browser; your name and delivery details are collected when you submit checkout.
            </p>

            <h3>Account Order History and Support Requests</h3>
            <p>
              When you open My orders, we link unassigned orders to your account using your verified account email and the email supplied at checkout. We record refund reasons and descriptions of complaints about received products, together with your account, order and product references, receipt confirmation, request status, staff response, review identifier, and timestamps. You can view your own requests; authorised staff can review and update them. Please avoid including unnecessary sensitive information in a request.
            </p>
            <p>
              Paid-order emails include a personal link for confirming that you received the order. We store a hash of the confirmation token and the time you confirm receipt. Opening the email or link alone does not confirm delivery; you must submit the confirmation on the page. Keep the link private, as anyone with it can confirm receipt for that order. Authorised staff can see the recorded confirmation.
            </p>

            <h3>Bespoke Requests</h3>
            <p>When you send a bespoke outfit request through our website, we collect:</p>
            <ul>
              <li>Your name (optional)</li>
              <li>Your phone number, so we can contact you by call or WhatsApp</li>
              <li>Your description of the outfit you want</li>
              <li>Up to four reference photos that you choose to attach, such as fabric or styling inspiration</li>
              <li>A request reference, submission date, and progress status used by our staff to manage your enquiry</li>
            </ul>
            <p>
              Reference images may be converted or compressed on your device before upload. Please only submit images you have permission to share, and avoid unnecessary sensitive information about yourself or another person.
            </p>

            <h3>Automatically Collected Data</h3>
            <p>We may automatically collect certain technical information:</p>
            <ul>
              <li>Identifiers and attempt timestamps used to limit repeated authentication, registration, and other actions; some are stored locally and linked to an email address or account</li>
              <li>IP addresses processed to create hashed identifiers for bespoke-request and checkout abuse prevention; those identifiers are security records and should not be treated as anonymous data</li>
              <li>Your cookie choices, so that we remember your preference (see section 8)</li>
              <li>Technical request and error information processed by hosting and service providers to deliver, troubleshoot, and protect the site</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li><strong>Account management:</strong> To create and manage your account, authenticate your identity, and provide access to our services.</li>
              <li><strong>Student registration:</strong> To process your course application, assess eligibility, manage admissions, and maintain academic records.</li>
              <li><strong>Bespoke requests:</strong> To review your outfit request, contact you about it, and prepare a quote.</li>
              <li><strong>Orders and fulfilment:</strong> To check prices, create and verify a payment, arrange pickup or delivery, manage order progress, and resolve payment or order problems.</li>
              <li><strong>Transactional emails:</strong> To send paid-order receipts, student acceptance messages, and refund or complaint confirmations and updates, and notify the shop of registrations, paid orders, bespoke enquiries, and support requests. These messages are service communications, not optional advertising emails.</li>
              <li><strong>Communication:</strong> To respond to your inquiries, send updates about your application or orders, and provide customer support.</li>
              <li><strong>Service improvement:</strong> To understand how our services are used and improve the user experience.</li>
              <li><strong>Security:</strong> To protect against fraud, abuse, and unauthorized access through rate limiting and input validation.</li>
              <li><strong>Legal compliance:</strong> To comply with applicable laws and regulations in Nigeria, including the Nigeria Data Protection Act 2023.</li>
            </ul>
            <h3>Why we may process your information</h3>
            <p>
              We process information needed to provide a service you request or take steps towards a service agreement, such as reviewing an application, preparing a quote, or fulfilling an order. We also process information to meet legal obligations and for legitimate interests such as protecting the site, preventing fraud, and resolving enquiries, subject to your rights. Where consent is required, including for optional analytics if introduced, we rely on that consent and you may withdraw it. Rejecting optional cookies does not prevent essential service processing.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. Where Your Data Is Stored</h2>
            <p>
              Your data is stored using the following infrastructure:
            </p>
            <ul>
              <li><strong>Supabase database:</strong> Account profiles, student applications and sponsorship details, bespoke requests, shop orders, refund requests, product complaints, staff responses, payment and fulfilment records, and security identifiers are stored in Supabase. Database policies and server-side access checks restrict account, application, and request records to the relevant users or authorised staff.</li>
              <li><strong>Supabase Storage:</strong> Product images, student passport photographs, and bespoke reference photos are stored in Supabase. Product images are public. The student photo feature currently uses public image links; anyone who obtains a working public link may be able to view the photo. Bespoke reference photos are kept in a private bucket and made available to authorised staff through the administrative area or temporary signed links.</li>
              <li><strong>Supabase Auth:</strong> Email addresses, password hashes, authentication sessions, confirmation, and password recovery are handled through Supabase&apos;s authentication service. Our staff cannot read your stored password.</li>
              <li><strong>Resend and email recipients:</strong> Resend delivers bespoke notifications to the shop, which may include your name, phone number, request description, reference images as attachments, and temporary image links valid for seven days. For verified paid orders, it delivers a receipt to your supplied email address and an order notification to the shop. These emails include the order reference, items, amounts, and pickup or delivery details; the shop notification also includes your contact details. Copies can remain in the recipient&apos;s mailbox.</li>
              <li><strong>Registration and support emails:</strong> Resend sends the shop your submitted registration details, including sponsorship and organization, and sends an acceptance message to the email on an accepted application. It sends refund and complaint confirmations and status updates to your account email and new-request alerts to the shop, including references, product name, description, status, and any staff response. Copies can remain in recipients&apos; mailboxes.</li>
              <li><strong>Bachs (payments):</strong> When you check out, we send your name, email, phone number, order reference and payment amount to Bachs. You enter payment details on Bachs&apos;s secure checkout. We store your order items, delivery address, contact details and payment confirmation in Supabase; we do not receive your card number, PIN or security code.</li>
              <li><strong>Vercel hosting:</strong> Vercel serves the website and runs the server functions that process checkout, payment notifications, and bespoke submissions. Submitted information passes through these functions, and operational logs may contain request, reference, or error information.</li>
            </ul>
            <p>
              These providers may process information outside Nigeria. International transfers are subject to applicable Nigerian data-protection requirements. Contact us if you need information about the processing locations and safeguards relevant to your data.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul>
              <li><strong>Service providers:</strong> Supabase provides authentication and storage, Vercel provides hosting and server functions, Resend delivers service emails, and Bachs processes checkout payments.</li>
              <li><strong>Authorised staff:</strong> Staff use the administrative area to review applications, manage bespoke requests, and process orders. Accepted-student management is not a public directory. Necessary order and contact details may be shared with people arranging your pickup or delivery.</li>
              <li><strong>Legal requirements:</strong> We may disclose your information if required by law, regulation, or legal process, or to protect our rights, property, or safety.</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              <li><strong>Consent:</strong> We may share your information with your explicit consent.</li>
            </ul>
            <p>
              If you follow a Facebook, WhatsApp, or other external link, or use Bachs&apos;s checkout, the destination service handles information under its own policies. We do not operate those services. We do not use an uploaded application photo or bespoke reference image for public marketing simply because you submitted it.
            </p>
          </section>

          <section className={styles.section}>
            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information:
            </p>
            <ul>
              <li>All data transmission is encrypted using HTTPS/TLS</li>
              <li>Passwords are hashed and managed by Supabase Auth (never stored in plaintext)</li>
              <li>Database policies and server-side authentication checks limit access to application and administrative data</li>
              <li>Online order-status access requires a browser-specific cookie; payment confirmations are checked before an order is marked paid</li>
              <li>Input sanitization is applied to prevent injection attacks</li>
              <li>Rate limiting protects against brute-force and abuse attempts</li>
              <li>File uploads are validated for type and size</li>
            </ul>
            <p>
              However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Your Data Rights</h2>
            <p>You have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Access:</strong> You can request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> You can request that we correct any inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> You can ask us to delete your personal data, subject to records we must lawfully retain. Deactivation in the account dashboard makes the account inactive and signs you out; it does not delete the authentication account, application, photos, orders, support requests, or emails. Contact us separately to request deletion or reactivation.</li>
              <li><strong>Data portability:</strong> You can request a copy of your data in a portable format.</li>
              <li><strong>Objection:</strong> You can object to certain processing of your personal data.</li>
              <li><strong>Withdraw consent:</strong> Where we rely on your consent, such as for optional cookies, you can withdraw it at any time. See section 8 for how to change your cookie choices.</li>
            </ul>
            <p>
              Contact us using the details below to exercise a right or correct an order or application. We may need to verify your identity before providing or deleting information. Rights are subject to applicable legal conditions and retention obligations; withdrawing consent does not undo processing that was already lawful. If you are not satisfied with our response, you may complain to the <a href="https://ndpc.gov.ng/" className={styles.internalLink} target="_blank" rel="noopener noreferrer">Nigeria Data Protection Commission</a>.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Data Retention</h2>
            <p>
              We retain your personal data for as long as necessary to provide our services and fulfill the purposes outlined in this policy:
            </p>
            <ul>
              <li><strong>Account data:</strong> Kept to provide account services and handle related obligations. Deactivating an account does not automatically delete its records; contact us about deletion.</li>
              <li><strong>Student registration data:</strong> Retained for academic record-keeping purposes throughout your programme and thereafter as required by applicable regulations.</li>
              <li><strong>Application drafts:</strong> Saved locally with a 24-hour expiry renewed on editing, discarded when an expired draft is read, and removed after successful submission. You can remove local drafts by clearing site data.</li>
              <li><strong>Bespoke requests:</strong> Kept while we assess and fulfil the request and handle follow-up or disputes. Removing a request queues its referenced photos for cleanup from site storage; this does not automatically erase copies already sent by email.</li>
              <li><strong>Shop orders:</strong> Kept to process pickup or delivery, provide support, address disputes, and retain necessary payment and business records. The seven-day order-access cookie expiry does not delete the order.</li>
              <li><strong>Emails and provider records:</strong> Service emails and payment records may remain with recipients or providers under their retention practices and applicable obligations. A deletion request should identify any related order, application, or bespoke request.</li>
              <li><strong>Security records:</strong> Attempt counters use time-based limits, but the end of a rate-limit window does not necessarily erase its underlying identifiers or records. Such records may be kept to investigate abuse or security incidents.</li>
            </ul>
            <p>
              We do not currently publish a single automatic deletion period for all server records. Retention depends on the purpose and applicable obligations; contact us for information about a particular record or to request deletion. Browser storage can remain on your device until it expires and is cleared by the site, or you clear it yourself.
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Cookies and Similar Storage</h2>
            <p>We use cookies and local or session browser storage for essential services and to remember optional cookie choices:</p>
            <ul>
              <li><strong>Sign-in and security:</strong> Authentication session information and local attempt counters support sign-in, recovery, registration, and abuse prevention.</li>
              <li><strong>Shopping:</strong> Local storage saves your cart&apos;s product identifiers and payment-confirmation markers. Session storage can remember a pending order reference so you can return to its payment status.</li>
              <li><strong>Order access:</strong> An HTTP-only order-access cookie, valid for seven days and sent over secure connections in production, allows the browser that placed an order to retrieve its status. An order reference alone is insufficient. Clearing site data or using another browser may remove that access; contact us with your reference for help.</li>
              <li><strong>Application drafts:</strong> Local browser storage saves application form fields, excluding the passport photo, with the 24-hour expiry described above.</li>
              <li><strong>Cookie preferences:</strong> Browser storage and a first-party cookie named &ldquo;cookie_consent&rdquo; record your choice for up to 180 days, after which we ask again.</li>
              <li><strong>Analytics and performance (optional, off by default):</strong> We do not currently run analytics. If we add it in future, it will only run if you have allowed it.</li>
            </ul>
            <p>
              We do not currently use advertising cookies, tracking pixels, or third-party analytics. Loading placeholders, scroll animations, and responsive layouts work whether you accept or reject optional cookies. Bachs may use its own necessary storage on its hosted payment page.
            </p>

            <h3>Your cookie choices</h3>
            <p>
              On your first visit, you can accept all cookies, reject optional cookies, or customise your choice. You can change your mind at any time:
            </p>
            <p>
              <button type="button" className={styles.cookieButton} onClick={openCookieSettings}>
                Change cookie settings
              </button>
            </p>
            <p>
              You can also clear cookies and site data in your browser settings. This may sign you out and remove your cart, application draft, cookie choice, and online order access. It does not delete submitted applications or orders from our server records. We will ask for your cookie choice again.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Children&apos;s Privacy</h2>
            <p>
              Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information promptly.
            </p>
            <p>
              Users under 18 must involve a parent or legal guardian before submitting personal information or applying for training. A parent or guardian should contact us to arrange any consent required for the application and any service agreement. If you believe a child&apos;s information has been submitted without appropriate permission, contact us so we can review it and take the required action.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised &ldquo;Last updated&rdquo; date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
            </p>
            <ul>
              <li>Email: <a href="mailto:patrickesther26@gmail.com" className={styles.internalLink}>patrickesther26@gmail.com</a></li>
              <li>WhatsApp: <a href="https://wa.me/2348166361710" className={styles.internalLink} target="_blank" rel="noopener noreferrer">08166361710</a></li>
              <li>Address: Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State.</li>
            </ul>
          </section>
        </div>

        <footer className={styles.footer}>
          <Link href="/" className={styles.backLink}>Return to Home</Link>
          <Link href="/terms" className={styles.internalLink}>Terms of Service</Link>
        </footer>
      </div>
    </div>
  );
}
```

### src/app/terms/page.js

```javascript
"use client";
import Link from "next/link";
import styles from "./terms.module.css";

export default function TermsOfService() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Legal</span>
          <h1>Terms of Service</h1>
          <p className={styles.lastUpdated}>Last updated: <time dateTime="2026-10-17">17 October 2026</time></p>
        </header>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Who May Use the Services</h2>
            <p>
              These terms apply to elegantstyle.com.ng and the ready-to-wear clothing, bespoke tailoring enquiries, and fashion design training provided by Elegant Style at Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State, Nigeria.
            </p>
            <p>
              You may use our website if you are at least 13 years of age. If you are under 18, you must involve a parent or legal guardian before submitting personal information, applying for training, or making a purchase. A parent or guardian must authorise any purchase or service agreement on your behalf.
            </p>
            <p>
              We may restrict access or suspend accounts where necessary to address misuse, fraud, security risks, or breaches of these terms, subject to applicable law. Browsing the shop, sending a bespoke enquiry, and using guest checkout do not require an account. Submitting a fashion school application requires sign-in.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Privacy</h2>
            <p>
              Our Privacy Policy explains how we handle account information, application details and drafts, uploaded photographs, bespoke enquiries, orders, and payments. Optional cookie choices are separate from acceptance of these terms; you can reject optional cookies and still use the site.
            </p>
            <p>
              Key points regarding your data:
            </p>
            <ul>
              <li>Supabase provides account authentication, database storage, and photo storage; passwords are stored as hashes</li>
              <li>School applications and saved browser drafts contain the information entered in the application form</li>
              <li>Bachs processes ready-to-wear payments, and Resend delivers bespoke, registration, paid-order, refund, and complaint service emails</li>
              <li>We do not sell, trade, or rent your personal information to third parties</li>
              <li>Account deactivation and deletion of personal data are separate requests</li>
            </ul>
            <p>
              Please review our <Link href="/privacy" className={styles.internalLink}>Privacy Policy</Link> for full details.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. Content on the Services</h2>
            <p>
              All content provided through our services is owned by Elegant Style or our licensors and is protected by copyright, trademark, and other intellectual property laws. This includes:
            </p>
            <ul>
              <li>Product images, descriptions, and prices</li>
              <li>Website design, layout, and branding</li>
              <li>Course materials, curriculum, and educational content</li>
              <li>Testimonials and client reviews</li>
              <li>Logos, trademarks, and service marks</li>
            </ul>
            <p>
              You may not reproduce, distribute, modify, or create derivative works from any content on our services without our express written permission.
            </p>
            <p>
              You must have permission to submit photographs or other material, including images showing another person. You allow us to store and use submitted material to assess your application or enquiry and provide the requested service. A reference photo helps explain your preferences; it does not transfer ownership or require us to reproduce someone else&apos;s protected design. Submitting personal information or a reference photo does not give us permission to publish it for marketing.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Using the Services</h2>
            <h3>Account Responsibilities</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
            <p>
              Use an email address you control and complete email confirmation when prompted. Password recovery is available through the sign-in page. The profile avatar opens your account dashboard, where you can view your details, change your password, and deactivate your account after confirming your current password. If you signed in with Google and have no password, use password recovery to set one before these password-confirmed actions. Deactivation marks the account inactive, disables account access, and signs you out; it does not erase applications, orders, support requests, or other records. Contact us separately about reactivation, deletion, or an existing order.
            </p>

            <h3>Course Registration</h3>
            <p>
              Provide accurate application details and a passport photograph in JPG or PNG format, up to 5 MB. Select a sponsorship type and, for Scholarship, name the organization sponsoring your training. A sponsorship selection does not itself award funding or confirm an arrangement with that organization. The current programmes are 3 months (&#8358;150,000), 6 months (&#8358;200,000), and 1 year (&#8358;300,000). After registration, visit the academy from Monday to Friday, 8am to 5pm, for payment details, orientation, and physical verification, as instructed on your registration confirmation. The ready-to-wear checkout does not collect course fees.
            </p>
            <p>
              An application acknowledgement or registration reference confirms submission, not admission. Our staff review applications and update their status. Your registration details show your application information and admission outcome. Accepted-student management is restricted to the administrative area. Draft details may be saved on your device while you complete the form, as explained in the Privacy Policy.
            </p>
            <p>
              The shop receives a registration notification, and we attempt to send an acceptance email when an application is first accepted. Email delivery can fail or be delayed; check your registration details for the recorded decision or contact the academy. A missing email does not require another application.
            </p>

            <h3>Product Purchases</h3>
            <p>
              Ready-to-wear products are subject to availability. Prices are shown in Nigerian Naira (NGN), and the items, current prices, discounts, and delivery charge are checked again when checkout starts. Adding an item to your cart does not reserve it or lock its price. Checkout currently allows up to 10 of each item and 20 different items. A change to a displayed price does not by itself change a payment already confirmed for an order.
            </p>
            <h3>Payments and Receipts</h3>
            <p>
              Ready-to-wear payments are made on Bachs&apos;s hosted checkout. Provide a valid email address and Nigerian phone number, and review the total before paying. We do not ask you to enter your card number, PIN, or card security code on this website. Returning from the payment page, closing it, or receiving an order reference does not by itself confirm payment. The order status page shows confirmation after the payment is verified.
            </p>
            <p>
              After verified payment, the site attempts to email a receipt to the address you supplied and an order notification to the shop. Email delivery can fail or be delayed; a missing email does not mean payment failed. Check the order status or contact us with your reference before paying again. If a payment is pending, needs review, or its setup could not be confirmed, contact us before starting another payment. Use the resume-payment link when the status page offers one for an unpaid order.
            </p>
            <p>
              Online order status is tied to the browser used to place the order through an order-access cookie valid for seven days. Clearing site data, using another browser or device, or waiting until the cookie expires may prevent online access. Keep your order reference and contact us if you need help recovering order information. An order reference alone does not give access to the online status page.
            </p>
            <h3>Pickup, Delivery, and Order Progress</h3>
            <p>
              Pickup from our Yenagoa address and delivery within Yenagoa are free. Delivery elsewhere in Nigeria costs &#8358;2,000, included in the total before payment. Provide an accurate delivery address, city, state, and contact number. We will contact you to arrange pickup or delivery; the website does not promise a delivery date merely because payment has succeeded.
            </p>
            <p>
              Payment status and fulfilment progress are separate. Paid orders can move through processing, ready for pickup or dispatch, shipped where applicable, and completed. Our staff update fulfilment progress; a paid status alone does not mean an order has been dispatched or is ready to collect.
            </p>
            <p>
              Your payment email includes an &ldquo;I have received the product&rdquo; link. Only submit its confirmation after you have received every product in that order. The confirmation records your acknowledgement and its time separately from staff fulfilment updates. Opening the email or link alone does not confirm receipt, and acknowledging receipt does not remove any applicable rights concerning faulty or incorrect products.
            </p>
            <h3>Order Changes, Cancellations, and Problems</h3>
            <p>
              Contact us with your order reference as soon as possible if you need to change or cancel an order, have paid twice, or receive an incorrect, damaged, or faulty item. Signed-in customers can view paid orders matched to their verified account email, submit a refund reason for an ordered product, or describe a complaint about a product they confirm they received. Requests and staff responses appear in the account dashboard, and we attempt to send confirmation and status emails. Contact the shop if an order used a different email or you cannot access your account.
            </p>
            <p>
              Submitting a refund request does not guarantee approval. Approval records the shop&apos;s decision; it does not automatically return funds. The shop arranges any payment refund separately through Bachs and discusses any return or collection arrangements with you. There is one refund request and one complaint per product per order; contact the shop with the existing reference for further information. These terms do not remove any cancellation, refund, quality, or other consumer rights that cannot lawfully be excluded.
            </p>
            <p>
              Buy again adds one unit of an available product to your cart. Current availability, price, and delivery charges apply when you start the new checkout; an earlier purchase does not reserve stock or guarantee its previous price.
            </p>

            <h3>Bespoke Services</h3>
            <p>
              The bespoke request form lets you describe an outfit, provide a contact phone number, optionally give your name, and attach up to four reference photos of up to 5 MB each. Supported image formats are shown on the form, and images may be converted or compressed on your device before upload. Only upload material you have permission to share, and avoid including unnecessary sensitive information.
            </p>
            <p>
              Submitting a request is an enquiry, not a confirmed booking or paid order. We may contact you by phone or WhatsApp to discuss measurements, availability, a quote, and next steps. Price, specifications, timing, any deposit, and cancellation arrangements are agreed separately before work proceeds, subject to your applicable consumer rights. The ready-to-wear checkout does not collect bespoke deposits.
            </p>

            <h3>Acceptable Use</h3>
            <p>
              You agree not to:
            </p>
            <ul>
              <li>Use our services for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the integrity of our services</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Use automated systems to access our services without permission</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Disclaimers and Limitations of Liability</h2>
            <h3>No Warranties</h3>
            <p>
              Our services are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We make no warranties, express or implied, regarding the reliability, accuracy, or availability of our services.
            </p>

            <h3>Limitation of Liability</h3>
            <p>
              To the fullest extent permitted by applicable law, Elegant Style shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of our services.
            </p>
            <p>
              Subject to rights and liabilities that cannot lawfully be excluded or limited, our total liability for claims arising from these terms or your use of our services shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or one thousand Nigerian Naira (&#8358;1,000), whichever is greater. Nothing in this section limits a mandatory consumer remedy or a liability that applicable law does not allow us to limit.
            </p>

            <h3>Third-Party Links</h3>
            <p>
              Our services may contain links to third-party websites or services. We are not responsible for the content, privacy policies, or practices of any third-party sites.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. General</h2>
            <h3>Governing Law</h3>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions.
            </p>

            <h3>Dispute Resolution</h3>
            <p>
              Please contact us first so we can try to resolve a complaint in good faith. If it remains unresolved, you may pursue the remedies available under applicable law, including a complaint to the <a href="https://fccpc.gov.ng/consumers/consumer-rights-responsibilities/rights-responsibilities/" className={styles.internalLink} target="_blank" rel="noopener noreferrer">Federal Competition and Consumer Protection Commission</a> or the courts with jurisdiction. Arbitration may be used where lawfully agreed; these terms do not make it your only remedy.
            </p>

            <h3>Changes to Terms</h3>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of material changes by posting the updated terms on this page with a revised &ldquo;Last updated&rdquo; date. Your continued use of our services after changes are posted constitutes acceptance of the updated terms.
            </p>

            <h3>Contact Information</h3>
            <p>
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <ul>
              <li>Email: <a href="mailto:patrickesther26@gmail.com" className={styles.internalLink}>patrickesther26@gmail.com</a></li>
              <li>WhatsApp: <a href="https://wa.me/2348166361710" className={styles.internalLink} target="_blank" rel="noopener noreferrer">08166361710</a></li>
              <li>Address: Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State.</li>
            </ul>
          </section>
        </div>

        <footer className={styles.footer}>
          <Link href="/" className={styles.backLink}>Return to Home</Link>
          <Link href="/privacy" className={styles.internalLink}>Privacy Policy</Link>
        </footer>
      </div>
    </div>
  );
}
```

### src/components/CookieConsent.js

```javascript
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCookieConsent, saveCookieConsent, OPEN_SETTINGS_EVENT } from "@/lib/cookieConsent";
import styles from "./CookieConsent.module.css";

// Cookie consent: a banner on the first visit and a settings panel. The panel can be reopened from
// anywhere with openCookieSettings() (the privacy page has a button for it). Choices are saved by
// src/lib/cookieConsent.js.
export default function CookieConsent() {
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = getCookieConsent();
      setConsent(saved);
      setShowBanner(!saved);
      setAnalytics(saved?.analytics ?? false);
      setReady(true);
    });

    const openFromElsewhere = () => {
      setAnalytics(getCookieConsent()?.analytics ?? false);
      setShowSettings(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, openFromElsewhere);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(OPEN_SETTINGS_EVENT, openFromElsewhere);
    };
  }, []);

  useEffect(() => {
    if (!showSettings) return undefined;

    panelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSettings]);

  const choose = (allowAnalytics) => {
    const saved = saveCookieConsent({ analytics: allowAnalytics });
    setConsent(saved);
    setAnalytics(saved.analytics);
    setShowBanner(false);
    setShowSettings(false);
  };

  const openSettings = () => {
    setAnalytics(consent?.analytics ?? false);
    setShowSettings(true);
  };

  if (!ready) return null;

  return (
    <>
      {showBanner && !showSettings && (
        <section
          className={styles.banner}
          role="dialog"
          aria-labelledby="cookie-title"
          aria-describedby="cookie-text"
        >
          <h2 id="cookie-title" className={styles.title}>We value your privacy</h2>
          <p id="cookie-text" className={styles.text}>
            We use essential cookies and similar storage to keep you signed in, remember your cart and keep the site
            secure. With your permission we would also like to use optional analytics to improve the site. You can
            change your mind at any time.{" "}
            <Link href="/privacy" className={styles.link}>Read our privacy policy</Link>
          </p>
          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => choose(true)}>
              Accept all
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={() => choose(false)}>
              Reject non-essential
            </button>
            <button type="button" className={styles.customise} onClick={openSettings}>
              Customise
            </button>
          </div>
        </section>
      )}

      {showSettings && (
        <div className={styles.overlay} role="presentation" onClick={() => setShowSettings(false)}>
          <section
            ref={panelRef}
            tabIndex={-1}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.panelHead}>
              <h2 id="cookie-settings-title" className={styles.panelTitle}>Cookie settings</h2>
              <button type="button" className={styles.close} onClick={() => setShowSettings(false)} aria-label="Close cookie settings">
                &times;
              </button>
            </div>
            <p className={styles.panelText}>
              Choose which cookies and similar storage we may use. Your choice is saved on this device and you can
              change it whenever you like.
            </p>

            <div className={styles.option}>
              <div>
                <h3 className={styles.optionTitle}>Strictly necessary</h3>
                <p className={styles.optionText}>
                  Keeps you signed in, remembers your cart and protects the site against abuse. The site cannot work
                  without these, so they are always on.
                </p>
              </div>
              <span className={styles.alwaysOn}>Always on</span>
            </div>

            <div className={styles.option}>
              <div>
                <h3 className={styles.optionTitle}>Analytics and performance</h3>
                <p className={styles.optionText}>
                  Helps us understand which pages are used so we can improve the site. If we use analytics, it will only
                  run when you switch this on.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={analytics}
                aria-label="Allow analytics and performance cookies"
                className={`${styles.switch} ${analytics ? styles.switchOn : ""}`}
                onClick={() => setAnalytics((current) => !current)}
              >
                <span className={styles.knob} />
              </button>
            </div>

            <div className={styles.panelActions}>
              <button type="button" className={`${styles.btn} ${styles.btnDark}`} onClick={() => choose(analytics)}>
                Save my choices
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnOutlineDark}`} onClick={() => choose(true)}>
                Accept all
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnOutlineDark}`} onClick={() => choose(false)}>
                Reject non-essential
              </button>
            </div>
            <p className={styles.panelFoot}>
              <Link href="/privacy" className={styles.footLink}>Privacy policy</Link>
            </p>
          </section>
        </div>
      )}
    </>
  );
}
```

### src/components/Navbar.js

```javascript
'use client';

import React, { useState, useEffect } from 'react';
import styles from '../components/Navbar.module.css';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const LoginIcon = () => (
  <svg className={styles.authIcon} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
);

const UserPlusIcon = () => (
  <svg className={styles.authIcon} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const LogoutIcon = () => (
  <svg className={styles.authIcon} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const CollectionIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8h12l1 13H5L6 8Z" />
    <path d="M9 8a3 3 0 0 1 6 0" />
  </svg>
);

const SchoolIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 10 9-5 9 5-9 5-9-5Z" />
    <path d="M7 12.5V17c2.8 2 7.2 2 10 0v-4.5" />
    <path d="M21 10v6" />
  </svg>
);

const AboutIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);

const HomeIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 10 9-7 9 7" />
    <path d="M5 9v11h14V9" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

const AdminIcon = () => (
  <svg className={styles.navIcon} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 4 6v6c0 4.5 3.2 8.2 8 9 4.8-.8 8-4.5 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const getEmailInitials = (email) => {
  const localPart = email?.split('@')[0]?.trim() || '';
  const parts = localPart.split(/[._-]+/).filter(Boolean);

  if (parts.length > 1) {
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase() || '?';
};

const ProfileMenu = ({ mobile = false, user, onNavigate }) => (
  <div className={`${styles.profileMenuWrapper} ${mobile ? styles.mobileProfileMenuWrapper : ""}`}>
    <Link href="/account" onClick={onNavigate}
      className={`${styles.profileIcon} ${mobile ? styles.mobileProfileIcon : styles.drawerProfileIcon}`}
      title={user.email || "My account"} aria-label="Open my account">
      {getEmailInitials(user.email)}
    </Link>
  </div>
);

function NavbarContent({ user, logout, isAdmin }) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const lastScrollY = React.useRef(0);
  const menuButton = React.useRef(null);
  const menuPanel = React.useRef(null);
  const closeMenu = () => setIsMenuOpen(false);
  const toggleMenu = () => setIsMenuOpen((previous) => !previous);

  useEffect(() => {
    if (!isMenuOpen) return;
    const links = () => [...menuPanel.current.querySelectorAll('a[href], button:not(:disabled)')]
      .filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => links()[0]?.focus());
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === 'Tab') {
        const controls = [menuButton.current, ...links()];
        const index = controls.indexOf(document.activeElement);
        if (index === -1 || (!event.shiftKey && index === controls.length - 1) || (event.shiftKey && index === 0)) {
          event.preventDefault();
          controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', handleKey); };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    logout();
    router.push('/');
    router.refresh();
    try { await supabase.auth.signOut({ scope: 'local' }); }
    catch (error) { console.error('Local logout error:', error); }
    supabase.auth.signOut({ scope: 'global' }).catch((error) => console.error('Global logout error:', error));
  };

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Close the drawer automatically if the viewport grows past mobile width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide navbar on scroll down, show on scroll up
  useEffect(() => {
    let frame = null;
    const updateNavbar = () => {
      frame = null;
      if (isMenuOpen) return;

      const currentScrollY = window.scrollY;
      if (currentScrollY < 80) {
        setIsNavbarVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsNavbarVisible(false);
      } else {
        setIsNavbarVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    const handleScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateNavbar);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [isMenuOpen]);

  return (
    <nav className={`${styles.nav} ${isNavbarVisible ? '' : styles.navHidden}`}>
      <div className={styles.navContent}>
        <div className={styles.logoSection}>
          <Link href="/" className={styles.logo} onClick={closeMenu}>
            <Image
              src="/images/elegant-style-navbar.png"
              alt="Elegant Style"
              width={1900}
              height={636}
              className={styles.logoImage}
              sizes="111px"
              priority
            />
          </Link>
        </div>

        {user && (
          <ProfileMenu mobile user={user} onNavigate={closeMenu} />
        )}

        <button
          ref={menuButton}
          className={`${styles.hamburger} ${isMenuOpen ? styles.hamburgerOpen : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Backdrop overlay for the mobile drawer */}
        <div
          className={`${styles.backdrop} ${isMenuOpen ? styles.backdropOpen : ''}`}
          onClick={closeMenu}
          aria-hidden="true"
        ></div>

        <div ref={menuPanel} id="primary-navigation" className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksOpen : ""}`}>
          <Link href="/" className={styles.drawerLogo} onClick={closeMenu} aria-label="Elegant Style home">
            <Image src="/images/elegant-style-navbar.png" alt="Elegant Style" width={1900} height={636} sizes="160px" className={styles.drawerLogoImage} />
          </Link>
          <div className={styles.navMenu}>
            <Link href="/" onClick={closeMenu}>
              <HomeIcon />
              HOME
            </Link>
            <Link href="/ready-to-wear" onClick={closeMenu}>
              <CollectionIcon />
              READY-TO-WEAR
            </Link>
            <Link href="/course" onClick={closeMenu}>
              <SchoolIcon />
              FASHION ACADEMY
            </Link>
            <Link href="/about" onClick={closeMenu}>
              <AboutIcon />
              ABOUT US
            </Link>
            {/* Only people with an admin account ever see this link. */}
            {user && isAdmin && (
              <Link href="/admin" onClick={closeMenu}>
                <AdminIcon />
                ADMIN
              </Link>
            )}
          </div>

          <div className={styles.authSection}>
            {user ? (
              <>
                <ProfileMenu user={user} onNavigate={closeMenu} />
                <button
                  onClick={handleLogout}
                  className={styles.navLogout}
                >
                  <LogoutIcon />
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  className={styles.authLink}
                  href="/sign-in"
                  onClick={closeMenu}
                >
                  <LoginIcon />
                  Sign In
                </Link> 
                <Link
                  className={`${styles.authLink} ${styles.authLinkPrimary}`}
                  href="/sign-up"
                  onClick={closeMenu}
                >
                  <UserPlusIcon />
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Changing accounts remounts the navbar and clears menus, forms, and pending UI state.
export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  return (
    <NavbarContent
      key={user?.id ?? 'signed-out'}
      user={user}
      logout={logout}
      isAdmin={isAdmin}
    />
  );
}
```

### src/components/Navbar.module.css

```css
/* ====================== NAVIGATION ====================== */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: #F7F2E9;
  color: #000;
  z-index: 1000;
  padding: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  transition: transform 0.3s ease, visibility 0.3s ease;
}

.navHidden {
  transform: translateY(-100%);
  visibility: hidden;
}

.navContent {
  max-width: 1400px;
  margin: 0 auto;
  min-height: 70px;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.logoSection {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 600;
  color: #000;
  text-decoration: none;
  white-space: nowrap;
}

.logoImage {
  display: block;
  width: clamp(82.5px, 9vw, 111px);
  height: auto;
}

@media (max-width: 768px) {
  .logoImage {
    width: 108px;
  }
}

/* .logo::after {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gold);
  align-self: center;
} */

/* Wraps the menu links + divider + auth section as one aligned unit */
.navLinks {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-shrink: 0;
}

.navMenu {
  display: flex;
  align-items: center;
  gap: 2rem;
}

/* Thin separator between the nav links and the auth controls,
   so the two groups read as visually distinct clusters */
.navDivider {
  width: 1px;
  height: 18px;
  background: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.authSection {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.navMenu a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;
  color: #000;
  font-size: 0.85rem;
  font-weight: 400;
  letter-spacing: 0.15em;
  transition: color 0.3s ease;
  position: relative;
}

.navIcon {
  flex-shrink: 0;
}

.navMenu a::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--gold-deep);
  transition: width 0.3s ease;
}

.navMenu a:hover {
  color: #000;
}

.navMenu a:hover::after {
  width: 100%;
}

/* Authentication Links */
.authSection a.authLink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding: 0 0.8rem;
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 6px;
  color: #000;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-decoration: none;
  transition: all 0.3s ease;
}

.authSection a.authLink:hover {
  color: #000;
  border-color: rgba(0, 0, 0, 0.6);
  background: rgba(0, 0, 0, 0.05);
}

.authSection a.authLinkPrimary {
  background: var(--gold);
  color: #000;
  border: 1px solid var(--gold-deep);
  font-weight: 600;
}

.authSection a.authLinkPrimary:hover {
  background: var(--gold-bright);
  border-color: var(--gold-deep);
  color: #000;
}

.authIcon {
  flex-shrink: 0;
  width: 13px;
  height: 13px;
}

.navLogout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding: 0 0.8rem;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.25);
  border-radius: 6px;
  color: #000;
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.navLogout:hover {
  border-color: rgba(0, 0, 0, 0.6);
  background: rgba(0, 0, 0, 0.05);
  color: #000;
}

.profileIcon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--gold);
  border-radius: 50%;
  background: var(--gold);
  color: #000;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  flex-shrink: 0;
}

.profileMenuWrapper {
  position: relative;
}

.profileMenuWrapper > .profileIcon {
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}

.profileMenu {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  z-index: 1002;
  min-width: 210px;
  padding: 0.35rem;
  background: #F7F2E9;
  border: 1px solid var(--line);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

.profileMenu button {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  min-height: 40px;
  padding: 0.65rem 0.75rem;
  border: 0;
  background: transparent;
  color: #000;
  font: inherit;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
}

.profileMenu button:hover,
.profileMenu button:focus-visible {
  background: rgba(0, 0, 0, 0.05);
}

.cartCount {
  margin-left: auto;
  color: var(--stone);
  font-size: 0.75rem;
}

.profileMenu .deactivateAction {
  border-top: 1px solid var(--line);
  color: var(--danger);
}

.accountModalOverlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgba(20, 18, 13, 0.62);
}

.accountModal {
  width: min(100%, 430px);
  padding: 2rem;
  background: var(--white);
  border: 1px solid var(--line);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
}

.accountModal h2 {
  margin-bottom: 1.25rem;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
}

.accountModal p {
  margin-bottom: 1.25rem;
  color: var(--stone);
  font-size: 0.9rem;
}

.accountModal label {
  display: block;
  margin: 0.9rem 0 0.35rem;
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 600;
}

.accountModal input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--line);
  color: var(--ink);
  font: inherit;
}

.accountModal input:focus {
  outline: none;
  border-color: var(--gold-deep);
  box-shadow: 0 0 0 3px rgba(161, 122, 70, 0.15);
}

.accountModalActions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.accountModalActions button {
  min-height: 38px;
  padding: 0.6rem 0.9rem;
  border: 1px solid transparent;
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
}

.modalSecondaryButton {
  border-color: var(--line) !important;
  background: transparent;
  color: var(--ink);
}

.modalPrimaryButton {
  background: var(--ink);
  color: var(--white);
}

.deactivateButton {
  background: var(--danger);
  color: var(--white);
}

.accountModalActions button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.accountError,
.accountSuccess {
  padding: 0.7rem;
  border: 1px solid currentColor;
}

.accountError {
  color: var(--danger) !important;
}

.accountSuccess {
  color: var(--success) !important;
}

.mobileProfileIcon {
  display: none;
}

.userGreeting {
  display: inline-flex;
  align-items: center;
  color: #000;
  font-size: 0.85rem;
  font-weight: 400;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.userGreetingMobile {
  display: none;
  margin-right: 0;
  border: none;
  padding: 0;
  font-size: 0.75rem;
}

.userGreetingDesktop {
  display: inline;
}

.logo:hover {
  color: #000;
}

.logo:focus-visible,
.navMenu a:focus-visible,
.authLink:focus-visible,
.navLogout:focus-visible,
.profileIcon:focus-visible,
.hamburger:focus-visible {
  outline: 2px solid #000;
  outline-offset: 4px;
}

/* ====================== HAMBURGER MENU BUTTON ====================== */
.hamburger {
  display: none;
  position: relative;
  width: 42px;
  height: 42px;
  background: transparent;
  border: 0;
  border-radius: 0;
  cursor: pointer;
  padding: 0;
  z-index: 1001;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}

.hamburger:hover {
  opacity: 0.8;
}

.hamburger span {
  position: absolute;
  left: 9px;
  width: 24px;
  height: 2px;
  border-radius: 999px;
  background: #000;
  transition: transform 0.2s ease, opacity 0.2s ease, top 0.2s ease;
}

.hamburger span:nth-child(1) {
  top: 14px;
}

.hamburger span:nth-child(2) {
  top: 20px;
}

.hamburger span:nth-child(3) {
  top: 26px;
}

.hamburgerOpen span:nth-child(1) {
  top: 20px;
  transform: rotate(45deg);
}

.hamburgerOpen span:nth-child(2) {
  opacity: 0;
}

.hamburgerOpen span:nth-child(3) {
  top: 20px;
  transform: rotate(-45deg);
}

/* ====================== MOBILE DRAWER BACKDROP ====================== */
.backdrop {
  display: none;
}

.drawerLogo { display: none; }
.drawerLogoImage { width: 100%; height: auto; object-fit: contain; }

/* ====================== RESPONSIVE DESIGN ====================== */
@media (max-width: 1024px) {
  .navContent {
    gap: 1rem;
  }
  .navLinks {
    gap: 1rem;
  }
  .navMenu {
    gap: 1rem;
  }
  .navMenu a,
  .authSection a,
  .navLogout,
  .profileIcon,
  .userGreeting {
    font-size: 11px;
  }
  .authSection {
    gap: 0.5rem;
  }
  .logo {
    font-size: 14px;
  }
  .nav {
    height: 70px;
  }

  .userGreetingMobile {
    display: inline;
  }

  .userGreetingDesktop {
    display: none;
  }
}

@media (max-width: 915px) {
  .navContent {
    gap: 0.6rem;
  }
  .navLinks {
    gap: 0.6rem;
  }
  .navMenu {
    gap: 0.6rem;
  }
  .navMenu a {
    font-size: 8px;
  }
  .authSection a,
  .navLogout,
  .userGreeting {
    font-size: 8px;
    padding: 0 0.7rem;
  }
  .authSection {
    gap: 0.35rem;
  }
  .logo {
    font-size: 12px;
  }
  .nav {
    height: 70px;
  }

  .userGreetingMobile {
    display: inline;
  }

  .userGreetingDesktop {
    display: none;
  }
}


@media (max-width: 768px) {
  .nav {
    height: 70px;
    padding: 0;
  }

  .navContent {
    position: relative;
  }

  .logoSection {
    gap: 0.5rem;
  }

  .logo {
    font-size: 1.1rem;
  }

  .hamburger {
    display: block;
  }

  .mobileProfileIcon {
    display: inline-flex;
    margin-left: auto;
    margin-right: -0.25rem;
  }

  .mobileProfileMenuWrapper {
    margin-left: auto;
    margin-right: -0.25rem;
  }

  .mobileProfileMenuWrapper .mobileProfileIcon {
    margin: 0;
  }

  .mobileProfileMenuWrapper .profileMenu {
    position: fixed;
    top: 4.5rem;
    right: 1rem;
  }

  .drawerProfileIcon {
    display: none;
  }

  .userGreetingMobile {
    display: inline;
    font-size: 0.7rem;
  }

  .userGreetingDesktop {
    display: none;
  }

  /* Dim, blurred backdrop behind the drawer */
  .backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(2px);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.22s ease, visibility 0.22s ease;
    z-index: 998;
  }

  .backdropOpen {
    opacity: 1;
    visibility: visible;
  }

  /* Slide-in drawer from the right */
  .navLinks {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: min(78vw, 320px);
    margin-right: 0;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    background: #F7F2E9;
    padding: 5.5rem 1.25rem 2rem;
    gap: 1.5rem;
    box-shadow: -8px 0 30px rgba(0, 0, 0, 0.16);
    transform: translateX(100%);
    visibility: hidden;
    transition: transform 0.25s cubic-bezier(0.2, 0, 0.2, 1);
    z-index: 999;
    overflow-y: auto;
  }

  .navLinksOpen {
    transform: translateX(0);
    visibility: visible;
  }

  .drawerLogo { display: block; width: min(160px, 100%); flex-shrink: 0; margin-bottom: 0.5rem; }

  .navMenu {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .authSection {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  /* The divider becomes a full-width horizontal rule stacked between groups */
  .navDivider {
    width: 100%;
    height: 1px;
  }

  .navMenu a,
  .authSection a.authLink,
  .navLogout {
    width: 100%;
    height: auto;
    text-align: center;
    justify-content: center;
    padding: 0.9rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .profileIcon {
    width: 32.5px;
    height: 32.5px;
    align-self: center;
    font-size: 0.65rem;
  }

  .navMenu a::after {
    display: none;
  }

  .navMenu a:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .authSection a.authLink,
  .navLogout {
    border-radius: 6px;
  }

  .authSection a.authLinkPrimary {
    border-radius: 6px;
  }

  .authSection a.authLinkPrimary:hover {
    background: var(--gold-bright);
  }

  .userGreeting.userGreetingDesktop {
    display: none;
  }

  .authSection .userGreeting {
    justify-content: center;
    padding: 0.4rem 0.9rem;
  }
}

@media (max-width: 480px) {
  .nav {
    height: 70px;
    padding: 0;
  }

  .navContent {
    padding: 0 1rem;
  }

  .logo {
    font-size: 1rem;
  }

  .navLinks {
    width: 82vw;
    padding: 6rem 1.5rem 3rem;
  }

  .navMenu a,
  .authSection a.authLink,
  .navLogout {
    font-size: 0.85rem;
    padding: 0.85rem;
  }
}
```

### src/components/SupportRequests.js

```javascript
"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/clientApi";
import { REQUEST_STATUSES } from "@/lib/accountContracts.mjs";
import styles from "@/app/admin/adminShell.module.css";
import account from "@/app/account/account.module.css";

export default function SupportRequests({ admin = false }) {
  const [kind, setKind] = useState("refund");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ requests: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const endpoint = admin ? "/api/admin/customer-requests" : "/api/account/requests";

  useEffect(() => {
    const controller = new AbortController();
    authenticatedFetch(`${endpoint}?kind=${kind}&page=${page}`, { signal: controller.signal }).then((data) => {
      setResult(data); setError("");
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, kind, page, refresh]);

  async function update(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await authenticatedFetch(endpoint, { method: "PATCH", body: JSON.stringify({ id: selected.id, kind, expectedStatus: selected.status, status, response }) });
      setSelected(null); setLoading(true); setRefresh((value) => value + 1);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <>
    <div className={styles.pageHeader}><div><h1 className={styles.pageTitle}>Refunds & complaints</h1><p className={styles.pageSub}>{admin ? "Review customer requests and send a response." : "Follow your requests and the shop's responses."}</p></div><button className={styles.btn} type="button" disabled={loading || busy} onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh</button></div>
    <div className={styles.tabs} aria-label="Request types">{["refund", "complaint"].map((value) => <button key={value} type="button" className={`${styles.tab} ${kind === value ? styles.tabActive : ""}`} aria-pressed={kind === value} disabled={busy} onClick={() => { setKind(value); setPage(1); setSelected(null); setLoading(true); }}>{value === "refund" ? "Refund requests" : "Complaints"}</button>)}</div>
    <p className={account.hint}>{kind === "refund" ? "Approval records the shop's decision. Payment refunds must be arranged separately through Bachs." : "Complaints concern products the customer confirms they received."}</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loading ? <p role="status">Loading requests…</p> : !result.requests.length ? <p className={styles.empty}>No requests found.</p> : <div className={account.stack}>{result.requests.map((entry) => <article className={styles.card} key={entry.id}>
      <h2 className={styles.cardTitle}>{entry.product_name}</h2><p>Status: <strong>{entry.status.replaceAll("_", " ")}</strong></p>
      <p className={account.reference}>Request {entry.id}<br />Order {entry.order_id} · {new Date(entry.created_at).toLocaleDateString("en-GB")}</p>
      {admin && entry.order && <p className={account.message}><strong>Customer:</strong> {entry.order.customer_name}<br />{entry.order.customer_email}<br />{entry.order.customer_phone}</p>}
      <p className={account.message}>{entry.description}</p>{entry.response && <p className={account.message}><strong>Shop response:</strong> {entry.response}</p>}
      {admin && ["pending", "in_review"].includes(entry.status) && <button type="button" className={styles.btn} disabled={busy} onClick={() => { setSelected(entry); setStatus(REQUEST_STATUSES[kind].find((value) => value !== "pending" && value !== entry.status)); setResponse(entry.response || ""); }}>Review request</button>}
    </article>)}</div>}
    {selected && <section className={account.panel} aria-labelledby="review-request-title"><h2 id="review-request-title">Review {selected.product_name}</h2><form className={account.form} onSubmit={update}>
      <label>New status<select value={status} onChange={(event) => setStatus(event.target.value)} disabled={busy}>{REQUEST_STATUSES[kind].filter((value) => value !== "pending" && value !== selected.status).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <label>Response to the customer<textarea value={response} onChange={(event) => setResponse(event.target.value)} maxLength={2000} disabled={busy} /></label>
      <div className={account.actions}><button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? "Saving…" : "Save and notify customer"}</button><button type="button" className={styles.btn} disabled={busy} onClick={() => setSelected(null)}>Cancel</button></div>
    </form></section>}
    {result.total > result.pageSize && <nav className={account.pagination} aria-label="Request pages"><button className={styles.btn} disabled={page === 1 || loading} onClick={() => { setPage(page - 1); setLoading(true); }}>Previous</button><span>{page} / {Math.ceil(result.total / result.pageSize)}</span><button className={styles.btn} disabled={page * result.pageSize >= result.total || loading} onClick={() => { setPage(page + 1); setLoading(true); }}>Next</button></nav>}
  </>;
}
```

### src/lib/accountContracts.mjs

```javascript
import { z } from "zod";

export const REQUEST_TYPES = ["refund", "complaint"];
export const REQUEST_STATUSES = {
  refund: ["pending", "approved", "rejected"],
  complaint: ["pending", "in_review", "resolved", "rejected"],
};
export const REQUEST_TABLES = { refund: "refund_requests", complaint: "product_complaints" };
export const requestSchema = z.object({
  id: z.uuid(), kind: z.enum(REQUEST_TYPES), orderId: z.uuid(), productId: z.uuid(),
  description: z.string().trim().min(10, "Please provide at least 10 characters.").max(2000),
  received: z.boolean().default(false),
}).strict().superRefine((value, ctx) => {
  if (value.kind === "complaint" && !value.received) ctx.addIssue({ code: "custom", path: ["received"], message: "Confirm that you received this product." });
});
export const requestQuerySchema = z.object({ kind: z.enum(REQUEST_TYPES).default("refund"), page: z.coerce.number().int().min(1).max(100000).default(1) }).strict();
export const requestReviewSchema = z.object({
  id: z.uuid(), kind: z.enum(REQUEST_TYPES), expectedStatus: z.string(), status: z.string(), response: z.string().trim().max(2000).default(""),
}).strict().superRefine((value, ctx) => {
  const allowed = value.kind === "refund" ? { pending: ["approved", "rejected"] } : { pending: ["in_review", "resolved", "rejected"], in_review: ["resolved", "rejected"] };
  if (!allowed[value.expectedStatus]?.includes(value.status)) ctx.addIssue({ code: "custom", path: ["status"], message: "This status change is not allowed." });
});
export const accountActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("password"), currentPassword: z.string().min(1).max(256), newPassword: z.string().min(8, "Use at least 8 characters.").max(128) }).strict(),
  z.object({ action: z.literal("deactivate"), currentPassword: z.string().min(1).max(256), confirmed: z.literal(true) }).strict(),
]);

export function repurchaseCart(cart, productId) {
  if (cart.filter((item) => item.id === productId).length >= 10) throw new Error("Your cart already contains 10 of this item.");
  if (!cart.some((item) => item.id === productId) && new Set(cart.map((item) => item.id)).size >= 20) throw new Error("Your cart already contains 20 different items.");
  return [...cart, { id: productId }];
}
```

### src/lib/accountServer.js

```javascript
import { createClient } from "@supabase/supabase-js";
import { checkoutDatabase } from "./checkoutServer";
import { OrderRequestError } from "./orderManagement.mjs";

export async function requireActiveAccount(request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new OrderRequestError("Please sign in.", 401);
  const db = checkoutDatabase();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user || !data.user.email_confirmed_at) throw new OrderRequestError("Sign in with a verified email address.", 401);
  const { data: profile, error: profileError } = await db.from("users").select("id,email,is_admin,is_active").eq("id", data.user.id).maybeSingle();
  if (profileError) throw new OrderRequestError("Unable to check your account.", 503);
  if (profile?.is_active !== true) throw new OrderRequestError("This account is inactive. Contact Elegant Style for help.", 403);
  return { db, user: data.user, profile, token };
}

export function checkRequestOrigin(request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new OrderRequestError("Invalid request origin.", 403);
}

export async function readAccountBody(request, schema, maxLength = 16000) {
  checkRequestOrigin(request);
  const text = await request.text();
  if (text.length > maxLength) throw new OrderRequestError("Request is too large.", 413);
  let input;
  try { input = JSON.parse(text); } catch { throw new OrderRequestError("Invalid request details.", 400); }
  const result = schema.safeParse(input);
  if (!result.success) throw new OrderRequestError(result.error.issues[0].message, 400);
  return result.data;
}

export async function claimAccountOrders(db, user) {
  // Only a server-verified, confirmed email can claim an unassigned guest order.
  const { error } = await db.from("shop_orders").update({ user_id: user.id })
    .is("user_id", null).eq("customer_email", user.email.toLowerCase());
  if (error) throw error;
}

export function passwordClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
```

### src/lib/clientApi.js

```javascript
import { supabase } from "./supabaseClient";

export async function authenticatedFetch(url, options = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  const response = await fetch(url, {
    ...options, cache: "no-store",
    headers: { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${data.session.access_token}` },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}
```

### src/lib/orderEmails.mjs

```javascript
import { PICKUP_ADDRESS } from "./checkout.mjs";
import { SITE_URL } from "./seo.mjs";

export const ADMIN_NOTIFY_EMAIL = "elegantyoufashion18@gmail.com";

export function escapeEmailHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

const naira = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})}`;

export function wrapBrandEmail(heading, content) {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#F7F2E9;color:#24211e;font-family:'Segoe UI',Arial,sans-serif">
    <div style="max-width:680px;margin:24px auto;background:#ffffff;border-top:6px solid #C9A962;padding:28px">
      <p style="color:#8b6c2d;font-weight:700">ELEGANT STYLE</p><h1 style="font-size:26px">${escapeEmailHtml(heading)}</h1>${content}
    </div></body></html>`;
}

export async function sendServiceEmail(message, { env = process.env, fetchImpl = fetch, logger = console } = {}) {
  const { idempotencyKey, ...email } = message;
  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !email.to) throw new Error("Email configuration or recipient is missing");
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, ...email, to: [email.to], subject: email.subject.replace(/[\r\n]/g, " ") }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
    return true;
  } catch (error) {
    logger.error(`Service email ${idempotencyKey} failed`, error.message);
    return false;
  }
}

export function buildOrderEmails(order, shopRecipient, receiptToken) {
  const safe = escapeEmailHtml;
  const delivery = order.delivery || {};
  const method = delivery.method === "pickup" ? "Shop pickup" : delivery.method === "yenagoa" ? "Delivery within Yenagoa" : "Delivery outside Yenagoa";
  const address = delivery.method === "pickup" ? PICKUP_ADDRESS : [delivery.address, delivery.city, delivery.state].filter(Boolean).join(", ");
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = items.map((item) => `<tr>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(item.name)}</td>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(item.quantity)}</td>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(naira(item.unitAmountMinor))}</td>
    <td style="padding:10px;border-bottom:1px solid #e6dfd2">${safe(naira(item.lineAmountMinor))}</td>
  </tr>`).join("");
  const totals = `<p>Subtotal: ${safe(naira(order.subtotal_minor))}</p>
    <p>Delivery / pickup: ${safe(naira(order.shipping_minor))}</p>
    <p style="font-size:20px;font-weight:700">Total paid: ${safe(naira(order.total_minor))}</p>`;
  const details = `<p>Order reference: <strong>${safe(order.id)}</strong></p>
    <table style="width:100%;border-collapse:collapse;text-align:left">
      <thead style="background:#F7F2E9"><tr><th style="padding:10px">Item</th><th style="padding:10px">Qty</th><th style="padding:10px">Unit price</th><th style="padding:10px">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>${totals}<h2 style="font-size:18px">${safe(method)}</h2>
    <p style="white-space:pre-wrap">${safe(address)}</p>`;
  const wrap = wrapBrandEmail;
  const itemText = items.map((item) => `${item.name} × ${item.quantity} — ${naira(item.unitAmountMinor)} each — ${naira(item.lineAmountMinor)}`).join("\n");
  const commonText = [`Order reference: ${order.id}`, itemText, `Subtotal: ${naira(order.subtotal_minor)}`, `Delivery / pickup: ${naira(order.shipping_minor)}`, `Total paid: ${naira(order.total_minor)}`, method, address].join("\n");
  const reference = String(order.id).replace(/[\r\n]/g, " ");
  const confirmationUrl = /^[a-f0-9]{64}$/.test(receiptToken || "")
    ? `${SITE_URL}/order-received/${encodeURIComponent(order.id)}#token=${receiptToken}` : null;
  const confirmationHtml = confirmationUrl ? `<h2 style="font-size:18px">After you receive your order</h2><p>Once you have received every product in this order, let us know using the button below.</p><p><a href="${safe(confirmationUrl)}" style="display:inline-block;background:#24211e;color:#ffffff;padding:14px 20px;text-decoration:none;border-radius:6px">I have received the product</a></p><p>This opens a confirmation page. Only confirm after your order has arrived. Keep this personal link private.</p>` : "";
  const confirmationText = confirmationUrl ? `\n\nAfter you receive every product in this order, confirm receipt here:\n${confirmationUrl}\nOnly confirm after your order has arrived. Keep this personal link private.` : "";
  return [
    {
      kind: "customer", to: order.customer_email,
      subject: `Your Elegant Style receipt — ${reference}`,
      html: wrap("Payment received", `<p>Hello ${safe(order.customer_name)},</p><p>Thank you. We have received payment for your order.</p>${details}<p>We will contact you to arrange ${delivery.method === "pickup" ? "pickup" : "delivery"}. For help, call 08166361710 and quote your order reference.</p>${confirmationHtml}`),
      text: `Hello ${order.customer_name},\nThank you. Your order is paid.\n${commonText}\nWe will contact you to arrange ${delivery.method === "pickup" ? "pickup" : "delivery"}. For help, call 08166361710.${confirmationText}`,
    },
    {
      kind: "shop", to: shopRecipient,
      subject: `Paid shop order — ${reference}`,
      html: wrap("New paid order", `<p><strong>Customer:</strong> ${safe(order.customer_name)}</p><p><strong>Email:</strong> ${safe(order.customer_email)}</p><p><strong>Phone:</strong> ${safe(order.customer_phone)}</p>${details}<p>Manage this order in the Elegant Style admin orders page.</p>`),
      text: `New paid order\nCustomer: ${order.customer_name}\nEmail: ${order.customer_email}\nPhone: ${order.customer_phone}\n${commonText}`,
    },
  ];
}

// The webhook's atomic payment update has already claimed this attempt.
// Never throw or retry here: payment success must remain independent of email.
export async function sendOrderEmails(order, { env = process.env, fetchImpl = fetch, logger = console, receiptToken } = {}) {
  try {
    const recipient = ADMIN_NOTIFY_EMAIL;
    const messages = buildOrderEmails(order, recipient, receiptToken);
    await Promise.all(messages.map(async ({ kind, to, ...message }) => {
      try {
        if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !to) throw new Error("Email configuration or recipient is missing");
        const response = await fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `paid-order/${order.id}/${kind}`,
          },
          body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [to], ...message }),
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
        logger.info(`Order ${order.id}: ${kind} email accepted by Resend`);
      } catch (error) {
        logger.error(`Order ${order.id}: ${kind} email failed`, error.message);
      }
    }));
  } catch (error) {
    logger.error(`Order ${order.id}: email preparation failed`, error.message);
  }
}
```

### src/lib/registration.mjs

```javascript
import { z } from "zod";
import { PICKUP_ADDRESS } from "./checkout.mjs";

export const SPONSORSHIP_OPTIONS = ["Self sponsored", "Guardian", "Scholarship"];
export const PROGRAMMES = ["3 Months Programme", "6 Months Programme", "1 Year Programme"];
export const ACADEMY_ADDRESS = PICKUP_ADDRESS;
export const REGISTRATION_COMPLETE_MESSAGE = `Registration completed visit ${ACADEMY_ADDRESS} from Mon-Fri, 8am-5pm, for PAYMENT DETAILS, ORIENTAION and PHYSICAL VERIFICATION\nThank You for choosing Elegant Style Fashion Academy`;

const requiredText = (max) => z.string().trim().min(1, "This field is required.").max(max);
export const registrationSchema = z.object({
  surname: requiredText(100), first_name: requiredText(100), middle_name: z.string().trim().max(100).default(""),
  gender: requiredText(40), date_of_birth: z.iso.date().refine((value) => new Date(`${value}T00:00:00Z`) <= new Date(), "Date of birth cannot be in the future."),
  age: z.coerce.number().int().min(1).max(100), nationality: requiredText(100), marital_status: requiredText(40),
  state_of_origin: requiredText(100), address: requiredText(500), telephone: requiredText(40).regex(/^\+?[\d\s()-]{7,40}$/, "Enter a valid telephone number."),
  email: z.email().max(254).transform((value) => value.toLowerCase()), chosen_programme: z.enum(PROGRAMMES),
  sponsorship: z.enum(SPONSORSHIP_OPTIONS), sponsor_organization: z.string().trim().max(160).nullish(),
  passport_photo: z.url().max(2000), agreed: z.literal(true, { error: "You must agree before submitting." }),
}).strict().superRefine((value, ctx) => {
  if (value.sponsorship === "Scholarship" && !value.sponsor_organization?.trim()) {
    ctx.addIssue({ code: "custom", path: ["sponsor_organization"], message: "State the organization sponsoring your training." });
  }
}).transform((value) => ({ ...value, sponsor_organization: value.sponsorship === "Scholarship" ? value.sponsor_organization.trim() : null }));

export const studentReviewSchema = z.object({
  id: z.union([z.number().int().positive().max(Number.MAX_SAFE_INTEGER), z.string().regex(/^[1-9]\d{0,18}$/)])
    .transform(String).refine((value) => BigInt(value) <= 9223372036854775807n, "Invalid application reference."),
  status: z.enum(["pending", "accepted", "declined"]),
}).strict();
export const studentName = (student) => [student.surname, student.first_name, student.middle_name].filter(Boolean).join(" ");
```

### src/lib/registrationEmails.mjs

```javascript
import { ADMIN_NOTIFY_EMAIL, escapeEmailHtml as safe, sendServiceEmail, wrapBrandEmail } from "./orderEmails.mjs";
import { REGISTRATION_COMPLETE_MESSAGE, studentName } from "./registration.mjs";

export function registrationAdminEmail(student, recipient) {
  const details = [
    ["Application reference", student.id], ["Name", studentName(student)], ["Email", student.email], ["Telephone", student.telephone],
    ["Date of birth", student.date_of_birth], ["Age", student.age], ["Gender", student.gender], ["Nationality", student.nationality],
    ["Marital status", student.marital_status], ["State of origin", student.state_of_origin], ["Address", student.address],
    ["Programme", student.chosen_programme], ["Sponsorship", student.sponsorship], ["Sponsor organization", student.sponsor_organization || "Not applicable"],
    ["Passport photograph", student.passport_photo], ["Application status", student.status || "pending"],
    ["Submitted", student.created_at || "Recorded on application"], ["Declaration accepted", student.declaration_accepted_at || "Confirmed during submission"],
  ];
  return {
    to: recipient, subject: `Elegant Style student registration — ${student.id}`, idempotencyKey: `student-registration/${student.id}/admin`,
    html: wrapBrandEmail("New student registration", `<dl>${details.map(([label, value]) => `<dt style="font-weight:700">${safe(label)}</dt><dd style="margin:0 0 12px">${safe(value)}</dd>`).join("")}</dl><p>Review the application in the Elegant Style admin dashboard.</p><p style="white-space:pre-line">${safe(REGISTRATION_COMPLETE_MESSAGE)}</p>`),
    text: `${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\n${REGISTRATION_COMPLETE_MESSAGE}`,
  };
}

export function registrationAcceptanceEmail(student) {
  return {
    to: student.email, subject: "Your Elegant Style Fashion Academy application has been accepted", idempotencyKey: `student-acceptance/${student.id}`,
    html: wrapBrandEmail("Your application is accepted", `<p>Hello ${safe(studentName(student))},</p><p>You have been accepted for ${safe(student.chosen_programme)} at Elegant Style Fashion Academy.</p><p>Application reference: ${safe(student.id)}</p><p>Sponsorship: ${safe(student.sponsorship || "Not recorded")}</p>${student.sponsor_organization ? `<p>Sponsor organization: ${safe(student.sponsor_organization)}</p>` : ""}<p style="white-space:pre-line">${safe(REGISTRATION_COMPLETE_MESSAGE)}</p>`),
    text: `Hello ${studentName(student)},\nYou have been accepted for ${student.chosen_programme} at Elegant Style Fashion Academy.\nApplication reference: ${student.id}\n\n${REGISTRATION_COMPLETE_MESSAGE}`,
  };
}

export function notifyRegistration(student) {
  return sendServiceEmail(registrationAdminEmail(student, ADMIN_NOTIFY_EMAIL));
}

export function notifyAcceptance(student) {
  return sendServiceEmail(registrationAcceptanceEmail(student));
}
```

### src/lib/supportEmails.mjs

```javascript
import { ADMIN_NOTIFY_EMAIL, escapeEmailHtml as safe, sendServiceEmail, wrapBrandEmail } from "./orderEmails.mjs";

export function supportEmail(request, kind, recipient, audience = "customer", updated = false, customerEmail = "") {
  const label = kind === "refund" ? "Refund request" : "Product complaint";
  const heading = updated ? `${label} update` : `${label} received`;
  const details = `${label} reference: ${request.id}\nOrder: ${request.order_id}\nProduct: ${request.product_name}\nStatus: ${request.status}${audience === "admin" ? `\nCustomer account email: ${customerEmail}` : ""}\nDetails: ${request.description}${request.response ? `\nResponse: ${request.response}` : ""}`;
  const note = kind === "refund" ? "Approval records the shop's decision. Any payment refund is arranged separately through Bachs; a status change does not itself transfer funds." : "The shop will review your complaint and contact you if more information is needed.";
  return {
    to: recipient, subject: `Elegant Style ${heading.toLowerCase()} — ${request.id}`,
    idempotencyKey: `support/${kind}/${request.id}/${updated ? request.status : "received"}/${audience}`,
    html: wrapBrandEmail(heading, `<p style="white-space:pre-line">${safe(details)}</p><p>${safe(note)}</p><p>View this request in your Elegant Style ${audience === "admin" ? "admin dashboard" : "account"}.</p>`),
    text: `${details}\n\n${note}`,
  };
}

export async function notifySupportRequest(request, kind, customerEmail, updated = false) {
  const messages = [supportEmail(request, kind, customerEmail, "customer", updated)];
  if (!updated) messages.push(supportEmail(request, kind, ADMIN_NOTIFY_EMAIL, "admin", false, customerEmail));
  await Promise.all(messages.map((message) => sendServiceEmail(message)));
}
```

### src/app/api/bespoke/submit/route.ts

```typescript
import { createClient } from "@supabase/supabase-js";
import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_NOTIFY_EMAIL } from "@/lib/orderEmails.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET_NAME = "bespoke-requests";
const MAX_IMAGES = 4;
const PHONE_REGEX = /^(?:0[789]\d{9}|\+234[789]\d{9})$/;
const STORED_IMAGE_PATH_REGEX =
  /^requests\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp|heic|heif)$/i;

const submitSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Your name must be 100 characters or fewer.")
    .nullish()
    .transform((value) => value || null),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .transform((value) =>
      value.startsWith("0") ? `+234${value.slice(1)}` : value,
    )
    .pipe(
      z
        .string()
        .regex(PHONE_REGEX, "Enter a valid Nigerian mobile number."),
    ),
  description: z
    .string()
    .trim()
    .min(20, "Please add at least 20 characters.")
    .max(2000, "Your description must be 2000 characters or fewer."),
  imagePaths: z
    .array(z.string().regex(STORED_IMAGE_PATH_REGEX, "Invalid image path."))
    .max(MAX_IMAGES, "You can attach up to 4 images.")
    .refine((paths) => new Set(paths).size === paths.length, {
      message: "Image paths must be unique.",
    }),
  company_name: z.string().max(200).optional().nullable(),
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are not configured.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function getWhatsAppLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

async function sendNotificationEmail(data: {
  name: string | null;
  phone: string;
  description: string;
  imagePaths: string[];
  createdAt: string;
  requestId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = ADMIN_NOTIFY_EMAIL;
  const sender = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !recipient || !sender) {
    console.warn(
      "Bespoke email notification is disabled: configure RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const attachments: { filename: string; content: string }[] = [];
  const imageLinks: { filename: string; url: string }[] = [];

  const imageResults = await Promise.all(
    data.imagePaths.map(async (path) => {
      const fileName = path.split("/").pop() || "reference-image";
      let link: { filename: string; url: string } | null = null;
      try {
        const { data: signedData, error: signedError } =
          await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .createSignedUrl(path, 7 * 24 * 60 * 60);
        if (signedError || !signedData?.signedUrl) {
          throw new Error(
            signedError?.message || `Could not sign image link for ${path}`,
          );
        }

        link = { filename: fileName, url: signedData.signedUrl };
        const imageResponse = await fetch(signedData.signedUrl, {
          signal: AbortSignal.timeout(12000),
        });
        if (!imageResponse.ok) {
          throw new Error(`Could not download ${fileName} for email attachment.`);
        }
        const content = Buffer.from(await imageResponse.arrayBuffer()).toString(
          "base64",
        );
        return {
          link,
          attachment: { filename: fileName, content },
        };
      } catch (error) {
        console.error(
          `Could not prepare bespoke reference image ${path} for email:`,
          error,
        );
        return { link, attachment: null };
      }
    }),
  );

  for (const result of imageResults) {
    if (result.link) imageLinks.push(result.link);
    if (result.attachment) attachments.push(result.attachment);
  }

  const time = new Date(data.createdAt).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });
  const safeName = escapeHtml(data.name || "Not provided");
  const safePhone = escapeHtml(data.phone);
  const safeDescription = escapeHtml(data.description);
  const whatsappUrl = getWhatsAppLink(data.phone);
  const telUrl = `tel:${data.phone}`;
  const linksText = imageLinks.length
    ? imageLinks.map(({ filename, url }) => `${filename}: ${url}`).join("\n")
    : data.imagePaths.length
      ? "Image links could not be generated."
      : "No reference images attached.";
  const linksHtml = imageLinks.length
    ? `<ul>${imageLinks
        .map(
          ({ filename, url }) =>
            `<li><a href="${escapeHtml(url)}">${escapeHtml(filename)}</a></li>`,
        )
        .join("")}</ul>`
    : data.imagePaths.length
      ? "<p>Image links could not be generated.</p>"
      : "<p>No reference images attached.</p>";
  const subjectName = (data.name || data.phone)
    .replace(/[\r\n]+/g, " ")
    .slice(0, 100);
  const subject = `New bespoke request: ${subjectName}`;
  const text = [
    "New bespoke request",
    "",
    `Name: ${data.name || "Not provided"}`,
    `Phone: ${data.phone}`,
    `Call: ${telUrl}`,
    `WhatsApp: ${whatsappUrl}`,
    "",
    "Description:",
    data.description,
    "",
    `Submitted: ${time}`,
    "",
    "Reference images (signed links valid for 7 days):",
    linksText,
  ].join("\n");
  const html = `
    <h1>New bespoke request</h1>
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Phone:</strong> <a href="${telUrl}">${safePhone}</a></p>
    <p><a href="${whatsappUrl}">Message on WhatsApp</a></p>
    <h2>Description</h2>
    <p style="white-space:pre-wrap">${safeDescription}</p>
    <p><strong>Submitted:</strong> ${escapeHtml(time)}</p>
    <h2>Reference images (signed links valid for 7 days)</h2>
    ${linksHtml}
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject,
      text,
      html,
      ...(attachments.length ? { attachments } : {}),
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Resend returned ${response.status}: ${responseText}`);
  }

  console.info(
    `Bespoke notification sent for request ${data.requestId}; ${attachments.length}/${data.imagePaths.length} image attachments included.`,
  );
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields and try again.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (parsed.data.company_name?.trim()) {
    return NextResponse.json({
      success: true,
      phone: parsed.data.phone,
    });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const ipDigest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(getClientIp(request)),
    );
    const ipHash = Array.from(new Uint8Array(ipDigest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc(
      "consume_bespoke_request_rate_limit",
      { p_ip_hash: ipHash },
    );

    if (rateLimitError) {
      console.error("Bespoke request rate limit check failed:", rateLimitError);
      return NextResponse.json(
        { error: "We could not accept your request right now. Please try again shortly." },
        { status: 503 },
      );
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in an hour." },
        { status: 429 },
      );
    }

    for (const path of parsed.data.imagePaths) {
      const fileName = path.split("/").pop();
      const { data: storedFiles, error: storageError } =
        await supabaseAdmin.storage.from(BUCKET_NAME).list("requests", {
          limit: 100,
          search: fileName,
        });

      if (storageError) {
        throw new Error(`Could not verify an uploaded image: ${storageError.message}`);
      }
      if (!storedFiles?.some((file) => file.name === fileName)) {
        return NextResponse.json(
          { error: "One of your reference images could not be found. Please upload it again." },
          { status: 400 },
        );
      }
    }

    const { name, phone, description, imagePaths } = parsed.data;
    const { data: savedRequest, error: databaseError } = await supabaseAdmin
      .from("bespoke_requests")
      .insert({
        name,
        phone,
        description,
        image_paths: imagePaths,
        status: "new",
        ip_hash: ipHash,
      })
      .select("id, created_at")
      .single();

    if (databaseError) {
      console.error("Could not save bespoke request:", databaseError);
      return NextResponse.json(
        { error: "Your request could not be saved. Please try again." },
        { status: 500 },
      );
    }

    after(async () => {
      try {
        await sendNotificationEmail({
          name,
          phone,
          description,
          imagePaths,
          createdAt: savedRequest.created_at,
          requestId: savedRequest.id,
        });
      } catch (error) {
        console.error(
          `Bespoke request ${savedRequest.id} was saved, but its email notification failed:`,
          error,
        );
      }
    });

    return NextResponse.json({
      success: true,
      requestId: savedRequest.id,
      phone,
    });
  } catch (error) {
    console.error("Bespoke request submission failed:", error);
    return NextResponse.json(
      { error: "Your request could not be sent. Please try again." },
      { status: 500 },
    );
  }
}
```

### scripts/order-management.test.mjs

```javascript
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createHmac } from "node:crypto";
import vm from "node:vm";
import { z } from "zod";
import * as bachs from "../src/lib/bachs.mjs";
import * as management from "../src/lib/orderManagement.mjs";
import { buildOrderEmails, sendOrderEmails } from "../src/lib/orderEmails.mjs";
import { createReceiptConfirmation, receiptHash } from "../src/lib/checkoutServer.js";

const id = "11111111-1111-4111-8111-111111111111";
const adminId = "22222222-2222-4222-8222-222222222222";
const secret = "webhook-unit-test-only";
const fixture = () => ({
  id, customer_name: "Test Customer", customer_email: "customer@example.invalid", customer_phone: "08012345678",
  delivery: { method: "outside_yenagoa", address: "Test street", city: "Test city", state: "Test state" },
  items: [{ productId: "dress", name: "Dress", quantity: 1, unitAmountMinor: 5000000, lineAmountMinor: 5000000 }],
  subtotal_minor: 5000000, shipping_minor: 200000, total_minor: 5200000, payment_status: "pending",
  fulfillment_status: "new", checkout_id: "chk_test", created_at: "2026-10-16T10:00:00Z", receipt_hash: "private",
  customer_received_at: null, receipt_confirmation_hash: null,
});

function database(orders = [fixture()], profile = { id: adminId, is_admin: true, is_active: true }) {
  const updates = [];
  const reads = [];
  return {
    orders, updates, reads,
    auth: { getUser: async (token) => token === "valid" ? { data: { user: { id: adminId, user_metadata: { is_admin: true } } }, error: null } : { data: { user: null }, error: { message: "Invalid token" } } },
    from(table) {
      reads.push(table);
      const rows = table === "users" ? (profile ? [profile] : []) : orders;
      let patch;
      let columns = "*";
      let count = false;
      const filters = [];
      const sorts = [];
      const project = (row) => columns === "*" ? structuredClone(row) : Object.fromEntries(columns.split(",").map((key) => [key, structuredClone(row[key])]));
      const execute = (single, range) => {
        let matches = rows.filter((row) => filters.every((fn) => fn(row)));
        const total = matches.length;
        if (patch) { updates.push({ table, patch, affected: matches.length }); matches.forEach((row) => Object.assign(row, patch)); }
        matches = [...matches].sort((a, b) => {
          for (const [column, options] of sorts) {
            const value = String(a[column]).localeCompare(String(b[column]));
            if (value) return options.ascending ? value : -value;
          }
          return 0;
        });
        if (range) matches = matches.slice(range[0], range[1] + 1);
        return Promise.resolve({ data: single ? (matches[0] ? project(matches[0]) : null) : matches.map(project), error: null, count: count ? total : null });
      };
      const query = {
        select(value, options) { columns = value; count = Boolean(options?.count); return query; },
        update(value) { patch = value; return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        is(key, value) { filters.push((row) => (row[key] ?? null) === value); return query; },
        neq(key, value) { filters.push((row) => row[key] !== value); return query; },
        order(key, options) { sorts.push([key, options]); return query; },
        maybeSingle() { return execute(true); },
        range(start, end) { return execute(false, [start, end]); },
      };
      return query;
    },
  };
}

async function route(file, db, mailer = async () => {}) {
  const context = vm.createContext({ console: { error() {} }, process: { env: { BACHS_WEBHOOK_SECRET: secret } }, Date, URL, Response, AbortSignal });
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const routeModule = new vm.SourceTextModule(source, { context });
  const dependencies = {
    "next/server": { NextResponse: Response },
    "zod": { z },
    "@/lib/checkoutServer": { checkoutDatabase: () => db, createReceiptConfirmation, receiptHash },
    "@/lib/bachs.mjs": bachs,
    "@/lib/orderEmails.mjs": { sendOrderEmails: mailer },
    "@/lib/orderManagement.mjs": management,
  };
  await routeModule.link((name) => {
    const values = dependencies[name];
    if (!values) throw new Error(`Unexpected route dependency ${name}`);
    return new vm.SyntheticModule(Object.keys(values), function () {
      Object.entries(values).forEach(([key, value]) => this.setExport(key, value));
    }, { context });
  });
  await routeModule.evaluate();
  return routeModule.namespace;
}

function webhook(data = {}) {
  const body = JSON.stringify({ id: "evt_test", type: "collection.succeeded", data: { charge_id: "ch_test", checkout_id: "chk_test", reference: id, status: "SUCCEEDED", currency: "NGN", amount: "52000.00", ...data } });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return new Request("https://elegantstyle.com.ng/api/bachs/webhook", { method: "POST", body, headers: { "x-bachs-signature-v2": `t=${timestamp},v1=${signature}` } });
}
const adminRequest = (method = "GET", payload, token = "valid", query = "") => new Request(`https://elegantstyle.com.ng/api/admin/orders${query}`, {
  method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
  ...(payload ? { body: JSON.stringify(payload) } : {}),
});

test("concurrent and repeated paid webhooks claim one email attempt", async () => {
  const db = database();
  const sent = [];
  const { POST } = await route("src/app/api/bachs/webhook/route.js", db, async (order, options) => sent.push({ order, options }));
  const responses = await Promise.all([POST(webhook()), POST(webhook())]);
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(sent.length, 1);
  assert.equal(db.orders[0].payment_status, "paid");
  assert.equal(db.orders[0].paid_at, db.orders[0].emails_claimed_at);
  assert.equal(db.orders[0].receipt_confirmation_hash, receiptHash(sent[0].options.receiptToken));
  assert.equal(sent[0].order.receipt_confirmation_hash, undefined);
  const originalConfirmation = db.orders[0].receipt_confirmation_hash;
  assert.equal((await POST(webhook())).status, 200);
  assert.equal(sent.length, 1);
  assert.equal(db.orders[0].receipt_confirmation_hash, originalConfirmation);
});

test("email failure preserves payment and returns 200 without retrying mail", async () => {
  const db = database();
  let attempts = 0;
  const { POST } = await route("src/app/api/bachs/webhook/route.js", db, async () => { attempts++; throw new Error("Resend unavailable"); });
  assert.equal((await POST(webhook())).status, 200);
  assert.equal(db.orders[0].payment_status, "paid");
  assert.ok(db.orders[0].emails_claimed_at);
  assert.equal((await POST(webhook())).status, 200);
  assert.equal(attempts, 1);
});

test("amount mismatch stays review and never claims or sends emails", async () => {
  const db = database();
  let attempts = 0;
  const { POST } = await route("src/app/api/bachs/webhook/route.js", db, async () => attempts++);
  assert.equal((await POST(webhook({ amount: "1.00" }))).status, 200);
  assert.equal(db.orders[0].payment_status, "review");
  assert.equal(db.orders[0].emails_claimed_at, undefined);
  assert.equal(attempts, 0);
});

test("email HTML escapes customer fields and includes naira amounts and pickup", () => {
  const order = fixture();
  const malicious = '<img src=x onerror="alert(1)"> & \' test';
  order.customer_name = order.customer_email = order.customer_phone = malicious;
  order.delivery.address = malicious;
  order.items[0].name = malicious;
  const messages = buildOrderEmails(order, "shop@example.invalid");
  for (const message of messages) {
    assert.ok(!message.html.includes(malicious));
    assert.ok(message.html.includes("&lt;img"));
    assert.ok(message.html.includes("₦52,000.00"));
    assert.ok(message.html.includes("#C9A962") && message.html.includes("#F7F2E9"));
  }
  order.delivery.method = "pickup";
  assert.ok(buildOrderEmails(order, "shop@example.invalid")[0].text.includes("Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State"));
});

test("both emails are attempted independently with the sole admin recipient and stable keys", async () => {
  const calls = [];
  const logs = [];
  const options = {
    env: { RESEND_API_KEY: "fake", RESEND_FROM_EMAIL: "Elegant Style <requests@elegantstyle.com.ng>", BESPOKE_NOTIFY_EMAIL: "fallback@example.invalid", ORDER_NOTIFY_EMAIL: " " },
    fetchImpl: async (url, init) => { calls.push({ url, ...init, body: JSON.parse(init.body) }); return new Response(null, { status: calls.length === 1 ? 503 : 200 }); },
    logger: { info() {}, error: (...args) => logs.push(args) },
  };
  await sendOrderEmails(fixture(), options);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.to[0], "customer@example.invalid");
  assert.equal(calls[1].body.to[0], "elegantyoufashion18@gmail.com");
  assert.equal(calls[0].headers["Idempotency-Key"], `paid-order/${id}/customer`);
  assert.equal(calls[1].headers["Idempotency-Key"], `paid-order/${id}/shop`);
  assert.equal(logs.length, 1);
  calls.length = 0;
  await sendOrderEmails(fixture(), { ...options, env: { ...options.env, ORDER_NOTIFY_EMAIL: "orders@example.invalid" } });
  assert.equal(calls[1].body.to[0], "elegantyoufashion18@gmail.com");
});

test("missing email configuration is logged and never calls Resend", async () => {
  const logs = [];
  await sendOrderEmails(fixture(), {
    env: {},
    fetchImpl: async () => { throw new Error("Resend should not be called"); },
    logger: { info() {}, error: (...args) => logs.push(args) },
  });
  assert.equal(logs.length, 2);
});

test("missing, forged, non-admin and inactive-admin credentials are denied", async () => {
  for (const [token, profile, status] of [
    [null, { id: adminId, is_admin: true, is_active: true }, 401],
    ["forged", { id: adminId, is_admin: true, is_active: true }, 401],
    ["valid", { id: adminId, is_admin: false, is_active: true }, 403],
    ["valid", { id: adminId, is_admin: true, is_active: false }, 403],
    ["valid", null, 403],
  ]) {
    const db = database([], profile);
    const { GET, PATCH } = await route("src/app/api/admin/orders/route.js", db);
    assert.equal((await GET(adminRequest("GET", undefined, token))).status, status);
    assert.equal((await PATCH(adminRequest("PATCH", { id }, token))).status, status);
    assert.ok(!db.reads.includes("shop_orders"));
  }
});

test("order listing filters, sorts newest first, and omits private receipt data", async () => {
  const db = database([
    { ...fixture(), payment_status: "paid", created_at: "2026-10-15T10:00:00Z" },
    { ...fixture(), id: "33333333-3333-4333-8333-333333333333", payment_status: "paid", created_at: "2026-10-16T10:00:00Z" },
    { ...fixture(), id: "44444444-4444-4444-8444-444444444444", payment_status: "review" },
  ]);
  const { GET } = await route("src/app/api/admin/orders/route.js", db);
  const response = await GET(adminRequest("GET", undefined, "valid", "?payment=paid&fulfillment=new&page=1"));
  const result = await response.json();
  assert.equal(result.total, 2);
  assert.equal(result.orders[0].id, "33333333-3333-4333-8333-333333333333");
  assert.equal(result.orders[0].receipt_hash, undefined);
  assert.equal(result.orders[0].receipt_confirmation_hash, undefined);
  assert.equal((await GET(adminRequest("GET", undefined, "valid", "?payment=bogus"))).status, 400);
});

const receiptRequest = (token, overrides = {}, origin = "https://elegantstyle.com.ng") => new Request(`https://elegantstyle.com.ng/api/checkout/orders/${id}/received`, {
  method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
  body: JSON.stringify({ token, confirmed: true, ...overrides }),
});
const receiptContext = { params: Promise.resolve({ id }) };

test("receipt tokens are distinct random secrets and only their hashes are stored", () => {
  const first = createReceiptConfirmation(), second = createReceiptConfirmation();
  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, first.hash);
  assert.notEqual(first.token, second.token);
  assert.equal(first.hash, receiptHash(first.token));
});

test("only the customer email contains a personal receipt link, in its fragment", () => {
  const { token } = createReceiptConfirmation();
  const [customer, admin] = buildOrderEmails(fixture(), "shop@example.invalid", token);
  assert.ok(customer.html.includes("I have received the product"));
  const link = new URL(customer.html.match(/href="([^"]+)"/)[1]);
  assert.equal(link.origin, "https://elegantstyle.com.ng");
  assert.equal(link.pathname, `/order-received/${id}`);
  assert.equal(link.search, "");
  assert.equal(link.hash, `#token=${token}`);
  assert.ok(customer.text.includes(link.href));
  assert.ok(!admin.html.includes(token) && !admin.text.includes(token));
  assert.ok(!buildOrderEmails(fixture(), "shop@example.invalid", '" onclick="bad')[0].html.includes("onclick="));
});

test("receipt confirmation requires a valid paid-order link, explicit agreement, and same origin", async () => {
  const { token, hash } = createReceiptConfirmation();
  const db = database([{ ...fixture(), payment_status: "paid", receipt_confirmation_hash: hash }]);
  const endpoint = await route("src/app/api/checkout/orders/[id]/received/route.js", db);
  assert.equal(endpoint.GET, undefined);
  const { POST } = endpoint;
  for (const payload of [{ token: "bad" }, { token: "b".repeat(64) }, { confirmed: false }, { customer_received_at: "2020-01-01" }]) {
    assert.equal((await POST(receiptRequest(token, payload), receiptContext)).status, 400);
    assert.equal(db.orders[0].customer_received_at, null);
  }
  for (const origin of ["https://elsewhere.example", ""]) assert.equal((await POST(receiptRequest(token, {}, origin), receiptContext)).status, 403);
  assert.equal((await POST(receiptRequest(token), { params: Promise.resolve({ id: "invalid" }) })).status, 400);
  db.orders[0].payment_status = "pending";
  assert.equal((await POST(receiptRequest(token), receiptContext)).status, 400);
  assert.equal(db.orders[0].customer_received_at, null);
});

test("guest receipt confirmation is atomic, repeatable, and changes no payment or staff fulfilment fields", async () => {
  const { token, hash } = createReceiptConfirmation();
  const db = database([{ ...fixture(), payment_status: "paid", receipt_confirmation_hash: hash, fulfillment_status: "shipped" }]);
  const { POST } = await route("src/app/api/checkout/orders/[id]/received/route.js", db);
  const responses = await Promise.all([POST(receiptRequest(token), receiptContext), POST(receiptRequest(token), receiptContext)]);
  assert.ok(responses.every((response) => response.status === 200));
  const payloads = await Promise.all(responses.map((response) => response.json()));
  assert.equal(payloads.filter((payload) => payload.alreadyConfirmed).length, 1);
  assert.equal(payloads[0].receivedAt, payloads[1].receivedAt);
  assert.equal(db.updates.filter((update) => update.affected > 0).length, 1);
  assert.deepEqual(Object.keys(db.updates[0].patch), ["customer_received_at"]);
  assert.equal(db.orders[0].payment_status, "paid");
  assert.equal(db.orders[0].fulfillment_status, "shipped");
  assert.ok(!JSON.stringify(payloads).includes(token) && !JSON.stringify(payloads).includes(hash));
});

test("receipt confirmation rejects an email link used with another order", async () => {
  const { token } = createReceiptConfirmation();
  const { hash } = createReceiptConfirmation();
  const db = database([{ ...fixture(), payment_status: "paid", receipt_confirmation_hash: hash }]);
  const { POST } = await route("src/app/api/checkout/orders/[id]/received/route.js", db);
  assert.equal((await POST(receiptRequest(token), receiptContext)).status, 400);
  assert.equal(db.orders[0].customer_received_at, null);
});

test("fulfilment updates reject payment/amount writes, unpaid orders and stale status", async () => {
  const db = database([{ ...fixture(), payment_status: "paid" }]);
  const { PATCH } = await route("src/app/api/admin/orders/route.js", db);
  const update = { id, expected_status: "new", fulfillment_status: "processing" };
  for (const extra of [{ payment_status: "paid" }, { total_minor: 1 }, { shipping_minor: 0 }, { is_admin: true }]) {
    assert.equal((await PATCH(adminRequest("PATCH", { ...update, ...extra }))).status, 400);
  }
  assert.equal((await PATCH(adminRequest("PATCH", update))).status, 200);
  assert.deepEqual(Object.keys(db.updates[0].patch), ["fulfillment_status"]);
  assert.equal(db.orders[0].total_minor, 5200000);
  assert.equal((await PATCH(adminRequest("PATCH", update))).status, 409);
  db.orders[0].payment_status = "review";
  assert.equal((await PATCH(adminRequest("PATCH", { ...update, expected_status: "processing", fulfillment_status: "shipped" }))).status, 409);
});

test("delivery and pickup use forward-only fulfilment transitions", () => {
  assert.deepEqual(management.nextFulfillmentStatuses("new", "pickup"), ["processing"]);
  assert.deepEqual(management.nextFulfillmentStatuses("processing", "pickup"), ["ready"]);
  assert.deepEqual(management.nextFulfillmentStatuses("ready", "pickup"), ["completed"]);
  assert.deepEqual(management.nextFulfillmentStatuses("ready", "outside_yenagoa"), ["shipped"]);
  assert.deepEqual(management.nextFulfillmentStatuses("shipped", "outside_yenagoa"), ["completed"]);
  assert.deepEqual(management.nextFulfillmentStatuses("completed", "pickup"), []);
});

test("concurrent admin updates cannot both consume the same status", async () => {
  const db = database([{ ...fixture(), payment_status: "paid" }]);
  const { PATCH } = await route("src/app/api/admin/orders/route.js", db);
  const payload = { id, expected_status: "new", fulfillment_status: "processing" };
  const responses = await Promise.all([PATCH(adminRequest("PATCH", payload)), PATCH(adminRequest("PATCH", payload))]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  assert.equal(db.orders[0].fulfillment_status, "processing");
});
```

### src/lib/checkoutServer.js

```javascript
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function checkoutDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Order database is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function receiptHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createReceiptConfirmation() {
  const token = randomBytes(32).toString("hex");
  return { token, hash: receiptHash(token) };
}

export function hasOrderAccess(request, order) {
  const token = request.cookies.get(`es_order_${order.id}`)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(order.receipt_hash || "")) return false;
  return timingSafeEqual(Buffer.from(receiptHash(token), "hex"), Buffer.from(order.receipt_hash, "hex"));
}

export function setOrderCookie(response, id, token) {
  response.cookies.set(`es_order_${id}`, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/checkout", maxAge: 7 * 24 * 60 * 60 });
  return response;
}
```

### src/lib/orderManagement.mjs

```javascript
export const PAYMENT_STATUSES = ["pending", "paid", "review"];
export const FULFILLMENT_STATUSES = ["new", "processing", "ready", "shipped", "completed"];
export const ORDER_COLUMNS = "id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,payment_status,fulfillment_status,paid_at,created_at,customer_received_at";

export class OrderRequestError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function requireOrderAdmin(request, db) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new OrderRequestError("Sign in to manage orders.", 401);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new OrderRequestError("Your session has expired. Please sign in again.", 401);
  const { data: profile, error: profileError } = await db.from("users")
    .select("is_admin,is_active").eq("id", data.user.id).maybeSingle();
  if (profileError) throw new OrderRequestError("Unable to check administrator access.", 503);
  if (profile?.is_admin !== true || profile?.is_active !== true) throw new OrderRequestError("Administrator access is required.", 403);
  return data.user;
}

export function nextFulfillmentStatuses(status, deliveryMethod) {
  if (status === "new") return ["processing"];
  if (status === "processing") return deliveryMethod === "pickup" ? ["ready"] : ["ready", "shipped"];
  if (status === "ready") return deliveryMethod === "pickup" ? ["completed"] : ["shipped"];
  if (status === "shipped") return ["completed"];
  return [];
}
```

### src/app/api/bachs/webhook/route.js

```javascript
import { NextResponse } from "next/server";
import { verifyBachsSignature, paymentMatchesOrder } from "@/lib/bachs.mjs";
import { checkoutDatabase, createReceiptConfirmation } from "@/lib/checkoutServer";
import { sendOrderEmails } from "@/lib/orderEmails.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 128000) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyBachsSignature(raw, request.headers, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid payload." }, { status: 400 }); }
  // checkout.completed can be a free checkout. Only a collected payment fulfils orders.
  if (event.type !== "collection.succeeded") return NextResponse.json({ received: true });
  const data = event.data;
  if (!event.id || !data?.checkout_id || !data?.charge_id) return NextResponse.json({ received: true });
  try {
    const db = checkoutDatabase();
    const reference = data.reference || data.metadata?.order_id;
    let query = db.from("shop_orders").select("id,total_minor,payment_status,checkout_id");
    if (typeof reference === "string" && /^[0-9a-f-]{36}$/i.test(reference)) query = query.eq("id", reference);
    else query = query.eq("checkout_id", data.checkout_id);
    const { data: order, error } = await query.maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ received: true });
    if (order.checkout_id && order.checkout_id !== data.checkout_id) return NextResponse.json({ error: "Checkout reference mismatch." }, { status: 409 });
    if (order.payment_status === "paid") return NextResponse.json({ received: true });
    const paid = paymentMatchesOrder(data, order.total_minor);
    const paidAt = new Date().toISOString();
    const confirmation = paid ? createReceiptConfirmation() : null;
    const { data: changedOrder, error: saveError } = await db.from("shop_orders").update({
      payment_status: paid ? "paid" : "review",
      ...(paid ? { paid_at: paidAt, emails_claimed_at: paidAt, paid_event_id: event.id, payment_id: data.charge_id, checkout_id: data.checkout_id, receipt_confirmation_hash: confirmation.hash } : {}),
    }).eq("id", order.id).neq("payment_status", "paid")
      .select("id,customer_name,customer_email,customer_phone,delivery,items,subtotal_minor,shipping_minor,total_minor,emails_claimed_at")
      .maybeSingle();
    if (saveError) throw saveError;
    if (paid && changedOrder?.emails_claimed_at) {
      try { await sendOrderEmails(changedOrder, { receiptToken: confirmation.token }); }
      catch (error) { console.error(`Order ${order.id}: email attempt failed`, error?.message); }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Payment webhook failed", error?.code || error?.message);
    return NextResponse.json({ error: "Unable to save payment event." }, { status: 500 });
  }
}
```

### src/app/admin/orders/page.js

```javascript
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { PICKUP_ADDRESS } from "@/lib/checkout.mjs";
import { PAYMENT_STATUSES, FULFILLMENT_STATUSES, nextFulfillmentStatuses } from "@/lib/orderManagement.mjs";
import { formatDateTime } from "../adminUtils";
import styles from "../adminShell.module.css";
import orderStyles from "./orders.module.css";

const money = (minor) => `₦${(Number(minor) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const deliveryLabel = (method) => method === "pickup" ? "Shop pickup" : method === "yenagoa" ? "Delivery within Yenagoa" : "Delivery outside Yenagoa";

async function adminHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Your session has expired. Please sign in again.");
  return { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };
}

export default function Orders() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [payment, setPayment] = useState("all");
  const [fulfillment, setFulfillment] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    let mounted = true;
    const controller = new AbortController();
    const load = async () => {
      let repaging = false;
      try {
        const headers = await adminHeaders();
        if (!mounted) return;
        const query = new URLSearchParams({ payment, fulfillment, page: String(page) });
        const response = await fetch(`/api/admin/orders?${query}`, { headers, cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load orders.");
        if (mounted) {
          setTotal(result.total);
          setPageSize(result.pageSize);
          const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
          if (page > lastPage) { repaging = true; setPage(lastPage); return; }
          setOrders(result.orders);
          setError("");
        }
      } catch (err) {
        if (mounted) { setError(err.message || "Unable to load orders."); setOrders([]); setTotal(0); }
      } finally { if (mounted && !repaging) setLoading(false); }
    };
    load();
    return () => { mounted = false; controller.abort(); };
  }, [isAdmin, authLoading, payment, fulfillment, page, refresh]);

  const updateStatus = async (order, fulfillment_status) => {
    if (saving) return;
    setSaving(order.id);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH", headers: await adminHeaders(),
        body: JSON.stringify({ id: order.id, expected_status: order.fulfillment_status, fulfillment_status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update this order.");
      setLoading(true);
      setRefresh((value) => value + 1);
    } catch (err) { setError(err.message || "Unable to update this order."); }
    finally { setSaving(""); }
  };
  const changeFilter = (setFilter, value) => { setFilter(value); setPage(1); setLoading(true); };
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className={styles.pageHeader}>
        <div><h1 className={styles.pageTitle}>Shop orders</h1><p className={styles.pageSub}>Manage paid orders. Payments under review must be checked in Bachs before fulfilment.</p></div>
        <button type="button" className={styles.btn} disabled={loading || Boolean(saving)} onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh orders</button>
      </div>
      <div className={styles.toolbar}>
        <label className={orderStyles.filter}>Payment status
          <select className={styles.selectField} value={payment} disabled={Boolean(saving)} onChange={(event) => changeFilter(setPayment, event.target.value)}>
            <option value="all">All payments</option>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className={orderStyles.filter}>Fulfilment status
          <select className={styles.selectField} value={fulfillment} disabled={Boolean(saving)} onChange={(event) => changeFilter(setFulfillment, event.target.value)}>
            <option value="all">All fulfilment statuses</option>{FULFILLMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading ? <p className={styles.empty} role="status">Loading orders…</p> : <>
        <p className={styles.resultCount}>{total} matching {total === 1 ? "order" : "orders"} · newest first</p>
        {!orders.length ? <p className={styles.empty}>No orders match these filters.</p> : <div className={styles.list}>
          {orders.map((order) => {
            const review = order.payment_status === "review";
            const nextStatuses = nextFulfillmentStatuses(order.fulfillment_status, order.delivery?.method);
            return (
              <article className={`${styles.card} ${review ? orderStyles.review : ""}`} key={order.id}>
                <div className={styles.cardTop}>
                  <div><h2 className={styles.cardTitle}>{order.customer_name} — {money(order.total_minor)}</h2>
                    <p className={`${styles.meta} ${orderStyles.reference}`}>Reference: {order.id}</p>
                    <p className={styles.meta}>{formatDateTime(order.created_at)} · {deliveryLabel(order.delivery?.method)}</p>
                  </div>
                  <div className={styles.statusPills}>
                    <span className={`${styles.badge} ${review ? styles.badgeDeclined : order.payment_status === "paid" ? styles.badgeConfirmed : styles.badgePending}`}>Payment: {order.payment_status}</span>
                    <span className={styles.badge}>Fulfilment: {order.fulfillment_status}</span>
                    {order.customer_received_at && <span className={`${styles.badge} ${styles.badgeConfirmed}`}>Customer confirmed receipt</span>}
                  </div>
                </div>
                {review && <p className={orderStyles.reviewMessage}>Payment needs a manual check: the amount or currency did not match. Do not fulfil this order yet.</p>}
                <details className={orderStyles.details}>
                  <summary>View order details</summary>
                  <dl className={styles.detailGrid}>
                    <div><dt className={styles.detailLabel}>Customer</dt><dd className={styles.detailValue}>{order.customer_name}</dd></div>
                    <div><dt className={styles.detailLabel}>Email</dt><dd className={styles.detailValue}><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a></dd></div>
                    <div><dt className={styles.detailLabel}>Phone</dt><dd className={styles.detailValue}><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></dd></div>
                    <div><dt className={styles.detailLabel}>{order.delivery?.method === "pickup" ? "Pickup address" : "Delivery address"}</dt>
                      <dd className={styles.detailValue}>{order.delivery?.method === "pickup" ? PICKUP_ADDRESS : [order.delivery?.address, order.delivery?.city, order.delivery?.state].filter(Boolean).join(", ")}</dd></div>
                    <div><dt className={styles.detailLabel}>Paid at</dt><dd className={styles.detailValue}>{order.paid_at ? formatDateTime(order.paid_at) : "Not confirmed"}</dd></div>
                    <div><dt className={styles.detailLabel}>Customer receipt confirmation</dt><dd className={styles.detailValue}>{order.customer_received_at ? formatDateTime(order.customer_received_at) : "Not yet confirmed by customer"}</dd></div>
                  </dl>
                  <div className={orderStyles.tableWrap}><table className={orderStyles.table}>
                    <caption>Order items</caption><thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Unit price</th><th scope="col">Amount</th></tr></thead>
                    <tbody>{(order.items || []).map((item, index) => <tr key={`${item.productId || "item"}-${index}`}><td>{item.name}</td><td>{item.quantity}</td><td>{money(item.unitAmountMinor)}</td><td>{money(item.lineAmountMinor)}</td></tr>)}</tbody>
                  </table></div>
                  <p>Subtotal: {money(order.subtotal_minor)} · Delivery / pickup: {money(order.shipping_minor)} · <strong>Total: {money(order.total_minor)}</strong></p>
                </details>
                <div className={styles.actions}>
                  {order.payment_status === "paid" ? nextStatuses.length ? nextStatuses.map((status) => <button type="button" key={status} className={`${styles.btn} ${styles.btnPrimary}`} disabled={Boolean(saving)} onClick={() => updateStatus(order, status)}>{saving === order.id ? "Saving…" : `Mark ${status}`}</button>) : <span className={styles.meta}>Fulfilment completed.</span> : <span className={styles.meta}>Fulfilment is locked until payment is confirmed.</span>}
                </div>
              </article>
            );
          })}
        </div>}
        <nav className={`${styles.actions} ${orderStyles.pagination}`} aria-label="Order pages">
          <button type="button" className={styles.btn} disabled={page <= 1 || Boolean(saving)} onClick={() => { setPage((value) => value - 1); setLoading(true); }}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" className={styles.btn} disabled={page >= pages || Boolean(saving)} onClick={() => { setPage((value) => value + 1); setLoading(true); }}>Next</button>
        </nav>
      </>}
    </>
  );
}
```

### src/app/api/checkout/orders/[id]/received/route.js

```javascript
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutDatabase, receiptHash } from "@/lib/checkoutServer";

export const runtime = "nodejs";
const bodySchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), confirmed: z.literal(true) }).strict();
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });

export async function POST(request, { params }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return json({ error: "Invalid order reference." }, 400);
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
  const raw = await request.text();
  if (raw.length > 512) return json({ error: "Request is too large." }, 413);
  let input;
  try { input = bodySchema.safeParse(JSON.parse(raw)); } catch { return json({ error: "Invalid confirmation." }, 400); }
  if (!input.success) return json({ error: "Use your personal email link and confirm that you received the order." }, 400);
  try {
    const db = checkoutDatabase();
    const hash = receiptHash(input.data.token);
    const { data: changed, error } = await db.from("shop_orders").update({ customer_received_at: new Date().toISOString() })
      .eq("id", id).eq("payment_status", "paid").eq("receipt_confirmation_hash", hash).is("customer_received_at", null)
      .select("id,customer_received_at").maybeSingle();
    if (error) throw error;
    if (changed) return json({ confirmed: true, receivedAt: changed.customer_received_at });
    const { data: existing, error: lookupError } = await db.from("shop_orders").select("customer_received_at")
      .eq("id", id).eq("payment_status", "paid").eq("receipt_confirmation_hash", hash).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.customer_received_at) return json({ confirmed: true, alreadyConfirmed: true, receivedAt: existing.customer_received_at });
    return json({ error: "This confirmation link is invalid or is not for a paid order. Use the link in your payment email." }, 400);
  } catch (error) {
    console.error("Order receipt confirmation failed", error?.code || "database_error");
    return json({ error: "Unable to save your confirmation. Please try again." }, 503);
  }
}
```

### src/app/order-received/[id]/page.js

```javascript
import ReceiptConfirmation from "./ReceiptConfirmation";

export const metadata = { title: "Confirm order received", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function OrderReceived({ params }) {
  const { id } = await params;
  return <ReceiptConfirmation orderId={id} />;
}
```

### src/app/order-received/[id]/ReceiptConfirmation.js

```javascript
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../../checkout/checkout.module.css";
import account from "../../account/account.module.css";

export default function ReceiptConfirmation({ orderId }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (busy || !confirmed) return;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!/^[a-f0-9]{64}$/.test(token || "")) { setError("Open the personal confirmation link in your payment email."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/checkout/orders/${encodeURIComponent(orderId)}/received`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ token, confirmed: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your confirmation could not be saved.");
      setResult(data);
    } catch (err) { setError(err.message || "Connection lost. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className={`${styles.page} ${styles.receipt}`}>
    <Link className={styles.back} href="/ready-to-wear">← Back to the shop</Link>
    <h1>{result ? "Receipt confirmed" : "Have you received your order?"}</h1>
    {result ? <div className={account.success} role="status"><p>{result.alreadyConfirmed ? "You have already confirmed receipt of this order." : "Thank you. Your confirmation has been saved and the shop can see that you received your order."}</p><p>Confirmed on {new Date(result.receivedAt).toLocaleString("en-GB")}.</p></div> : <>
      <p className={styles.lede}>Only confirm after you have received every product in this order. You do not need to sign in.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <form className={account.form} onSubmit={submit}>
        <label className={account.check}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} required />I confirm that I have received every product in this order.</label>
        <button className={styles.button} type="submit" disabled={busy || !confirmed}>{busy ? "Saving confirmation…" : "I have received the product"}</button>
      </form>
    </>}
    <p className={styles.lede}>If anything is missing, damaged, or incorrect, contact the shop on <a href="tel:+2348166361710">08166361710</a>. Confirming receipt does not prevent you from reporting a product problem.</p>
  </main>;
}
```

## 4. Environment variables

**No new environment variables are required.** The existing **Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State** address is reused directly from PICKUP_ADDRESS in src/lib/checkout.mjs. The shared registration message retains the requested wording and line break, including ORIENTAION.

All administrator notifications — student registration, ready-to-wear paid orders, refund/complaint alerts, and bespoke requests — use **elegantyoufashion18@gmail.com**, defined once as ADMIN_NOTIFY_EMAIL in src/lib/orderEmails.mjs. Customer receipts, acceptance messages, and support updates still go to the relevant customer or student. Old recipient environment settings are ignored; the address and recipient environment variables have been removed from .env.example and the local configuration.

Reuse the existing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, and RESEND_FROM_EMAIL in .env.local and Vercel. Keep the service-role key and Resend credentials server-only. RESEND_FROM_EMAIL must use an existing verified Resend sender/domain. Redeploy the updated code for the website to use the new notification routing and API-backed registration flows. Both Supabase migrations are already applied.

Acceptance changes lock the application row and permanently claim one automatic acceptance-email attempt, with a stable Resend idempotency key. Repeated acceptance and later reacceptance do not send another email. Email failures are logged without reverting acceptance. A claimed attempt is not proof of delivery; a process interruption or provider failure can leave no delivered email. Monitor Vercel/Resend logs and handle any necessary follow-up separately. Previously accepted applications do not get backfilled.

Account deactivation sets public.users.is_active=false and revokes sessions. Retained access tokens cannot use the new account routes or reactivate the profile through RLS. Existing sign-in/profile checks block inactive accounts. Reactivation is an administrator operation in Supabase; it is not exposed to customers. Google users without a password can use the existing recovery flow to set one before password-confirmed account actions. Applications, orders, and support records are retained on deactivation.

## Customer receipt confirmation

New paid-order customer emails now include an **I have received the product** button. It opens a page where the buyer must check that they received every product in the order and explicitly submit confirmation. Guest buyers do not need an account. Opening the email or page performs no database update.

Each newly verified payment creates a random 256-bit token. Its SHA-256 hash is stored in shop_orders.receipt_confirmation_hash; the raw token appears only in the customer email link's URL fragment. It is never returned in admin/account API data or included in the administrator email. The fragment is not sent with the initial page request. The page uses no-referrer metadata and submits the token only in the same-origin confirmation POST. The link is a personal bearer credential; anyone it is forwarded to can confirm that order, so customers are asked to keep it private. No new secret or environment variable is needed.

The endpoint requires an explicit confirmation, a matching order/token hash, and a paid order. It atomically sets shop_orders.customer_received_at only while that value is null. Concurrent/repeated submissions return the original confirmation time. It does not alter payment or staff fulfilment status. Admins see a customer-confirmed receipt badge and timestamp; the customer's order history shows the recorded time. Existing emails cannot gain a new button retroactively, and previously paid orders are not silently marked received.

The additive receipt migration was applied to the connected Elegant Style Fashion project. Live checks confirm that customer/guest roles cannot directly change receipt status or read the token hash. A rollback-only check confirmed that a paid-order receipt saves once and repeat writes cannot overwrite its time. Existing orders remain unconfirmed and unchanged after verification. Security advisors reported no new warnings.

Before using the feature on the website, deploy the updated source. Then make a fresh sandbox purchase, check the payment email's receipt button, open it without submitting and verify no confirmation is recorded, explicitly confirm receipt, and check the customer/admin timestamps. Repeat the link to verify the original time is retained. Use a wrong or altered link and an unpaid order to verify rejection. No live customer receipt or test email was created during implementation.

## 5. Verification and deployment checklist

Completed verification:

- Applied migration 20261017112938 to the connected Elegant Style Fashion project and verified all five sponsorship/claim/declaration columns, the new RLS tables, and the BIGINT admission function. Client roles cannot insert students, execute admission review, alter order payment status, or read receipt hashes. Existing data is unchanged: one pending student and four orders remain; the new support tables are empty. The live acceptance test claimed once and refused a duplicate, then rolled back every application change.
- Compared Supabase security advisors before/after: no new warning-level issues. The new server-only rate-limit table intentionally has RLS and no client policies. Existing unrelated advisor warnings remain.

- Production Next.js build passed, including TypeScript processing. Full ESLint passed with zero errors and warnings. The pre-existing multiple-lockfile workspace-root warning remains in Next.js output.
- All 51 automated tests passed, including existing Bachs webhook/payment checks and the new validation/email/RLS checks. The SQL test runs actual PostgreSQL in an isolated PGlite process; it does not connect to a live Supabase project.
- SQL checks cover two customers and an administrator, legacy rows and repeated migration application, invalid sponsorship, duplicate registration, single acceptance claims, ownership forgery, unpaid/wrong products, immutable request fields, allowed status changes, inactive users, and rate limits.
- All eight new protected HTTP operations returned 401 without authentication.
- Browser checks cover mobile menus at 320px and 390px, desktop navbar at 1440px, avatar /account navigation and 32px desktop dimensions, scholarship required/clear behavior and exact placeholder, unauthenticated redirect, and customer/admin forms with isolated browser fixtures. Repurchase wrote one product to the existing cart format. Complaint submission, password change, deactivation/sign-out, and admin approval sent the expected payloads in those fixtures. Those browser forms used local fixtures. Live schema/grant checks and an acceptance deduplication test have now passed on Supabase; the acceptance test was rolled back. No external email was sent.
- A pre-existing sign-in hero image returned HTTP 400 from the local Next image optimizer during the browser check. The new account pages reported no page errors.

To reproduce automated checks in PowerShell without adding a project dependency:

```powershell
$accountDbCheck = Join-Path $env:TEMP 'elegant-account-db-check'
npm install --prefix $accountDbCheck --no-save --no-package-lock @electric-sql/pglite
$env:PGLITE_MODULE_PATH = Join-Path $accountDbCheck 'node_modules/@electric-sql/pglite/dist/index.js'
node --experimental-vm-modules --test scripts/*.test.mjs
npm run lint
npm run build
```

The VM flag is required by the existing order-management route tests. Without PGLITE_MODULE_PATH, the isolated database suite explicitly skips and the remaining tests still run.

After deploying:

1. The SQL is already applied to the connected project. Deploy the updated code with the existing Resend/Supabase credentials; no new address or administrator-recipient variables are needed.
2. Open the menu on a small phone: logo is at the top, links and close button work, Escape closes it, and keyboard focus stays within the open menu. Check the desktop navbar and avatar too.
3. Register a new student: Sponsorship follows programme, all three choices work, Scholarship requires the exact-placeholder organization field, and changing to Guardian/Self sponsored clears it. Submit each valid sponsorship case with a real JPG/PNG passport upload. Inspect the saved values and rejection of invalid submissions.
4. Confirm the administrator receives the full registration email and can see both sponsorship fields in the student details. Confirm the completion message and address on the page and email match the requested text.
5. Accept a pending application and confirm one student acceptance email. Repeat the acceptance action, then decline/reaccept in a preview test: no second automatic acceptance email should be sent. Verify an email failure is logged while acceptance remains saved.
6. Click the avatar: /account opens. A logged-out visit redirects to sign-in. Change a password and test the existing recovery/Google flows. Cancel deactivation once, then confirm it with password and checkbox: sign-out occurs and inactive login is blocked. Use a disposable test account.
7. Complete a Bachs sandbox guest purchase with the verified account email. Check My orders shows the paid product and fulfilment status, while a different account cannot see it. Ensure the existing guest receipt/status flow still works.
8. Use Buy again and check one available item is added, checkout uses current prices, and the existing quantity/cart limits still apply.
9. Submit a refund reason and a complaint with receipt confirmation. Confirm customer confirmation and administrator alert emails, saved pending records, and customer history. Repeating the same product/order request should return the existing request without another alert.
10. Review each request in /admin/customer-requests, check customer contact details, save a status/response, and confirm the customer sees the response and receives the update email. Refund approval does not transfer funds; arrange any refund separately. A stale concurrent update must return 409.
11. With two signed-in test accounts, confirm direct Supabase reads/inserts cannot access or forge the other customer's requests, and customer status/payment/ownership changes are denied. Non-admin and inactive-admin API access must be denied.

Both live SQL migrations are applied and verified. Source changes still need deployment to the website. No real customer registration or external email was created during verification.
