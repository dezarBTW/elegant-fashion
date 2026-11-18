BEGIN;

CREATE FUNCTION public.queue_abandoned_guardian_uploads(p_limit integer DEFAULT 200)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE queued integer;
BEGIN
  WITH candidates AS (
    SELECT o.name FROM storage.objects o
    WHERE o.bucket_id='guardian-consents'
      AND o.created_at < clock_timestamp()-interval '7 days'
      AND NOT public.storage_path_in_use('guardian-consents',o.name)
    ORDER BY o.created_at,o.id LIMIT greatest(1,least(p_limit,1000))
  ), inserted AS (
    INSERT INTO public.storage_cleanup_queue(bucket,path)
    SELECT 'guardian-consents',name FROM candidates
    ON CONFLICT(bucket,path) DO NOTHING RETURNING 1
  ) SELECT count(*) INTO queued FROM inserted;
  RETURN queued;
END $$;
REVOKE ALL ON FUNCTION public.queue_abandoned_guardian_uploads(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.queue_abandoned_guardian_uploads(integer) TO service_role;

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule('elegant-abandoned-guardian-uploads','0 3 * * *',
      'SELECT public.queue_abandoned_guardian_uploads();');
  END IF;
END $$;

COMMIT;
