BEGIN;

CREATE INDEX shop_orders_transfer_receipt_retention_idx
 ON public.shop_orders(delivery_confirmed_at,id)
 WHERE payment_method='bank_transfer' AND transfer_receipt_path IS NOT NULL;

CREATE FUNCTION public.queue_expired_transfer_receipt() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF OLD.transfer_receipt_path IS NOT NULL AND NEW.transfer_receipt_path IS NULL THEN
   PERFORM public.enqueue_storage_cleanup('transfer-receipts',OLD.transfer_receipt_path);
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.queue_expired_transfer_receipt() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER queue_expired_transfer_receipt
 AFTER UPDATE OF transfer_receipt_path ON public.shop_orders
 FOR EACH ROW EXECUTE FUNCTION public.queue_expired_transfer_receipt();

CREATE FUNCTION public.expire_transfer_receipts(p_limit integer DEFAULT 200) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE target uuid; expired integer:=0;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid batch size' USING ERRCODE='22023'; END IF;
 FOR target IN
   SELECT o.id FROM public.shop_orders o
   WHERE o.payment_method='bank_transfer'
     AND o.transfer_receipt_path IS NOT NULL
     AND o.delivery_confirmed_at IS NOT NULL
     AND o.delivery_confirmed_at <= clock_timestamp()-interval '30 days'
     AND EXISTS(SELECT 1 FROM public.seller_order_items i WHERE i.order_id=o.id)
     AND NOT EXISTS(SELECT 1 FROM public.seller_order_items i WHERE i.order_id=o.id AND (i.confirmed_at IS NULL OR i.confirmation_method IS DISTINCT FROM 'customer'))
   ORDER BY o.delivery_confirmed_at,o.id LIMIT p_limit FOR UPDATE OF o SKIP LOCKED
 LOOP
   UPDATE public.shop_orders SET transfer_receipt_path=NULL WHERE id=target;
   expired:=expired+1;
 END LOOP;
 RETURN expired;
END $$;
REVOKE ALL ON FUNCTION public.expire_transfer_receipts(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_transfer_receipts(integer) TO service_role;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
   PERFORM cron.schedule('elegant-transfer-receipt-retention','0 2 * * *','SELECT public.expire_transfer_receipts();');
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
