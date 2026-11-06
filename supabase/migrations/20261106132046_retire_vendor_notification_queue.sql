BEGIN;
-- Apply after the direct email handlers are deployed.
LOCK TABLE public.shop_orders,public.seller_order_items,public.vendor_notifications IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.vendor_notifications WHERE sent_at IS NULL) THEN
  RAISE EXCEPTION 'Unsent notifications remain; deliver them before retiring this queue';
 END IF;
END $$;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='elegant-vendor-notifications';
DROP TRIGGER IF EXISTS vendor_paid_queue ON public.shop_orders;
DROP TRIGGER IF EXISTS queue_seller_item_notification ON public.seller_order_items;
DROP TRIGGER IF EXISTS vendor_invitation_queue ON public.vendor_accounts;
DROP FUNCTION IF EXISTS public.queue_seller_item_notification();
DROP FUNCTION IF EXISTS public.queue_vendor_notification();
DROP TABLE public.vendor_notifications;
DELETE FROM vault.secrets WHERE name='elegant_vendor_worker_secret';
NOTIFY pgrst,'reload schema';
COMMIT;
