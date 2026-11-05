BEGIN;
CREATE TABLE public.product_owners (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seller_kind text NOT NULL CHECK (seller_kind IN ('admin','vendor'))
);
CREATE INDEX product_owners_user_idx ON public.product_owners(user_id);
ALTER TABLE public.product_owners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_owners FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_owners TO authenticated;
GRANT ALL ON public.product_owners TO service_role;
CREATE POLICY product_owners_read ON public.product_owners FOR SELECT TO authenticated
  USING (user_id=(SELECT auth.uid()) OR (SELECT public.is_admin_user()));
INSERT INTO public.product_owners(product_id,user_id,seller_kind)
SELECT p.id, a.id, 'admin' FROM public.products p CROSS JOIN LATERAL
  (SELECT id FROM public.users WHERE is_admin AND is_active ORDER BY id LIMIT 1) a;

CREATE FUNCTION public.seller_save_product(p_actor uuid,p_id uuid,p_product jsonb,p_quantities jsonb,p_revision bigint,p_terms_version text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE admin_actor boolean; current_owner public.product_owners;
BEGIN
  SELECT is_admin INTO admin_actor FROM public.users WHERE id=p_actor AND is_active;
  IF admin_actor IS NULL THEN RAISE EXCEPTION 'Account inactive' USING ERRCODE='42501'; END IF;
  IF NOT admin_actor THEN
    PERFORM 1 FROM public.vendor_accounts WHERE user_id=p_actor AND status='active'
      AND accepted_terms_version=p_terms_version FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Vendor agreement required' USING ERRCODE='42501'; END IF;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
  SELECT * INTO current_owner FROM public.product_owners WHERE product_id=p_id;
  IF EXISTS(SELECT 1 FROM public.products WHERE id=p_id) AND NOT admin_actor
    AND (current_owner.user_id IS NULL OR current_owner.user_id<>p_actor) THEN
    RAISE EXCEPTION 'Product access denied' USING ERRCODE='42501';
  END IF;
  PERFORM public.admin_save_stock_product(p_id,p_product,p_quantities,p_revision);
  INSERT INTO public.product_owners(product_id,user_id,seller_kind)
  VALUES(p_id,p_actor,CASE WHEN admin_actor THEN 'admin' ELSE 'vendor' END)
  ON CONFLICT(product_id) DO NOTHING;
  RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.seller_save_product(uuid,uuid,jsonb,jsonb,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seller_save_product(uuid,uuid,jsonb,jsonb,bigint,text) TO service_role;
CREATE FUNCTION public.vendor_remove_product(p_actor uuid,p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.vendor_accounts v JOIN public.users u ON u.id=v.user_id WHERE v.user_id=p_actor AND v.status='active' AND u.is_active FOR UPDATE OF v;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vendor access required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.product_owners WHERE product_id=p_id AND user_id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product access denied' USING ERRCODE='42501'; END IF;
 UPDATE public.products SET is_active=false WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.vendor_remove_product(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_remove_product(uuid,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
