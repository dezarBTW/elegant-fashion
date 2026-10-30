-- Profile changes are handled by authenticated server routes using the
-- service role. Browser clients only need to read their own profile.
REVOKE UPDATE, DELETE ON TABLE public.users FROM anon, authenticated;
