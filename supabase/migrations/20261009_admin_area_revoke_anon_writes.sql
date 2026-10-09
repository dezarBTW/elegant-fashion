-- Defence in depth for the admin area (already applied to the live project).
-- Row-level security already blocks these requests, but visitors who are not signed in
-- should not hold write privileges on these tables at all.
REVOKE ALL ON public.bespoke_requests FROM anon;
REVOKE ALL ON public.students FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.products FROM anon;
