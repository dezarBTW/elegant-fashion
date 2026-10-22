BEGIN;
-- requireActiveAccount verifies the token with Auth, confirms the email, checks
-- session revocation and the active profile before calling this service-only RPC.
-- service_role cannot SELECT auth.users in hosted Supabase. Keep SECURITY INVOKER
-- and that restriction; do not widen Auth-table access or expose this RPC.
CREATE OR REPLACE FUNCTION public.link_legacy_account_orders(p_user_id uuid,p_email text) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claimed boolean; linked integer;
BEGIN
 p_email := lower(btrim(p_email));
 IF p_email IS NULL OR length(p_email)>320 OR strpos(p_email,'@')<2
 OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_user_id AND is_active) THEN
   RAISE EXCEPTION 'Verified active account required' USING ERRCODE='42501';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,1));
 INSERT INTO public.account_order_claims(user_id,verified_email) VALUES(p_user_id,p_email)
 ON CONFLICT DO NOTHING RETURNING true INTO claimed;
 IF claimed IS DISTINCT FROM true THEN RETURN 0; END IF;
 UPDATE public.shop_orders SET user_id=p_user_id WHERE user_id IS NULL AND customer_email=p_email;
 GET DIAGNOSTICS linked=ROW_COUNT;
 RETURN linked;
END; $$;
REVOKE ALL ON FUNCTION public.link_legacy_account_orders(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.link_legacy_account_orders(uuid,text) TO service_role;
COMMENT ON FUNCTION public.link_legacy_account_orders(uuid,text) IS
'Service-only: caller must supply the email from an Auth-verified, confirmed, active non-anonymous account with a live session; never accept identity fields from request JSON.';
NOTIFY pgrst,'reload schema';
COMMIT;
