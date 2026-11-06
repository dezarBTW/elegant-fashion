BEGIN;
ALTER TABLE public.shop_orders ADD COLUMN delivery_confirmed_at timestamptz,
 ADD COLUMN delivery_confirmed_by uuid REFERENCES auth.users(id), ADD COLUMN delivery_verification_note text;

-- Preserve historical confirmations; changing workflows must not reopen return windows.
UPDATE public.shop_orders o SET delivery_confirmed_at=coalesce(o.customer_received_at,
 (SELECT max(i.confirmed_at) FROM public.seller_order_items i WHERE i.order_id=o.id
  HAVING count(*)>0 AND bool_and(i.confirmed_at IS NOT NULL)))
WHERE o.fulfillment_status='completed' OR o.customer_received_at IS NOT NULL;

CREATE FUNCTION public.admin_confirm_order_delivery(p_actor uuid,p_order uuid,p_expected_status text,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE ord public.shop_orders; confirmed timestamptz;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_actor AND is_admin AND is_active) THEN
   RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_note,''))) NOT BETWEEN 10 AND 2000 THEN
   RAISE EXCEPTION 'Record how delivery was verified' USING ERRCODE='22023'; END IF;
 SELECT * INTO ord FROM public.shop_orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='P0002'; END IF;
 IF ord.payment_status<>'paid' THEN RAISE EXCEPTION 'Payment must be verified first' USING ERRCODE='42501'; END IF;
 IF ord.delivery_confirmed_at IS NOT NULL THEN
   RETURN jsonb_build_object('order',to_jsonb(ord),'changed',false); END IF;
 IF ord.fulfillment_status IS DISTINCT FROM p_expected_status THEN
   RAISE EXCEPTION 'Order changed; refresh before confirming delivery' USING ERRCODE='40001'; END IF;
 PERFORM 1 FROM public.seller_order_items WHERE order_id=p_order ORDER BY id FOR UPDATE;
 confirmed:=clock_timestamp();
 UPDATE public.seller_order_items SET confirmed_at=coalesce(confirmed_at,confirmed),
   confirmed_by=coalesce(confirmed_by,p_actor),confirmation_method=coalesce(confirmation_method,'admin'),
   verification_note=coalesce(verification_note,p_note),fulfilment='completed' WHERE order_id=p_order;
 UPDATE public.shop_orders SET fulfillment_status='completed',delivery_confirmed_at=confirmed,
   delivery_confirmed_by=p_actor,delivery_verification_note=p_note WHERE id=p_order RETURNING * INTO ord;
 RETURN jsonb_build_object('order',to_jsonb(ord),'changed',true);
END $$;
REVOKE ALL ON FUNCTION public.admin_confirm_order_delivery(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_order_delivery(uuid,uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_refund_deadline() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE confirmed timestamptz;
BEGIN
 PERFORM 1 FROM public.seller_order_items WHERE order_id=NEW.order_id AND product_id=NEW.product_id ORDER BY id FOR UPDATE;
 SELECT min(confirmed_at) INTO confirmed FROM public.seller_order_items WHERE order_id=NEW.order_id AND product_id=NEW.product_id;
 IF confirmed IS NULL AND NOT EXISTS(SELECT 1 FROM public.seller_order_items WHERE order_id=NEW.order_id AND product_id=NEW.product_id) THEN
   SELECT coalesce(delivery_confirmed_at,customer_received_at) INTO confirmed FROM public.shop_orders WHERE id=NEW.order_id;
 END IF;
 IF confirmed IS NULL OR clock_timestamp()>=confirmed+interval '3 days' THEN
   RAISE EXCEPTION 'Return/refund requests must be made within three days of confirmed delivery' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;

-- Retain historical seller snapshots and payment records, but retire every old action.
CREATE OR REPLACE FUNCTION public.seller_item_action(p_actor uuid,p_item uuid,p_action text,p_note text DEFAULT '')
RETURNS public.seller_order_items LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 RAISE EXCEPTION 'Seller fulfilment and vendor payments are managed offline' USING ERRCODE='42501';
END $$;
REVOKE ALL ON FUNCTION public.seller_item_action(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE UPDATE(fulfillment_status) ON public.shop_orders FROM authenticated,anon;
COMMENT ON COLUMN public.shop_orders.delivery_confirmed_at IS 'Administrator-verified offline delivery; starts the return window. Historical confirmations are preserved.';
NOTIFY pgrst,'reload schema';
COMMIT;
