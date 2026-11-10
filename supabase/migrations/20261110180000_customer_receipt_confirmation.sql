BEGIN;
REVOKE EXECUTE ON FUNCTION public.admin_confirm_order_delivery(uuid,uuid,text,text) FROM service_role;
CREATE FUNCTION public.customer_confirm_shipped_item(p_actor uuid,p_item uuid)
RETURNS public.seller_order_items LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item public.seller_order_items; ord public.shop_orders; target_order uuid;
BEGIN
 SELECT order_id INTO target_order FROM public.seller_order_items WHERE id=p_item;
 IF NOT FOUND THEN RAISE EXCEPTION 'Item not found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO ord FROM public.shop_orders WHERE id=target_order FOR UPDATE;
 IF ord.user_id IS DISTINCT FROM p_actor OR ord.payment_status<>'paid' THEN RAISE EXCEPTION 'Order access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO item FROM public.seller_order_items WHERE id=p_item FOR UPDATE;
 IF item.confirmed_at IS NOT NULL THEN RETURN item; END IF;
 IF item.fulfilment NOT IN ('shipped','ready') THEN RAISE EXCEPTION 'Item is not shipped or ready for pickup' USING ERRCODE='42501'; END IF;
 UPDATE public.seller_order_items SET confirmed_at=clock_timestamp(),confirmed_by=p_actor,confirmation_method='customer',fulfilment='completed' WHERE id=p_item RETURNING * INTO item;
 INSERT INTO public.seller_order_events(item_id,actor_id,action,note) VALUES(p_item,p_actor,'customer_received','Customer confirmed receipt');
 IF NOT EXISTS(SELECT 1 FROM public.seller_order_items WHERE order_id=ord.id AND confirmed_at IS NULL) THEN
   UPDATE public.shop_orders SET delivery_confirmed_at=coalesce(delivery_confirmed_at,item.confirmed_at),delivery_verification_note='Customer confirmed receipt of all items' WHERE id=ord.id;
 END IF;
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.customer_confirm_shipped_item(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_confirm_shipped_item(uuid,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
