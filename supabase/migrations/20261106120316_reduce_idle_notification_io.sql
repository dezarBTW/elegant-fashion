-- Avoid waking the HTTP worker when no deliverable notification is waiting.
-- The existing partial pending index serves this existence check.
BEGIN;
SELECT cron.schedule('elegant-vendor-notifications','*/5 * * * *',$job$
 SELECT net.http_post(
   url:='https://elegantstyle.com.ng/api/internal/vendor-notifications',
   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='elegant_vendor_worker_secret' LIMIT 1)),
   body:='{}'::jsonb,timeout_milliseconds:=55000
 ) WHERE EXISTS (
   SELECT 1 FROM public.vendor_notifications
   WHERE sent_at IS NULL AND next_attempt_at<=now()
 );
$job$);
COMMIT;
