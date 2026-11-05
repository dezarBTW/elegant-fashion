CREATE OR REPLACE FUNCTION public.seller_save_product(p_actor uuid,p_id uuid,p_product jsonb,p_quantities jsonb,p_revision bigint,p_terms_version text)
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
EXCEPTION WHEN serialization_failure THEN
 RAISE EXCEPTION 'stock_changed' USING ERRCODE='P0002';
END $$;
