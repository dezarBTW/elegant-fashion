-- Vendor status is managed by trusted server operations, never by the user.
BEGIN;

CREATE TABLE public.vendor_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'not_invited'
    CHECK (status IN ('not_invited', 'pending', 'active', 'declined', 'revoked')),
  invited_at timestamptz,
  accepted_at timestamptz,
  accepted_terms_version text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'active' OR (accepted_at IS NOT NULL AND accepted_terms_version IS NOT NULL))
);

ALTER TABLE public.vendor_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendor_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vendor_accounts TO authenticated;
GRANT ALL ON public.vendor_accounts TO service_role;

CREATE POLICY vendor_accounts_read_own ON public.vendor_accounts
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE FUNCTION public.is_vendor()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendor_accounts v
    JOIN public.users u ON u.id = v.user_id
    WHERE v.user_id = (SELECT auth.uid()) AND v.status = 'active' AND u.is_active = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_vendor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_vendor() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
