BEGIN;
CREATE FUNCTION public.aggregate_seller_order_progress() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE progress text;
BEGIN
 SELECT CASE WHEN bool_and(confirmed_at IS NOT NULL) THEN 'completed'
   WHEN bool_or(fulfilment='shipped') THEN 'shipped'
   WHEN bool_and(fulfilment IN ('ready','completed')) THEN 'ready'
   WHEN bool_or(fulfilment<>'new') THEN 'processing' ELSE 'new' END INTO progress
 FROM public.seller_order_items WHERE order_id=NEW.order_id;
 UPDATE public.shop_orders SET fulfillment_status=progress WHERE id=NEW.order_id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.aggregate_seller_order_progress() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER aggregate_seller_order_progress AFTER UPDATE OF fulfilment,confirmed_at ON public.seller_order_items
 FOR EACH ROW EXECUTE FUNCTION public.aggregate_seller_order_progress();
NOTIFY pgrst,'reload schema';
COMMIT;
