BEGIN;
CREATE OR REPLACE FUNCTION public.seller_item_action(p_actor uuid,p_item uuid,p_action text,p_note text DEFAULT '')
RETURNS public.seller_order_items LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item public.seller_order_items; ord public.shop_orders; admin_actor boolean; multi_vendor boolean; next_state text;
BEGIN
 SELECT is_admin INTO admin_actor FROM public.users WHERE id=p_actor AND is_active;
 IF admin_actor IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO item FROM public.seller_order_items WHERE id=p_item FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Item unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO ord FROM public.shop_orders WHERE id=item.order_id FOR UPDATE;
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
   IF NOT admin_actor AND NOT EXISTS(SELECT 1 FROM public.vendor_accounts WHERE user_id=p_actor AND status='active') THEN RAISE EXCEPTION 'Vendor access required' USING ERRCODE='42501'; END IF;
   IF admin_actor AND item.seller_kind='vendor' AND NOT multi_vendor AND ord.delivery->>'method'<>'pickup' THEN RAISE EXCEPTION 'Vendor controls fulfilment' USING ERRCODE='42501'; END IF;
   IF NOT admin_actor AND item.seller_id<>p_actor THEN RAISE EXCEPTION 'Item access denied' USING ERRCODE='42501'; END IF;
   next_state:=p_action;
   IF NOT ((item.fulfilment='new' AND next_state='processing') OR (item.fulfilment='processing' AND next_state='sent_to_shop' AND item.seller_kind='vendor' AND (multi_vendor OR ord.delivery->>'method'='pickup')) OR (item.fulfilment='sent_to_shop' AND next_state='at_shop' AND admin_actor) OR (item.fulfilment IN ('processing','at_shop') AND next_state IN ('shipped','ready'))) THEN RAISE EXCEPTION 'Invalid fulfilment transition' USING ERRCODE='42501'; END IF;
   IF next_state IN ('shipped','ready') THEN
     IF admin_actor AND item.seller_kind='vendor' AND item.fulfilment<>'at_shop' THEN RAISE EXCEPTION 'Confirm shop handoff first' USING ERRCODE='42501'; END IF;
     IF NOT admin_actor AND (multi_vendor OR ord.delivery->>'method'='pickup') THEN RAISE EXCEPTION 'Send this item to the shop' USING ERRCODE='42501'; END IF;
     IF (next_state='ready')<>(ord.delivery->>'method'='pickup') THEN RAISE EXCEPTION 'Invalid delivery method' USING ERRCODE='42501'; END IF;
   END IF;
   UPDATE public.seller_order_items SET fulfilment=next_state,shipped_at=CASE WHEN next_state='shipped' THEN now() ELSE shipped_at END WHERE id=p_item;
 END IF;
 INSERT INTO public.seller_order_events(item_id,actor_id,action,note) VALUES(p_item,p_actor,p_action,left(p_note,2000));
 SELECT * INTO item FROM public.seller_order_items WHERE id=p_item;
 RETURN item;
END $$;

CREATE FUNCTION public.queue_seller_item_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.fulfilment IS DISTINCT FROM OLD.fulfilment AND NEW.fulfilment IN ('shipped','ready') THEN
  INSERT INTO public.vendor_notifications(kind,entity_id)VALUES(NEW.fulfilment,NEW.id);
 END IF;
 IF NEW.payment_marked_at IS NOT NULL AND OLD.payment_marked_at IS NULL THEN INSERT INTO public.vendor_notifications(kind,entity_id)VALUES('payment_fulfilled',NEW.id); END IF;
 IF NEW.payment_received_at IS NOT NULL AND OLD.payment_received_at IS NULL THEN INSERT INTO public.vendor_notifications(kind,entity_id)VALUES('payment_received',NEW.id); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_seller_item_notification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER queue_seller_item_notification AFTER UPDATE ON public.seller_order_items FOR EACH ROW EXECUTE FUNCTION public.queue_seller_item_notification();
CREATE OR REPLACE FUNCTION public.snapshot_order_sellers() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- During rollout, the legacy administrator endpoint can still create products.
 INSERT INTO public.product_owners(product_id,user_id,seller_kind)
 SELECT (e->>'productId')::uuid,a.id,'admin' FROM jsonb_array_elements(NEW.items) e
 CROSS JOIN LATERAL(SELECT id FROM public.users WHERE is_admin AND is_active ORDER BY id LIMIT 1)a
 ON CONFLICT(product_id) DO NOTHING;
 INSERT INTO public.seller_order_items(order_id,product_id,seller_id,seller_kind,product_name,size,quantity,line_amount_minor)
 SELECT NEW.id,(e->>'productId')::uuid,o.user_id,o.seller_kind,e->>'name',coalesce(e->>'size',''),(e->>'quantity')::integer,(e->>'lineAmountMinor')::bigint
 FROM jsonb_array_elements(NEW.items) e JOIN public.product_owners o ON o.product_id=(e->>'productId')::uuid;
 IF (SELECT count(*) FROM public.seller_order_items WHERE order_id=NEW.id)<>jsonb_array_length(NEW.items) THEN RAISE EXCEPTION 'Missing product owner' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
