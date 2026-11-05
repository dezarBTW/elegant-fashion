BEGIN;
-- Preserve the total constraint; replace the historical fixed-delivery rules.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.shop_orders'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%shipping_minor%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%total_minor%'
  LOOP
    EXECUTE format('ALTER TABLE public.shop_orders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

CREATE FUNCTION public.order_distinct_product_count(items jsonb)
RETURNS bigint LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT count(DISTINCT item->>'productId') FROM pg_catalog.jsonb_array_elements(items) item;
$$;

-- Existing orders can still receive payment and fulfilment updates at their old rates.
CREATE FUNCTION public.validate_shop_order_delivery_rate()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.shipping_minor <> (CASE NEW.delivery->>'method'
    WHEN 'pickup' THEN 0
    WHEN 'yenagoa' THEN 100000 * public.order_distinct_product_count(NEW.items)
    WHEN 'outside_yenagoa' THEN 200000 * public.order_distinct_product_count(NEW.items)
    ELSE -1 END) AND NOT (
      (NEW.delivery->>'method' IN ('pickup', 'yenagoa') AND NEW.shipping_minor = 0)
      OR (NEW.delivery->>'method' = 'outside_yenagoa' AND NEW.shipping_minor = 200000)
    ) THEN
    RAISE EXCEPTION 'Invalid delivery fee' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER shop_order_delivery_rate BEFORE INSERT OR UPDATE OF delivery, items, shipping_minor
  ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.validate_shop_order_delivery_rate();
COMMIT;
