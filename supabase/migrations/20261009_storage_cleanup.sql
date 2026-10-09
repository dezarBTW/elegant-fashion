-- Storage cleanup: when a row stops referencing an image, the file is removed from its bucket.
-- Already applied to the live project (migrations "storage_cleanup_queue_and_triggers" and
-- "storage_cleanup_schedule"); kept here so the repo matches the database.
--
-- Direct deletes from storage.objects are blocked by Supabase, so triggers only QUEUE files and the
-- edge function supabase/functions/process-storage-cleanup removes them through the Storage API.

CREATE TABLE IF NOT EXISTS public.storage_cleanup_queue (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket, path)
);

ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_cleanup_queue FROM anon, authenticated;
GRANT ALL ON public.storage_cleanup_queue TO service_role;

-- Turns a stored value (public/signed URL or bare path) into a path inside the given bucket.
-- Returns NULL for external URLs or URLs that point at another bucket.
CREATE OR REPLACE FUNCTION public.storage_path_from_value(p_bucket TEXT, p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v TEXT;
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN NULL;
  END IF;
  v := split_part(p_value, '?', 1);
  IF v ~ '^https?://' THEN
    IF v ~ ('/storage/v1/object/(public|sign|authenticated)/' || p_bucket || '/') THEN
      RETURN regexp_replace(v, '^.*/storage/v1/object/(public|sign|authenticated)/' || p_bucket || '/', '');
    END IF;
    RETURN NULL;
  END IF;
  RETURN ltrim(v, '/');
END;
$$;

-- True while any row in the project still references the file.
CREATE OR REPLACE FUNCTION public.storage_path_in_use(p_bucket TEXT, p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE p_bucket
    WHEN 'bespoke-requests' THEN
      EXISTS (SELECT 1 FROM public.bespoke_requests WHERE image_paths @> ARRAY[p_path])
    WHEN 'student-passports' THEN
      EXISTS (SELECT 1 FROM public.students
              WHERE public.storage_path_from_value('student-passports', passport_photo) = p_path)
    WHEN 'product-images' THEN
      EXISTS (SELECT 1 FROM public.products
              WHERE public.storage_path_from_value('product-images', image) = p_path)
      OR EXISTS (SELECT 1 FROM public.product_images
              WHERE public.storage_path_from_value('product-images', url) = p_path)
      OR EXISTS (SELECT 1 FROM public.categories
              WHERE public.storage_path_from_value('product-images', image_url) = p_path)
    ELSE FALSE
  END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_storage_cleanup(p_bucket TEXT, p_path TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_path IS NULL OR p_path = '' THEN
    RETURN;
  END IF;
  IF public.storage_path_in_use(p_bucket, p_path) THEN
    RETURN;
  END IF;
  INSERT INTO public.storage_cleanup_queue (bucket, path)
  VALUES (p_bucket, p_path)
  ON CONFLICT (bucket, path) DO NOTHING;
END;
$$;

-- Trigger for tables that store ONE image value in a column. Arguments: bucket name, column name.
CREATE OR REPLACE FUNCTION public.trg_cleanup_single_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bucket TEXT := TG_ARGV[0];
  v_col TEXT := TG_ARGV[1];
  v_old TEXT := to_jsonb(OLD) ->> TG_ARGV[1];
  v_new TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_new := to_jsonb(NEW) ->> v_col;
    IF v_old IS NOT DISTINCT FROM v_new THEN
      RETURN NULL;
    END IF;
  END IF;
  PERFORM public.enqueue_storage_cleanup(v_bucket, public.storage_path_from_value(v_bucket, v_old));
  RETURN NULL;
END;
$$;

-- Trigger for bespoke_requests, which stores an ARRAY of image paths.
CREATE OR REPLACE FUNCTION public.trg_cleanup_bespoke_images()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_path TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    FOR v_path IN SELECT unnest(COALESCE(OLD.image_paths, '{}'::TEXT[])) LOOP
      PERFORM public.enqueue_storage_cleanup('bespoke-requests', v_path);
    END LOOP;
  ELSE
    FOR v_path IN
      SELECT unnest(COALESCE(OLD.image_paths, '{}'::TEXT[]))
      EXCEPT
      SELECT unnest(COALESCE(NEW.image_paths, '{}'::TEXT[]))
    LOOP
      PERFORM public.enqueue_storage_cleanup('bespoke-requests', v_path);
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.storage_path_from_value(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.storage_path_in_use(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_storage_cleanup(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_cleanup_single_image() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_cleanup_bespoke_images() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_path_from_value(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.storage_path_in_use(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_storage_cleanup(TEXT, TEXT) TO service_role;

DROP TRIGGER IF EXISTS cleanup_bespoke_images ON public.bespoke_requests;
CREATE TRIGGER cleanup_bespoke_images
  AFTER DELETE OR UPDATE OF image_paths ON public.bespoke_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_cleanup_bespoke_images();

DROP TRIGGER IF EXISTS cleanup_product_image ON public.products;
CREATE TRIGGER cleanup_product_image
  AFTER DELETE OR UPDATE OF image ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.trg_cleanup_single_image('product-images', 'image');

DROP TRIGGER IF EXISTS cleanup_product_images_url ON public.product_images;
CREATE TRIGGER cleanup_product_images_url
  AFTER DELETE OR UPDATE OF url ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.trg_cleanup_single_image('product-images', 'url');

DROP TRIGGER IF EXISTS cleanup_category_image ON public.categories;
CREATE TRIGGER cleanup_category_image
  AFTER DELETE OR UPDATE OF image_url ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_cleanup_single_image('product-images', 'image_url');

DROP TRIGGER IF EXISTS cleanup_student_passport ON public.students;
CREATE TRIGGER cleanup_student_passport
  AFTER DELETE OR UPDATE OF passport_photo ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.trg_cleanup_single_image('student-passports', 'passport_photo');

-- Schedule: every minute, if files are waiting in the queue, call the edge function that removes them.
-- Replace <PROJECT_REF> and <ANON_KEY> (Supabase > Project Settings > API) before running on a new project.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'process-storage-cleanup',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/process-storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body := '{}'::jsonb
  )
  WHERE EXISTS (SELECT 1 FROM public.storage_cleanup_queue);
  $job$
);
