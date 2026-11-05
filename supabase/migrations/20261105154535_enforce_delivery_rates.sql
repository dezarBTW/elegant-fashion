CREATE OR REPLACE FUNCTION public.validate_shop_order_delivery_rate()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.shipping_minor <> (CASE NEW.delivery->>'method'
    WHEN 'pickup' THEN 0
    WHEN 'yenagoa' THEN 100000 * public.order_distinct_product_count(NEW.items)
    WHEN 'outside_yenagoa' THEN 200000 * public.order_distinct_product_count(NEW.items)
    ELSE -1 END) THEN
    RAISE EXCEPTION 'Invalid delivery fee' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
