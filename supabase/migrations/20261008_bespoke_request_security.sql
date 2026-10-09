-- Keep bespoke image uploads private and enforce server-only request writes.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'bespoke-requests',
  'bespoke-requests',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can submit bespoke requests"
  ON public.bespoke_requests;
REVOKE INSERT ON public.bespoke_requests FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.bespoke_request_rate_limits (
  ip_hash TEXT PRIMARY KEY CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0)
);

ALTER TABLE public.bespoke_request_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bespoke_request_rate_limits FROM anon, authenticated;
GRANT ALL ON public.bespoke_request_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_bespoke_request_rate_limit(
  p_ip_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_request_count INTEGER;
BEGIN
  IF p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid IP hash';
  END IF;

  INSERT INTO public.bespoke_request_rate_limits AS rate_limit (
    ip_hash,
    window_started_at,
    request_count
  )
  VALUES (p_ip_hash, v_now, 1)
  ON CONFLICT (ip_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN rate_limit.window_started_at <= v_now - INTERVAL '1 hour'
        THEN v_now
      ELSE rate_limit.window_started_at
    END,
    request_count = CASE
      WHEN rate_limit.window_started_at <= v_now - INTERVAL '1 hour'
        THEN 1
      ELSE rate_limit.request_count + 1
    END
  RETURNING request_count INTO v_request_count;

  RETURN v_request_count <= 5;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_bespoke_request_rate_limit(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_bespoke_request_rate_limit(TEXT)
  TO service_role;
