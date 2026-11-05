BEGIN;
CREATE TABLE public.vendor_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL,entity_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,attempts integer NOT NULL DEFAULT 0,last_error text
);
ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendor_notifications FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.vendor_notifications TO service_role;
CREATE FUNCTION public.queue_vendor_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='vendor_accounts' THEN
   IF NEW.status='pending' THEN
     IF TG_OP='INSERT' THEN INSERT INTO public.vendor_notifications(kind,entity_id)VALUES('invite',NEW.user_id);
     ELSIF OLD.status IS DISTINCT FROM NEW.status OR OLD.invited_at IS DISTINCT FROM NEW.invited_at THEN INSERT INTO public.vendor_notifications(kind,entity_id)VALUES('invite',NEW.user_id); END IF;
   END IF;
 ELSIF TG_TABLE_NAME='shop_orders' THEN
   IF NEW.payment_status='paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN INSERT INTO public.vendor_notifications(kind,entity_id)VALUES('paid',NEW.id); END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_vendor_notification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER vendor_invitation_queue AFTER INSERT OR UPDATE ON public.vendor_accounts FOR EACH ROW EXECUTE FUNCTION public.queue_vendor_notification();
CREATE TRIGGER vendor_paid_queue AFTER UPDATE OF payment_status ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.queue_vendor_notification();
CREATE TABLE public.vendor_terms_acceptances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),terms_version text NOT NULL,accepted_at timestamptz NOT NULL
);
ALTER TABLE public.vendor_terms_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendor_terms_acceptances FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.vendor_terms_acceptances TO service_role;
CREATE FUNCTION public.record_vendor_terms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status='active' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.accepted_terms_version IS DISTINCT FROM NEW.accepted_terms_version) THEN
 INSERT INTO public.vendor_terms_acceptances(user_id,terms_version,accepted_at)VALUES(NEW.user_id,NEW.accepted_terms_version,NEW.accepted_at);
 END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_vendor_terms() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_vendor_terms AFTER UPDATE ON public.vendor_accounts FOR EACH ROW EXECUTE FUNCTION public.record_vendor_terms();
NOTIFY pgrst,'reload schema';
SELECT cron.schedule('elegant-vendor-notifications','* * * * *',$job$
 SELECT net.http_post(
   url:='https://elegantstyle.com.ng/api/internal/vendor-notifications',
   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='elegant_vendor_worker_secret' LIMIT 1)),
   body:='{}'::jsonb, timeout_milliseconds:=55000
 );
$job$);
COMMIT;
