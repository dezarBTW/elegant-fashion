BEGIN;
-- These obsolete browser-write policies were already disabled by table grants.
-- Keep writes server-only, and avoid evaluating duplicate legacy rules.
REVOKE INSERT,UPDATE,DELETE ON public.students FROM anon,authenticated;
DROP POLICY "Students can insert own data" ON public.students;
DROP POLICY "Students can update own data" ON public.students;
DROP POLICY "Admins can update all students" ON public.students;

DROP POLICY "Admins can update all users" ON public.users;
DROP POLICY users_update_own_not_admin ON public.users;
CREATE POLICY users_update_authorized ON public.users FOR UPDATE TO authenticated
USING (id=(SELECT auth.uid()) OR (SELECT public.is_admin_user()))
WITH CHECK ((SELECT public.is_admin_user()) OR
 (id=(SELECT auth.uid()) AND coalesce(is_admin,false)=(SELECT public.is_admin_user())));
-- users_active_updates remains restrictive: inactive profiles cannot be updated.

-- Split admin ALL policies into writes, then combine the two authenticated read
-- predicates. Anonymous reads keep their original public-only condition.
DO $$
DECLARE entry record; predicate text;
BEGIN
 FOR entry IN SELECT * FROM (VALUES
   ('categories','categories_public_read','categories_admin_all'),
   ('product_categories','product_categories_public_read','product_categories_admin_all'),
   ('product_images','images_public_read','product_images_admin_all'),
   ('product_variants','variants_public_read','product_variants_admin_all')
 ) v(table_name,read_policy,admin_policy) LOOP
   SELECT qual INTO STRICT predicate FROM pg_policies WHERE schemaname='public'
     AND tablename=entry.table_name AND policyname=entry.read_policy;
   EXECUTE format('ALTER POLICY %I ON public.%I TO anon',entry.read_policy,entry.table_name);
   EXECUTE format('DROP POLICY %I ON public.%I',entry.admin_policy,entry.table_name);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((%s) OR (SELECT public.is_admin_user()))',entry.table_name||'_account_read',entry.table_name,predicate);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin_user()))',entry.table_name||'_admin_insert',entry.table_name);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.is_admin_user())) WITH CHECK ((SELECT public.is_admin_user()))',entry.table_name||'_admin_update',entry.table_name);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((SELECT public.is_admin_user()))',entry.table_name||'_admin_delete',entry.table_name);
 END LOOP;
END;
$$;
NOTIFY pgrst,'reload schema';
COMMIT;
