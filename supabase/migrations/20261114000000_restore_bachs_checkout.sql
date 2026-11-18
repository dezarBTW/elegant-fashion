BEGIN;

-- The transfer checkout has been retired; prior migrations remain as history.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'elegant-transfer-receipt-retention') THEN
    PERFORM cron.unschedule('elegant-transfer-receipt-retention');
  END IF;
END $$;

DROP TRIGGER IF EXISTS queue_expired_transfer_receipt ON public.shop_orders;
DROP TRIGGER IF EXISTS z_extend_transfer_reservation ON public.shop_orders;
DROP FUNCTION IF EXISTS public.expire_transfer_receipts(integer);
DROP FUNCTION IF EXISTS public.queue_expired_transfer_receipt();
DROP FUNCTION IF EXISTS public.extend_transfer_reservation();
DROP FUNCTION IF EXISTS public.approve_transfer_order(uuid, uuid);
DROP FUNCTION IF EXISTS public.flag_transfer_order(uuid, uuid);
DROP INDEX IF EXISTS public.shop_orders_transfer_receipt_retention_idx;

ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_payment_method_check;
ALTER TABLE public.shop_orders
  DROP COLUMN IF EXISTS transfer_receipt_path,
  DROP COLUMN IF EXISTS transfer_submitted_at,
  DROP COLUMN IF EXISTS transfer_approved_by,
  DROP COLUMN IF EXISTS payment_method;

COMMIT;
