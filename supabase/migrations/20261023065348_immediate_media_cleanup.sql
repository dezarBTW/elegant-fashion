BEGIN;
-- Called only by the authenticated admin server route; never trust browser paths.
CREATE FUNCTION public.admin_delete_with_media(p_kind text, p_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE old_row jsonb; images text[] := '{}'; bucket text;
BEGIN
 IF p_kind='product' THEN
   PERFORM 1 FROM public.products WHERE id=p_id::uuid FOR UPDATE;
   SELECT coalesce(array_agg(url),'{}') INTO images FROM public.product_images WHERE product_id=p_id::uuid;
   DELETE FROM public.products WHERE id=p_id::uuid RETURNING to_jsonb(products.*) INTO old_row;
   images := array_append(images,old_row->>'image'); bucket := 'product-images';
 ELSIF p_kind='student' THEN
   DELETE FROM public.students WHERE id=p_id::bigint RETURNING to_jsonb(students.*) INTO old_row;
   images := ARRAY[old_row->>'passport_photo']; bucket := 'student-passports';
 ELSIF p_kind='bespoke' THEN
   DELETE FROM public.bespoke_requests WHERE id=p_id::uuid RETURNING to_jsonb(bespoke_requests.*) INTO old_row;
   SELECT coalesce(array_agg(value),'{}') INTO images FROM jsonb_array_elements_text(old_row->'image_paths');
   bucket := 'bespoke-requests';
 ELSE RAISE EXCEPTION 'Invalid record type' USING ERRCODE='22023';
 END IF;
 -- A repeated delete can retry the durable cleanup queue.
 IF old_row IS NULL THEN RETURN NULL; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('bucket',bucket,'path',path)),'[]')
   FROM (SELECT DISTINCT public.storage_path_from_value(bucket,value) path FROM unnest(images) value) refs
   WHERE path IS NOT NULL AND path <> '');
END; $$;
REVOKE ALL ON FUNCTION public.admin_delete_with_media(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_with_media(text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
