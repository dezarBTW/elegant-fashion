-- 004_remove_username.sql
-- Remove usernames from profile records and existing Auth metadata.
-- Signup profiles now use email only; existing emails and account IDs are preserved.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, is_admin)
  values (new.id, new.email, false);
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop function if exists public.check_username_exists(text);
drop function if exists public.check_signup_conflicts(text, text);

update auth.users
   set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'username'
 where raw_user_meta_data ? 'username';

alter table public.users drop column username;

commit;
