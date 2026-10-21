BEGIN;

-- Preserve the same access rules with one SELECT policy per browser role.
DROP POLICY "Users can view own data" ON public.users;
DROP POLICY "Users can view own row" ON public.users;
DROP POLICY "Admins can view all users" ON public.users;
CREATE POLICY users_read_own_or_admin ON public.users FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin_user()));

DROP POLICY "Admins can do anything on products" ON public.products;
DROP POLICY "Admins can insert products" ON public.products;
DROP POLICY "Admins can update products" ON public.products;
DROP POLICY "Admins can delete products" ON public.products;
DROP POLICY products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products FOR SELECT TO anon USING (is_active);
CREATE POLICY products_account_read ON public.products FOR SELECT TO authenticated
USING (is_active OR (SELECT public.is_admin_user()));
CREATE POLICY products_admin_insert ON public.products FOR INSERT TO authenticated
WITH CHECK ((SELECT public.is_admin_user()));
CREATE POLICY products_admin_update ON public.products FOR UPDATE TO authenticated
USING ((SELECT public.is_admin_user())) WITH CHECK ((SELECT public.is_admin_user()));
CREATE POLICY products_admin_delete ON public.products FOR DELETE TO authenticated
USING ((SELECT public.is_admin_user()));

DROP POLICY "Students can view own data" ON public.students;
DROP POLICY "Admins can view all students" ON public.students;
-- The restrictive guard remains the authority, including for inactive accounts.
ALTER POLICY students_account_read ON public.students USING (true);

-- Caller identity and these zero-argument account helpers are row-independent.
-- InitPlans evaluate them once per statement; ownership comparisons stay per row.
DO $$
DECLARE p record; new_using text; new_check text; command text;
BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' LOOP
   new_using := regexp_replace(p.qual, '(?<!SELECT )\mauth[.]uid[(][)]', '(SELECT auth.uid())', 'g');
   new_check := regexp_replace(p.with_check, '(?<!SELECT )\mauth[.]uid[(][)]', '(SELECT auth.uid())', 'g');
   new_using := regexp_replace(new_using, '(?<!SELECT )(?<![[:alnum:]_.])(?:public[.])?(is_admin_user|is_active_account|is_active_account_admin|is_admin)[(][)]', '(SELECT public.\1())', 'g');
   new_check := regexp_replace(new_check, '(?<!SELECT )(?<![[:alnum:]_.])(?:public[.])?(is_admin_user|is_active_account|is_active_account_admin|is_admin)[(][)]', '(SELECT public.\1())', 'g');
   IF new_using IS DISTINCT FROM p.qual OR new_check IS DISTINCT FROM p.with_check THEN
     command := format('ALTER POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
     IF new_using IS NOT NULL THEN command := command || ' USING (' || new_using || ')'; END IF;
     IF new_check IS NOT NULL THEN command := command || ' WITH CHECK (' || new_check || ')'; END IF;
     EXECUTE command;
   END IF;
 END LOOP;
END;
$$;

CREATE INDEX products_active_page_idx ON public.products(created_at DESC,id ASC) WHERE is_active;
CREATE INDEX products_active_category_page_idx ON public.products(category,created_at DESC,id ASC) WHERE is_active;
CREATE INDEX products_admin_page_idx ON public.products(created_at DESC,id ASC);

-- SECURITY INVOKER retains product RLS. Search uses literal substrings, including
-- specifications, with no dynamic SQL or PostgREST filter-string interpolation.
CREATE FUNCTION public.get_shop_product_page(p_page integer DEFAULT 1,p_search text DEFAULT '',
 p_category text DEFAULT 'All',p_price text DEFAULT 'all',p_gender text DEFAULT 'all')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 OR p_search IS NULL OR length(p_search)>200
   OR p_category IS NULL OR length(p_category)>100 OR p_price IS NULL OR p_price NOT IN ('all','low','medium','high')
   OR p_gender IS NULL OR p_gender NOT IN ('all','male','female') THEN
   RAISE EXCEPTION 'Invalid product page filters' USING ERRCODE='22023';
 END IF;
 RETURN (
 WITH filtered AS NOT MATERIALIZED (
   SELECT p.id,p.slug,p.name,p.category,p.price,p.sale_price,p.image,p.created_at
   FROM public.products p WHERE p.is_active
   AND (p_category='All' OR p.category=p_category)
   AND (p_gender='all' OR p.gender IN (p_gender,'unisex'))
   AND (p_price='all' OR (p_price='low' AND p.price<=40000)
     OR (p_price='medium' AND p.price>40000 AND p.price<=60000) OR (p_price='high' AND p.price>60000))
   AND (btrim(p_search)='' OR strpos(lower(concat_ws(' ',p.name,p.category,p.description,p.specifications::text)),lower(btrim(p_search)))>0)
 ), totals AS (SELECT count(*) n FROM filtered), bounds AS (
   SELECT n,least(p_page::bigint,greatest(1,(n+11)/12)) page FROM totals
 ), page_rows AS (
   SELECT * FROM filtered ORDER BY created_at DESC,id ASC LIMIT 12 OFFSET (SELECT (page-1)*12 FROM bounds)
 ) SELECT jsonb_build_object('total',b.n,'page',b.page,'products',coalesce(
   (SELECT jsonb_agg(to_jsonb(r)-'created_at' ORDER BY r.created_at DESC,r.id ASC) FROM page_rows r),'[]'::jsonb)) FROM bounds b
 );
END;
$$;

-- Product and matching stock rows come from the same statement snapshot. This
-- avoids whole-catalog downloads and a separate, capped stock-table request.
CREATE FUNCTION public.get_admin_product_page(p_page integer DEFAULT 1,p_search text DEFAULT '',p_category text DEFAULT 'All')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (SELECT public.is_admin_user()) IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
 END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 OR p_search IS NULL OR length(p_search)>200
   OR p_category IS NULL OR length(p_category)>100 THEN
   RAISE EXCEPTION 'Invalid product page filters' USING ERRCODE='22023';
 END IF;
 RETURN (
 WITH filtered AS NOT MATERIALIZED (
   SELECT p.id,p.slug,p.name,p.category,p.gender,p.description,p.price,p.sale_price,p.image,p.available_sizes,p.created_at
   FROM public.products p WHERE (p_category='All' OR p.category=p_category)
   AND (btrim(p_search)='' OR strpos(lower(concat_ws(' ',p.name,p.category,p.description)),lower(btrim(p_search)))>0)
 ), totals AS (SELECT count(*) n FROM filtered), bounds AS (
   SELECT n,least(p_page::bigint,greatest(1,(n+23)/24)) page FROM totals
 ), page_rows AS (
   SELECT * FROM filtered ORDER BY created_at DESC,id ASC LIMIT 24 OFFSET (SELECT (page-1)*24 FROM bounds)
 ) SELECT jsonb_build_object('total',b.n,'page',b.page,'products',coalesce(
   (SELECT jsonb_agg((to_jsonb(r)-'created_at') || jsonb_build_object('stock',
     CASE WHEN st.product_id IS NULL THEN NULL ELSE jsonb_build_object('quantities',st.quantities,'revision',st.revision) END)
     ORDER BY r.created_at DESC,r.id ASC)
    FROM page_rows r LEFT JOIN public.product_size_stock st ON st.product_id=r.id),'[]'::jsonb),
   'categories',coalesce((SELECT jsonb_agg(c.category ORDER BY c.category) FROM
     (SELECT DISTINCT category FROM public.products WHERE category IS NOT NULL AND category<>'') c),'[]'::jsonb)) FROM bounds b
 );
END;
$$;
REVOKE ALL ON FUNCTION public.get_shop_product_page(integer,text,text,text,text),public.get_admin_product_page(integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_product_page(integer,text,text,text,text) TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_product_page(integer,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
