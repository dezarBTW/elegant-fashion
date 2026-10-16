BEGIN;

CREATE TABLE public.shop_orders (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery JSONB NOT NULL CHECK (delivery->>'method' IN ('pickup', 'yenagoa', 'outside_yenagoa')),
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 20),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  subtotal_minor BIGINT NOT NULL CHECK (subtotal_minor > 0),
  shipping_minor BIGINT NOT NULL CHECK (shipping_minor IN (0, 200000)),
  total_minor BIGINT NOT NULL CHECK (total_minor = subtotal_minor + shipping_minor),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'review')),
  fulfillment_status TEXT NOT NULL DEFAULT 'new' CHECK (fulfillment_status IN ('new', 'ready', 'completed')),
  checkout_state TEXT NOT NULL DEFAULT 'creating' CHECK (checkout_state IN ('creating', 'open', 'unknown')),
  checkout_id TEXT UNIQUE,
  checkout_url TEXT,
  paid_at TIMESTAMPTZ,
  paid_event_id TEXT UNIQUE,
  payment_id TEXT UNIQUE,
  receipt_hash TEXT NOT NULL CHECK (receipt_hash ~ '^[a-f0-9]{64}$'),
  request_fingerprint TEXT NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  CHECK (payment_status <> 'paid' OR (paid_at IS NOT NULL AND payment_id IS NOT NULL AND paid_event_id IS NOT NULL)),
  CHECK ((delivery->>'method' = 'outside_yenagoa' AND shipping_minor = 200000) OR (delivery->>'method' IN ('pickup','yenagoa') AND shipping_minor = 0))
);

CREATE INDEX shop_orders_created_at_idx ON public.shop_orders (created_at DESC);
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shop_orders TO service_role;
GRANT SELECT ON public.shop_orders TO authenticated;
GRANT UPDATE (fulfillment_status) ON public.shop_orders TO authenticated;

CREATE POLICY "Admins can read shop orders" ON public.shop_orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND is_admin = true AND is_active = true));
CREATE POLICY "Admins can fulfil paid orders" ON public.shop_orders FOR UPDATE TO authenticated
USING (payment_status = 'paid' AND EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND is_admin = true AND is_active = true))
WITH CHECK (payment_status = 'paid' AND EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND is_admin = true AND is_active = true));

CREATE TABLE public.checkout_rate_limits (
  ip_hash TEXT PRIMARY KEY CHECK (ip_hash ~ '^[a-f0-9]{64}$'),
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0)
);
ALTER TABLE public.checkout_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.checkout_rate_limits TO service_role;

CREATE FUNCTION public.consume_checkout_rate_limit(p_ip_hash TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_now TIMESTAMPTZ := clock_timestamp(); v_count INTEGER;
BEGIN
  IF p_ip_hash IS NULL OR p_ip_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid rate limit key'; END IF;
  INSERT INTO public.checkout_rate_limits AS limits (ip_hash, window_started_at, request_count)
  VALUES (p_ip_hash, v_now, 1)
  ON CONFLICT (ip_hash) DO UPDATE SET
    window_started_at = CASE WHEN limits.window_started_at <= v_now - INTERVAL '1 hour' THEN v_now ELSE limits.window_started_at END,
    request_count = CASE WHEN limits.window_started_at <= v_now - INTERVAL '1 hour' THEN 1 ELSE limits.request_count + 1 END
  RETURNING request_count INTO v_count;
  RETURN v_count <= 12;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_checkout_rate_limit(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_checkout_rate_limit(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
