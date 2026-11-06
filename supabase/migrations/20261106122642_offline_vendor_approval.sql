BEGIN;
ALTER TABLE public.users ADD COLUMN is_vendor boolean NOT NULL DEFAULT false;
UPDATE public.users u SET is_vendor=true FROM public.vendor_accounts v WHERE v.user_id=u.id AND v.status='active';
CREATE POLICY users_vendor_insert_guard ON public.users AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (is_vendor=false);
REVOKE UPDATE (is_vendor) ON public.users FROM anon,authenticated;
DROP TRIGGER IF EXISTS vendor_invitation_queue ON public.vendor_accounts;
DROP TRIGGER IF EXISTS record_vendor_terms ON public.vendor_accounts;
UPDATE public.vendor_notifications SET sent_at=now(),last_error='Cancelled: vendor onboarding is handled offline.' WHERE kind='invite' AND sent_at IS NULL;
CREATE OR REPLACE FUNCTION public.is_vendor() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.users WHERE id=(SELECT auth.uid()) AND is_vendor AND is_active);
$$;
CREATE OR REPLACE FUNCTION public.seller_save_product(p_actor uuid,p_id uuid,p_product jsonb,p_quantities jsonb,p_revision bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE admin_actor boolean; current_owner public.product_owners;
BEGIN
  SELECT is_admin INTO admin_actor FROM public.users WHERE id=p_actor AND is_active;
  IF admin_actor IS NULL THEN RAISE EXCEPTION 'Account inactive' USING ERRCODE='42501'; END IF;
  IF NOT admin_actor THEN
    PERFORM 1 FROM public.users WHERE id=p_actor AND is_vendor AND is_active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Vendor access required' USING ERRCODE='42501'; END IF;
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

REVOKE ALL ON FUNCTION public.seller_save_product(uuid,uuid,jsonb,jsonb,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seller_save_product(uuid,uuid,jsonb,jsonb,bigint) TO service_role;
-- Keep the old signature usable during deployment, without enforcing online terms.
CREATE OR REPLACE FUNCTION public.seller_save_product(p_actor uuid,p_id uuid,p_product jsonb,p_quantities jsonb,p_revision bigint,p_terms_version text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT public.seller_save_product(p_actor,p_id,p_product,p_quantities,p_revision);
$$;
CREATE OR REPLACE FUNCTION public.vendor_remove_product(p_actor uuid,p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.users WHERE id=p_actor AND is_vendor AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vendor access required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.product_owners WHERE product_id=p_id AND user_id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product access denied' USING ERRCODE='42501'; END IF;
 UPDATE public.products SET is_active=false WHERE id=p_id;
END $$;
CREATE OR REPLACE FUNCTION public.seller_item_action(p_actor uuid,p_item uuid,p_action text,p_note text DEFAULT '')
RETURNS public.seller_order_items LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item public.seller_order_items; ord public.shop_orders; admin_actor boolean; multi_vendor boolean; next_state text;
BEGIN
 SELECT is_admin INTO admin_actor FROM public.users WHERE id=p_actor AND is_active;
 IF admin_actor IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO item FROM public.seller_order_items WHERE id=p_item;
 IF NOT FOUND THEN RAISE EXCEPTION 'Item unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO ord FROM public.shop_orders WHERE id=item.order_id FOR UPDATE;
 SELECT * INTO item FROM public.seller_order_items WHERE id=p_item FOR UPDATE;
 IF ord.payment_status<>'paid' THEN RAISE EXCEPTION 'Payment is not verified' USING ERRCODE='42501'; END IF;
 SELECT count(DISTINCT seller_id) FILTER(WHERE seller_kind='vendor')>=2 INTO multi_vendor FROM public.seller_order_items WHERE order_id=ord.id;
 IF p_action='confirm' THEN
   IF p_actor IS DISTINCT FROM ord.user_id OR item.fulfilment NOT IN ('shipped','ready') OR item.confirmed_at IS NOT NULL THEN RAISE EXCEPTION 'Confirmation unavailable' USING ERRCODE='42501'; END IF;
   UPDATE public.seller_order_items SET confirmed_at=now(),confirmed_by=p_actor,confirmation_method='customer',fulfilment='completed' WHERE id=p_item;
 ELSIF p_action='verify_delivery' THEN
   IF NOT admin_actor OR now()<ord.paid_at+interval '7 days' OR item.confirmed_at IS NOT NULL OR length(btrim(p_note))<10 THEN RAISE EXCEPTION 'Administrator verification and evidence required' USING ERRCODE='42501'; END IF;
   UPDATE public.seller_order_items SET confirmed_at=now(),confirmed_by=p_actor,confirmation_method='admin',verification_note=p_note,fulfilment='completed' WHERE id=p_item;
 ELSIF p_action='payment_fulfilled' THEN
   IF NOT admin_actor OR item.seller_kind<>'vendor' OR item.confirmed_at IS NULL OR now()<item.confirmed_at+interval '3 days' OR item.payment_marked_at IS NOT NULL THEN RAISE EXCEPTION 'Payment not eligible' USING ERRCODE='42501'; END IF;
   IF EXISTS(SELECT 1 FROM public.refund_requests WHERE order_id=ord.id AND product_id=item.product_id AND status IN ('pending','approved')) OR EXISTS(SELECT 1 FROM public.product_complaints WHERE order_id=ord.id AND product_id=item.product_id AND status IN ('pending','in_review')) THEN RAISE EXCEPTION 'Payment is on hold' USING ERRCODE='42501'; END IF;
   UPDATE public.seller_order_items SET payment_marked_at=now() WHERE id=p_item;
 ELSIF p_action='payment_received' THEN
   IF item.seller_id<>p_actor OR item.payment_marked_at IS NULL OR item.payment_received_at IS NOT NULL THEN RAISE EXCEPTION 'Payment confirmation unavailable' USING ERRCODE='42501'; END IF;
   UPDATE public.seller_order_items SET payment_received_at=now() WHERE id=p_item;
 ELSE
   IF NOT admin_actor AND NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_actor AND is_vendor AND is_active) THEN RAISE EXCEPTION 'Vendor access required' USING ERRCODE='42501'; END IF;
   IF admin_actor AND item.seller_kind='vendor' AND NOT multi_vendor AND ord.delivery->>'method'<>'pickup' THEN RAISE EXCEPTION 'Vendor controls fulfilment' USING ERRCODE='42501'; END IF;
   IF NOT admin_actor AND item.seller_id<>p_actor THEN RAISE EXCEPTION 'Item access denied' USING ERRCODE='42501'; END IF;
   next_state:=p_action;
   IF NOT ((item.fulfilment='new' AND next_state='processing') OR (item.fulfilment='processing' AND next_state='sent_to_shop' AND item.seller_kind='vendor' AND (multi_vendor OR ord.delivery->>'method'='pickup')) OR (item.fulfilment='sent_to_shop' AND next_state='at_shop' AND admin_actor) OR (item.fulfilment IN ('processing','at_shop') AND next_state IN ('shipped','ready'))) THEN RAISE EXCEPTION 'Invalid fulfilment transition' USING ERRCODE='42501'; END IF;
   IF next_state IN ('shipped','ready') THEN
     IF admin_actor AND item.seller_kind='vendor' AND item.fulfilment<>'at_shop' THEN RAISE EXCEPTION 'Confirm shop handoff first' USING ERRCODE='42501'; END IF;
     IF NOT admin_actor AND (multi_vendor OR ord.delivery->>'method'='pickup') THEN RAISE EXCEPTION 'Send this item to the shop' USING ERRCODE='42501'; END IF;
     IF (next_state='ready')<>(ord.delivery->>'method'='pickup') THEN RAISE EXCEPTION 'Invalid delivery method' USING ERRCODE='42501'; END IF;
   END IF;
   IF admin_actor AND multi_vendor AND next_state IN ('shipped','ready') THEN
     IF EXISTS(SELECT 1 FROM public.seller_order_items WHERE order_id=ord.id AND ((seller_kind='vendor' AND fulfilment<>'at_shop') OR (seller_kind='admin' AND fulfilment<>'processing'))) THEN RAISE EXCEPTION 'Wait until every vendor item reaches the shop and administrator items are prepared' USING ERRCODE='42501'; END IF;
     UPDATE public.seller_order_items SET fulfilment=next_state,shipped_at=CASE WHEN next_state='shipped' THEN now() ELSE shipped_at END WHERE order_id=ord.id;
     INSERT INTO public.seller_order_events(item_id,actor_id,action,note) SELECT id,p_actor,next_state,'Combined order dispatch' FROM public.seller_order_items WHERE order_id=ord.id AND id<>p_item;
   ELSE
     UPDATE public.seller_order_items SET fulfilment=next_state,shipped_at=CASE WHEN next_state='shipped' THEN now() ELSE shipped_at END WHERE id=p_item;
   END IF;
 END IF;
 INSERT INTO public.seller_order_events(item_id,actor_id,action,note) VALUES(p_item,p_actor,p_action,left(p_note,2000));
 SELECT * INTO item FROM public.seller_order_items WHERE id=p_item;
 RETURN item;
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
