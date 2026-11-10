BEGIN;
CREATE FUNCTION public.set_seller_shipping_progress(p_actor uuid,p_item uuid,p_expected text,p_next text)
RETURNS public.seller_order_items LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item public.seller_order_items; ord public.shop_orders; seller_count integer;
BEGIN
 SELECT * INTO item FROM public.seller_order_items WHERE id=p_item FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Item not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO ord FROM public.shop_orders WHERE id=item.order_id FOR UPDATE;
 IF ord.payment_status<>'paid' OR item.seller_kind<>'vendor' OR item.seller_id<>p_actor OR NOT EXISTS
   (SELECT 1 FROM public.users WHERE id=p_actor AND is_vendor AND is_active) THEN
   RAISE EXCEPTION 'Vendor progress is unavailable' USING ERRCODE='42501'; END IF;
 SELECT count(DISTINCT seller_id) INTO seller_count FROM public.seller_order_items WHERE order_id=item.order_id;
 IF seller_count<>1 OR ord.delivery->>'method'='pickup' THEN
   RAISE EXCEPTION 'Shop drop offs are handled by the administrator' USING ERRCODE='42501'; END IF;
 IF item.fulfilment<>p_expected OR NOT ((p_expected='new' AND p_next='ready') OR (p_expected='ready' AND p_next='shipped')) THEN
   RAISE EXCEPTION 'Item progress changed; refresh before trying again' USING ERRCODE='40001'; END IF;
 UPDATE public.seller_order_items SET fulfilment=p_next,shipped_at=CASE WHEN p_next='shipped' THEN clock_timestamp() ELSE shipped_at END WHERE id=p_item RETURNING * INTO item;
 INSERT INTO public.seller_order_events(item_id,actor_id,action,note) VALUES(p_item,p_actor,p_next,'Vendor direct shipment');
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.set_seller_shipping_progress(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_seller_shipping_progress(uuid,uuid,text,text) TO service_role;

CREATE FUNCTION public.set_shop_shipping_progress(p_actor uuid,p_order uuid,p_item uuid,p_expected text,p_next text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE ord public.shop_orders; item public.seller_order_items; seller_count integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_actor AND is_admin AND is_active) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 SELECT * INTO ord FROM public.shop_orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='P0002'; END IF;
 IF ord.payment_status<>'paid' THEN RAISE EXCEPTION 'Payment must be confirmed' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.seller_order_items WHERE order_id=p_order ORDER BY id FOR UPDATE;
 SELECT count(DISTINCT seller_id) INTO seller_count FROM public.seller_order_items WHERE order_id=p_order;
 IF seller_count=1 AND ord.delivery->>'method'<>'pickup' AND EXISTS(SELECT 1 FROM public.seller_order_items WHERE order_id=p_order AND seller_kind='vendor') THEN RAISE EXCEPTION 'Direct shipment belongs to the vendor' USING ERRCODE='42501'; END IF;
 IF p_next='at_shop' THEN
   SELECT * INTO item FROM public.seller_order_items WHERE id=p_item AND order_id=p_order;
   IF NOT FOUND OR item.seller_kind<>'vendor' OR item.fulfilment<>p_expected OR p_expected<>'new' THEN RAISE EXCEPTION 'Item progress changed' USING ERRCODE='40001'; END IF;
   UPDATE public.seller_order_items SET fulfilment='at_shop' WHERE id=p_item;
   INSERT INTO public.seller_order_events(item_id,actor_id,action,note) VALUES(p_item,p_actor,'at_shop','Administrator received vendor item');
 ELSIF p_next IN ('ready','shipped') THEN
   IF (p_next='ready')<>(ord.delivery->>'method'='pickup') THEN RAISE EXCEPTION 'Delivery method does not match progress' USING ERRCODE='42501'; END IF;
   IF EXISTS(SELECT 1 FROM public.seller_order_items WHERE order_id=p_order AND seller_kind='vendor' AND fulfilment<>'at_shop') THEN RAISE EXCEPTION 'Wait for all vendor drop offs' USING ERRCODE='42501'; END IF;
   IF EXISTS(SELECT 1 FROM public.seller_order_items WHERE order_id=p_order AND fulfilment NOT IN ('new','at_shop')) THEN RAISE EXCEPTION 'Order progress changed' USING ERRCODE='40001'; END IF;
   UPDATE public.seller_order_items SET fulfilment=p_next,shipped_at=CASE WHEN p_next='shipped' THEN clock_timestamp() ELSE shipped_at END WHERE order_id=p_order;
   INSERT INTO public.seller_order_events(item_id,actor_id,action,note) SELECT id,p_actor,p_next,'Administrator shop dispatch' FROM public.seller_order_items WHERE order_id=p_order;
 ELSE RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_shop_shipping_progress(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_shop_shipping_progress(uuid,uuid,uuid,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
