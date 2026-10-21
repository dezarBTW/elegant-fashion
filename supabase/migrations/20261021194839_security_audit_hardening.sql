BEGIN;

-- Only trusted application servers can ask about a verified token's session.
CREATE OR REPLACE FUNCTION public.is_live_account_session(p_user_id uuid, p_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.sessions WHERE id = p_session_id AND user_id = p_user_id);
$$;
REVOKE ALL ON FUNCTION public.is_live_account_session(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_live_account_session(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.check_email_exists(text) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.handle_updated_at() SECURITY INVOKER;
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

-- Row policies do not govern TRUNCATE. Browser roles need no DDL privileges.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon;

-- An inactive administrator must not retain catalog/storage privileges.
CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT is_admin AND is_active FROM public.users WHERE id = auth.uid()), false);
$$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$ SELECT public.is_admin_user(); $$;
DROP POLICY IF EXISTS "Admins can do anything on products" ON public.products;
CREATE POLICY "Admins can do anything on products" ON public.products FOR ALL TO authenticated
USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

UPDATE storage.buckets SET public = false WHERE id = 'student-passports';
DROP POLICY IF EXISTS "Public can view student passports" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own passport" ON storage.objects;
CREATE POLICY "Users can update own passport" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'student-passports' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'student-passports' AND (storage.foldername(name))[1] = auth.uid()::text
  AND storage.filename(name) ~ '^passport\.(jpg|png)$'
  AND metadata->>'mimetype' IN ('image/jpeg','image/png')
  AND (metadata->>'size')::bigint BETWEEN 1 AND 5242880);

NOTIFY pgrst, 'reload schema';
COMMIT;
