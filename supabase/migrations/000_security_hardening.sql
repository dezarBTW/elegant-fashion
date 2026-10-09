-- =============================================================================
-- 000_security_hardening.sql
-- Critical security fixes - APPLY FIRST before any other migrations
-- Project: Elegant styles (yrzvqvdrahfmmoprgukd)
-- =============================================================================

BEGIN;

-- 1. Fix public.users privilege escalation vulnerability
-- The UPDATE policy with no WITH CHECK allowed users to set is_admin = true

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

CREATE POLICY "users_update_own_not_admin" ON public.users
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND coalesce(is_admin, false) = public.is_admin_user()
  );

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own row" ON public.users;

CREATE POLICY "users_insert_own_not_admin" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()) AND coalesce(is_admin, false) = false);

-- 2. Remove permissive storage policy that let any user upload to product-images
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;

-- 3. Fix handle_new_user SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, username, email, is_admin)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email,
    false
  );
  RETURN new;
END $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

-- 4. Grant hygiene
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

COMMIT;

-- VERIFY: After running, test:
-- 1. Sign up a new user - should work
-- 2. Edit your profile (except is_admin) - should work
-- 3. Try to set is_admin = true on yourself - should fail
-- 4. Admin product create/edit - should work for admins only