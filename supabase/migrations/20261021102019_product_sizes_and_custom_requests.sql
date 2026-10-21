BEGIN;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available_sizes text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD CONSTRAINT products_available_sizes_check CHECK (
  available_sizes <@ ARRAY['S','M','L','XL','XXL']::text[]
  AND cardinality(available_sizes) <= 5 AND array_position(available_sizes, NULL) IS NULL
);
COMMENT ON COLUMN public.products.available_sizes IS 'Sizes explicitly selected by the admin. Empty means no size is currently offered.';

CREATE TABLE public.product_requests (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  customer_name text NOT NULL CHECK (length(customer_name) BETWEEN 2 AND 100),
  customer_email text NOT NULL CHECK (length(customer_email) <= 254),
  customer_phone text NOT NULL CHECK (length(customer_phone) BETWEEN 7 AND 30),
  requested_size text NOT NULL DEFAULT '' CHECK (length(requested_size) <= 100),
  requested_colour text NOT NULL DEFAULT '' CHECK (length(requested_colour) <= 100),
  details text NOT NULL DEFAULT '' CHECK (length(details) <= 1500),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  email_sent_at timestamptz,
  CHECK (length(btrim(requested_size)) > 0 OR length(btrim(requested_colour)) > 0)
);
CREATE INDEX product_requests_created_idx ON public.product_requests (created_at DESC);
CREATE INDEX product_requests_product_idx ON public.product_requests (product_id);
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.product_requests TO service_role;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS registration_email_sent_at timestamptz;

COMMIT;
