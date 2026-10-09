-- 000_security_hardening.sql
-- Fixes issues found by reading the live project "Elegant styles" on 2026-10-07.
-- APPLY FIRST. Test on a branch (or a copy) before production, then check:
--   sign-up, editing your own profile, admin product create/edit, admin product-image upload.

begin;

-- 1. public.users: stop signed-in users from promoting themselves to admin ------------
-- Live state: policy "Users can update own row" has USING (auth.uid() = id) and NO WITH CHECK.
-- Permissive policies are OR-ed, so it overrides the stricter "Users can update own data"
-- and lets any user UPDATE their own row, including is_admin = true. Since is_admin_user()
-- gates the products admin policies, product-image uploads and the students' passport
-- admin policies, that would be full admin takeover.
drop policy if exists "Users can update own row"  on public.users;
drop policy if exists "Users can update own data" on public.users;

create policy "users_update_own_not_admin" on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and coalesce(is_admin, false) = public.is_admin_user()   -- is_admin must stay unchanged
  );

-- Same class of problem on INSERT: the row is created by the on_auth_user_created trigger,
-- but the client-facing insert policies did not forbid is_admin = true.
drop policy if exists "Users can insert own data" on public.users;
drop policy if exists "Users can insert own row"  on public.users;

create policy "users_insert_own_not_admin" on public.users
  for insert to authenticated
  with check (id = (select auth.uid()) and coalesce(is_admin, false) = false);

-- Optional, stronger (column-level) guard. It also stops ADMINS from editing other columns
-- from the browser, so enable it only if your admin UI doesn't do that:
--   revoke update on public.users from authenticated;
--   grant  update (username) on public.users to authenticated;

-- 2. storage: any signed-in user could upload anything to the public product-images bucket
-- Live state: "Authenticated users can upload product images" checks only bucket_id.
-- The stricter admin policy (admin + products/ folder + .jpg/.png + 5 MB) is ignored while
-- this one exists.
-- NOTE: if your admin UI uploads .jpeg/.webp/.avif, those currently pass only because of
-- this broad policy. Extend "Admins can upload product images" first if you need them.
drop policy if exists "Authenticated users can upload product images" on storage.objects;

-- 3. handle_new_user: mutable search_path on a SECURITY DEFINER trigger function ------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, username, email, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email,
    false
  );
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 4. Grants hygiene: PostgREST never needs these, and TRUNCATE ignores RLS ------------
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

commit;

-- ---------------------------------------------------------------------------------
-- NOT applied here: decide separately (outside the storefront, but found in this project)
--
-- a) Bucket "student-passports" is PUBLIC and has the policy "Public can view student
--    passports", so every student's passport photo is readable by anyone with the URL.
--    Fix = make the bucket private, drop that policy, and serve photos via signed URLs
--    (app code change):
--      update storage.buckets set public = false where id = 'student-passports';
--      drop policy if exists "Public can view student passports" on storage.objects;
--
-- b) public.check_email_exists / check_username_exists / check_signup_conflicts are
--    SECURITY DEFINER. If they are executable by anon they allow account enumeration.
--    Review their EXECUTE grants and add rate limiting.
--
-- c) Duplicate policies (e.g. two public SELECT policies on products and on storage
--    objects, two sets of users policies) are harmless but confusing; consolidate later.
-- ---------------------------------------------------------------------------------
