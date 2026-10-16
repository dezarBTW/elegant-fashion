BEGIN;

ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS emails_claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shop_orders.emails_claimed_at IS
  'Atomic claim made when payment first becomes paid. Records an email attempt, not confirmed delivery. Never clear to replay a webhook.';

ALTER TABLE public.shop_orders
  DROP CONSTRAINT IF EXISTS shop_orders_fulfillment_status_check;
ALTER TABLE public.shop_orders
  ADD CONSTRAINT shop_orders_fulfillment_status_check
  CHECK (fulfillment_status IN ('new', 'processing', 'ready', 'shipped', 'completed'));

-- Orders are accessed through authenticated server routes using the service key.
-- Explicitly revoke the previous column-level UPDATE grant as well as table grants.
REVOKE ALL ON TABLE public.shop_orders FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (fulfillment_status) ON public.shop_orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read shop orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Admins can fulfil paid orders" ON public.shop_orders;

NOTIFY pgrst, 'reload schema';
COMMIT;
