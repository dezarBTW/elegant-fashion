BEGIN;
DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.get_shop_product_page(integer,text,text,text,text)'::regprocedure) INTO definition;
 definition:=replace(definition,'WHERE p.is_active','WHERE p.is_active AND cardinality(p.available_sizes)>0');
 EXECUTE definition;
END $$;
CREATE FUNCTION public.get_home_runway_catalog()
RETURNS TABLE(id uuid,slug text,name text,image text,created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT p.id,p.slug,p.name,p.image,p.created_at FROM public.products p
 WHERE p.is_active AND cardinality(p.available_sizes)>0 AND p.image IS NOT NULL AND btrim(p.image)<>''
 ORDER BY p.created_at DESC,p.id LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.get_home_runway_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_home_runway_catalog() TO anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
