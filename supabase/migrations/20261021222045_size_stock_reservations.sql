BEGIN;

CREATE FUNCTION public.valid_size_quantities(p_value jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_typeof(p_value)='object' AND p_value ?& ARRAY['S','M','L','XL','XXL']
 AND NOT EXISTS (SELECT 1 FROM jsonb_each(p_value) e WHERE e.key NOT IN ('S','M','L','XL','XXL')
   OR jsonb_typeof(e.value)<>'number' OR e.value::text !~ '^(0|[1-9][0-9]{0,5})$');
$$;
CREATE TABLE public.product_size_stock (
 product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
 quantities jsonb NOT NULL DEFAULT '{"S":0,"M":0,"L":0,"XL":0,"XXL":0}' CHECK(public.valid_size_quantities(quantities)),
 revision bigint NOT NULL DEFAULT 0
);
CREATE TABLE public.shop_stock_reservations (
 order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
 product_id uuid NOT NULL, size text NOT NULL CHECK(size IN ('S','M','L','XL','XXL')),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 status text NOT NULL DEFAULT 'held' CHECK(status IN ('held','sold')),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(order_id,product_id,size)
);
CREATE INDEX shop_stock_reservations_held_idx ON public.shop_stock_reservations(product_id,size) WHERE status='held';
ALTER TABLE public.product_size_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_stock_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_size_stock,public.shop_stock_reservations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.product_size_stock,public.shop_stock_reservations TO authenticated;
GRANT ALL ON public.product_size_stock,public.shop_stock_reservations TO service_role;
CREATE POLICY stock_admin_read ON public.product_size_stock FOR SELECT TO authenticated USING(public.is_admin_user());
CREATE POLICY reservations_admin_read ON public.shop_stock_reservations FOR SELECT TO authenticated USING(public.is_admin_user());

-- Historical orders do not invent stock deductions. Every new checkout is tracked.
ALTER TABLE public.shop_orders ADD COLUMN stock_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.shop_orders ALTER COLUMN stock_required SET DEFAULT true;

CREATE FUNCTION public.get_size_purchase_limits(p_product_ids uuid[])
RETURNS TABLE(product_id uuid,purchase_limits jsonb) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.id, jsonb_object_agg(s.size,CASE WHEN s.size=ANY(p.available_sizes) THEN
   least(10,greatest(0,coalesce((st.quantities->>s.size)::int,0)-coalesce(r.held,0))) ELSE 0 END)
 FROM public.products p CROSS JOIN unnest(ARRAY['S','M','L','XL','XXL']) s(size)
 LEFT JOIN public.product_size_stock st ON st.product_id=p.id
 LEFT JOIN LATERAL (SELECT sum(h.quantity)::int held FROM public.shop_stock_reservations h
   WHERE h.product_id=p.id AND h.size=s.size AND h.status='held') r ON true
 WHERE p.id=ANY(p_product_ids[1:50]) AND p.is_active GROUP BY p.id;
$$;

CREATE FUNCTION public.admin_save_stock_product(p_id uuid,p_product jsonb,p_quantities jsonb,p_revision bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE existing public.product_size_stock; held record; chosen_sizes text[];
BEGIN
 IF public.valid_size_quantities(p_quantities) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Invalid size quantities' USING ERRCODE='22023'; END IF;
 SELECT * INTO existing FROM public.product_size_stock WHERE product_id=p_id FOR UPDATE;
 IF FOUND AND existing.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'stock_changed' USING ERRCODE='40001'; END IF;
 IF NOT FOUND AND p_revision IS NOT NULL THEN RAISE EXCEPTION 'stock_changed' USING ERRCODE='40001'; END IF;
 FOR held IN SELECT size,sum(quantity)::int quantity FROM public.shop_stock_reservations WHERE product_id=p_id AND status='held' GROUP BY size LOOP
   IF (p_quantities->>held.size)::int < held.quantity THEN RAISE EXCEPTION 'stock_reserved' USING ERRCODE='P0001'; END IF;
 END LOOP;
 SELECT coalesce(array_agg(s ORDER BY ord),'{}') INTO chosen_sizes
 FROM unnest(ARRAY['S','M','L','XL','XXL']) WITH ORDINALITY x(s,ord) WHERE (p_quantities->>s)::int>0;
 IF EXISTS(SELECT 1 FROM public.products WHERE id=p_id) THEN
   UPDATE public.products SET name=p_product->>'name',price=(p_product->>'price')::numeric,
     category=p_product->>'category',gender=p_product->>'gender',description=p_product->>'description',
     image=p_product->>'image',available_sizes=chosen_sizes WHERE id=p_id;
 ELSE
   INSERT INTO public.products(id,name,price,category,gender,description,image,available_sizes)
   VALUES(p_id,p_product->>'name',(p_product->>'price')::numeric,p_product->>'category',p_product->>'gender',p_product->>'description',p_product->>'image',chosen_sizes);
 END IF;
 INSERT INTO public.product_size_stock(product_id,quantities,revision) VALUES(p_id,p_quantities,1)
 ON CONFLICT(product_id) DO UPDATE SET quantities=excluded.quantities,revision=public.product_size_stock.revision+1;
 RETURN p_id;
END;
$$;

CREATE FUNCTION public.reserve_order_size_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE line record; stock public.product_size_stock; held integer;
BEGIN
 IF NOT NEW.stock_required THEN RETURN NEW; END IF;
 -- Lock in a stable order to avoid deadlocks in multi-product checkouts.
 PERFORM 1 FROM public.product_size_stock st WHERE st.product_id IN
   (SELECT (e->>'productId')::uuid FROM jsonb_array_elements(NEW.items) e) ORDER BY st.product_id FOR UPDATE;
 FOR line IN SELECT (e->>'productId')::uuid product_id,e->>'size' size,sum((e->>'quantity')::int)::int quantity
   FROM jsonb_array_elements(NEW.items) e GROUP BY 1,2 LOOP
   SELECT * INTO stock FROM public.product_size_stock WHERE product_id=line.product_id;
   IF NOT FOUND OR line.size IS NULL OR line.size NOT IN ('S','M','L','XL','XXL') OR line.quantity NOT BETWEEN 1 AND 10
     OR NOT EXISTS(SELECT 1 FROM public.products WHERE id=line.product_id AND is_active AND line.size=ANY(available_sizes))
     THEN RAISE EXCEPTION 'stock_unavailable' USING ERRCODE='P0001'; END IF;
   SELECT coalesce(sum(quantity),0)::int INTO held FROM public.shop_stock_reservations WHERE product_id=line.product_id AND size=line.size AND status='held';
   IF (stock.quantities->>line.size)::int-held < line.quantity THEN RAISE EXCEPTION 'stock_unavailable' USING ERRCODE='P0001'; END IF;
   INSERT INTO public.shop_stock_reservations(order_id,product_id,size,quantity) VALUES(NEW.id,line.product_id,line.size,line.quantity);
 END LOOP;
 UPDATE public.product_size_stock SET revision=revision+1 WHERE product_id IN
   (SELECT product_id FROM public.shop_stock_reservations WHERE order_id=NEW.id);
 RETURN NEW;
END;
$$;
CREATE TRIGGER reserve_checkout_size_stock AFTER INSERT ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.reserve_order_size_stock();

CREATE FUNCTION public.commit_order_size_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE line record;
BEGIN
 IF NOT OLD.stock_required OR NEW.payment_status<>'paid' OR OLD.payment_status='paid' THEN RETURN NEW; END IF;
 IF NEW.items IS DISTINCT FROM OLD.items THEN RAISE EXCEPTION 'Order items cannot change after reservation'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.shop_stock_reservations WHERE order_id=OLD.id AND status='held') THEN RAISE EXCEPTION 'stock_reservation_missing'; END IF;
 PERFORM 1 FROM public.product_size_stock st WHERE st.product_id IN
   (SELECT product_id FROM public.shop_stock_reservations WHERE order_id=OLD.id AND status='held') ORDER BY st.product_id FOR UPDATE;
 FOR line IN SELECT * FROM public.shop_stock_reservations WHERE order_id=OLD.id AND status='held' LOOP
   UPDATE public.product_size_stock SET quantities=jsonb_set(quantities,ARRAY[line.size],to_jsonb((quantities->>line.size)::int-line.quantity)),revision=revision+1
   WHERE product_id=line.product_id AND (quantities->>line.size)::int>=line.quantity;
   IF NOT FOUND THEN RAISE EXCEPTION 'stock_reservation_missing'; END IF;
 END LOOP;
 UPDATE public.shop_stock_reservations SET status='sold' WHERE order_id=OLD.id AND status='held';
 RETURN NEW;
END;
$$;
CREATE TRIGGER commit_paid_size_stock BEFORE UPDATE OF payment_status ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.commit_order_size_stock();

CREATE FUNCTION public.protect_reserved_product() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.product_size_stock WHERE product_id=OLD.id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.shop_stock_reservations WHERE product_id=OLD.id AND status='held') THEN
   RAISE EXCEPTION 'Product has a pending payment reservation' USING ERRCODE='23514';
 END IF;
 RETURN OLD;
END;
$$;
CREATE TRIGGER protect_pending_product BEFORE DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.protect_reserved_product();

REVOKE ALL ON FUNCTION public.valid_size_quantities(jsonb),public.admin_save_stock_product(uuid,jsonb,jsonb,bigint),public.reserve_order_size_stock(),public.commit_order_size_stock(),public.protect_reserved_product() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.valid_size_quantities(jsonb),public.admin_save_stock_product(uuid,jsonb,jsonb,bigint) TO service_role;
REVOKE ALL ON FUNCTION public.get_size_purchase_limits(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_size_purchase_limits(uuid[]) TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
