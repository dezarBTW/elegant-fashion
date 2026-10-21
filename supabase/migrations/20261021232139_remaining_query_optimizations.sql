BEGIN;
CREATE INDEX students_page_idx ON public.students(created_at DESC,id DESC);
CREATE INDEX students_status_page_idx ON public.students((coalesce(nullif(status,''),CASE WHEN accepted THEN 'accepted' ELSE 'pending' END)),created_at DESC,id DESC);
CREATE INDEX bespoke_requests_page_idx ON public.bespoke_requests(created_at DESC,id DESC);
CREATE INDEX bespoke_requests_status_page_idx ON public.bespoke_requests(status,created_at DESC,id DESC);

CREATE FUNCTION public.get_admin_list_page(p_kind text,p_page integer DEFAULT 1,p_status text DEFAULT 'all',p_search text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (SELECT public.is_admin_user()) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('students','bespoke') OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000
 OR p_search IS NULL OR length(p_search)>200 OR p_status IS NULL
 OR (p_kind='students' AND p_status NOT IN ('all','pending','accepted','declined'))
 OR (p_kind='bespoke' AND p_status NOT IN ('all','new','contacted','quoted','confirmed','completed','cancelled'))
 THEN RAISE EXCEPTION 'Invalid list filters' USING ERRCODE='22023'; END IF;
 IF p_kind='students' THEN
 RETURN (
 WITH filtered AS NOT MATERIALIZED (
 SELECT s.* FROM public.students s WHERE (p_status='all' OR coalesce(nullif(s.status,''),CASE WHEN s.accepted THEN 'accepted' ELSE 'pending' END)=p_status)
 AND (btrim(p_search)='' OR strpos(lower(concat_ws(' ',s.surname,s.first_name,s.middle_name,s.name,s.email,s.telephone)),lower(btrim(p_search)))>0)
 ), totals AS (SELECT count(*) n FROM filtered), bounds AS (SELECT n,least(p_page::bigint,greatest(1,(n+24)/25)) page FROM totals),
 page_rows AS (SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET (SELECT (page-1)*25 FROM bounds)),
 statuses AS (SELECT coalesce(nullif(status,''),CASE WHEN accepted THEN 'accepted' ELSE 'pending' END) status FROM public.students)
 SELECT jsonb_build_object('total',b.n,'page',b.page,'pageSize',25,'rows',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC) FROM page_rows r),'[]'::jsonb),
 'counts',(SELECT jsonb_build_object('all',count(*),'pending',count(*) FILTER(WHERE status='pending'),'accepted',count(*) FILTER(WHERE status='accepted'),'declined',count(*) FILTER(WHERE status='declined')) FROM statuses)) FROM bounds b);
 ELSE
 RETURN (
 WITH filtered AS NOT MATERIALIZED (
 SELECT id,name,phone,description,status,image_paths,created_at FROM public.bespoke_requests
 WHERE (p_status='all' OR status=p_status) AND (btrim(p_search)='' OR strpos(lower(concat_ws(' ',name,phone,description)),lower(btrim(p_search)))>0)
 ), totals AS (SELECT count(*) n FROM filtered), bounds AS (SELECT n,least(p_page::bigint,greatest(1,(n+14)/15)) page FROM totals),
 page_rows AS (SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT 15 OFFSET (SELECT (page-1)*15 FROM bounds))
 SELECT jsonb_build_object('total',b.n,'page',b.page,'pageSize',15,'rows',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC) FROM page_rows r),'[]'::jsonb),
 'counts',(SELECT jsonb_build_object('all',count(*),'new',count(*) FILTER(WHERE status='new'),'contacted',count(*) FILTER(WHERE status='contacted'),'quoted',count(*) FILTER(WHERE status='quoted'),'confirmed',count(*) FILTER(WHERE status='confirmed'),'completed',count(*) FILTER(WHERE status='completed'),'cancelled',count(*) FILTER(WHERE status='cancelled')) FROM public.bespoke_requests)) FROM bounds b);
 END IF;
END; $$;

CREATE FUNCTION public.get_admin_overview() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (SELECT public.is_admin_user()) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT jsonb_build_object('products',(SELECT count(*) FROM public.products),
 'pendingStudents',s.pending,'acceptedStudents',s.accepted,'newBespoke',b.new,'totalBespoke',b.total)
 FROM (SELECT count(*) FILTER(WHERE coalesce(nullif(status,''),CASE WHEN accepted THEN 'accepted' ELSE 'pending' END)='pending') pending,
 count(*) FILTER(WHERE coalesce(nullif(status,''),CASE WHEN accepted THEN 'accepted' ELSE 'pending' END)='accepted') accepted FROM public.students) s
 CROSS JOIN (SELECT count(*) total,count(*) FILTER(WHERE status='new') new FROM public.bespoke_requests) b);
END; $$;
REVOKE ALL ON FUNCTION public.get_admin_list_page(text,integer,text,text),public.get_admin_overview() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_list_page(text,integer,text,text),public.get_admin_overview() TO authenticated;

CREATE INDEX products_similar_category_idx ON public.products(lower(btrim(category))) WHERE is_active;
CREATE FUNCTION public.get_similar_products(p_product_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH source AS MATERIALIZED (
 SELECT id,lower(btrim(category)) category,coalesce(sale_price,price) price,
 ARRAY(SELECT DISTINCT m[1] FROM regexp_matches(lower(concat_ws(' ',name,description)),'[a-z]{3,}','g') m) words
 FROM public.products WHERE id=p_product_id AND is_active
 ), ranked AS (
 SELECT c.id,c.slug,c.name,c.category,c.price,c.sale_price,c.image,
 3*(SELECT count(DISTINCT m[1]) FROM regexp_matches(lower(concat_ws(' ',c.name,c.description)),'[a-z]{3,}','g') m WHERE m[1]=ANY(s.words))
 +1-least(1,abs(coalesce(c.sale_price,c.price)-s.price)/greatest(s.price,1))
 +CASE WHEN c.is_featured THEN 0.25 ELSE 0 END score
 FROM public.products c CROSS JOIN source s WHERE c.is_active AND c.id<>s.id AND s.category IS NOT NULL AND s.category<>''
 AND lower(btrim(c.category))=s.category AND c.available_sizes && ARRAY['S','M','L','XL','XXL']::text[]
 ), top_six AS (SELECT * FROM ranked ORDER BY score DESC,id ASC LIMIT 6)
 SELECT coalesce(jsonb_agg(to_jsonb(r)-'score' ORDER BY score DESC,id ASC),'[]'::jsonb) FROM top_six r;
$$;
REVOKE ALL ON FUNCTION public.get_similar_products(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_similar_products(uuid) TO anon,authenticated,service_role;

CREATE TABLE public.account_order_claims(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 verified_email text NOT NULL,claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,verified_email)
);
ALTER TABLE public.account_order_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_order_claims FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.account_order_claims TO service_role;
CREATE FUNCTION public.link_legacy_account_orders(p_user_id uuid,p_email text) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE claimed boolean; linked integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users a JOIN public.users u ON u.id=a.id
 WHERE a.id=p_user_id AND a.email_confirmed_at IS NOT NULL AND coalesce(a.is_anonymous,false)=false
 AND lower(a.email)=lower(p_email) AND u.is_active) THEN
 RAISE EXCEPTION 'Verified active account required' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,1));
 INSERT INTO public.account_order_claims(user_id,verified_email) VALUES(p_user_id,lower(p_email))
 ON CONFLICT DO NOTHING RETURNING true INTO claimed;
 IF claimed IS DISTINCT FROM true THEN RETURN 0; END IF;
 UPDATE public.shop_orders SET user_id=p_user_id WHERE user_id IS NULL AND customer_email=lower(p_email);
 GET DIAGNOSTICS linked=ROW_COUNT;
 RETURN linked;
END; $$;
REVOKE ALL ON FUNCTION public.link_legacy_account_orders(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.link_legacy_account_orders(uuid,text) TO service_role;

CREATE INDEX product_complaints_order_idx ON public.product_complaints(order_id);
CREATE INDEX product_complaints_reviewer_idx ON public.product_complaints(reviewed_by);
CREATE INDEX refund_requests_order_idx ON public.refund_requests(order_id);
CREATE INDEX refund_requests_reviewer_idx ON public.refund_requests(reviewed_by);

-- Aggregate held reservations once for the requested products, rather than
-- running a correlated SUM separately for each of their five sizes.
CREATE OR REPLACE FUNCTION public.get_size_purchase_limits(p_product_ids uuid[])
RETURNS TABLE(product_id uuid,purchase_limits jsonb) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH requested AS MATERIALIZED (SELECT id,available_sizes FROM public.products WHERE id=ANY(p_product_ids[1:50]) AND is_active),
 held AS MATERIALIZED (SELECT h.product_id,h.size,sum(h.quantity) quantity FROM public.shop_stock_reservations h
 JOIN requested p ON p.id=h.product_id WHERE h.status='held' GROUP BY h.product_id,h.size)
 SELECT p.id,jsonb_object_agg(s.size,CASE WHEN s.size=ANY(p.available_sizes) THEN
 least(10,greatest(0,coalesce((st.quantities->>s.size)::int,0)-coalesce(h.quantity,0))) ELSE 0 END)
 FROM requested p CROSS JOIN unnest(ARRAY['S','M','L','XL','XXL']) s(size)
 LEFT JOIN public.product_size_stock st ON st.product_id=p.id
 LEFT JOIN held h ON h.product_id=p.id AND h.size=s.size GROUP BY p.id;
$$;
REVOKE ALL ON FUNCTION public.get_size_purchase_limits(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_size_purchase_limits(uuid[]) TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
