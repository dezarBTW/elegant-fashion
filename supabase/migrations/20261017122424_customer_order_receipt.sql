BEGIN;

ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS receipt_confirmation_hash TEXT,
  ADD COLUMN IF NOT EXISTS customer_received_at TIMESTAMPTZ;
ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_receipt_confirmation_hash_check;
ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_receipt_confirmation_hash_check
  CHECK (receipt_confirmation_hash IS NULL OR receipt_confirmation_hash ~ '^[a-f0-9]{64}$');
ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_customer_received_check;
ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_customer_received_check
  CHECK (customer_received_at IS NULL OR (payment_status = 'paid' AND receipt_confirmation_hash IS NOT NULL));

COMMENT ON COLUMN public.shop_orders.receipt_confirmation_hash IS 'SHA-256 hash of the personal receipt-confirmation token. The raw token is only included in the customer payment email.';
COMMENT ON COLUMN public.shop_orders.customer_received_at IS 'When the customer explicitly confirmed receipt of every product in this order; separate from staff fulfilment status.';

-- Existing server-only writes and restricted customer SELECT grants remain in force.
REVOKE UPDATE (receipt_confirmation_hash, customer_received_at) ON public.shop_orders FROM PUBLIC, anon, authenticated;
REVOKE SELECT (receipt_confirmation_hash, customer_received_at) ON public.shop_orders FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
