BEGIN;

ALTER TABLE public.shop_orders ADD COLUMN reservation_expires_at timestamptz;
UPDATE public.shop_orders SET reservation_expires_at=created_at+interval '30 minutes';
ALTER TABLE public.shop_orders ALTER COLUMN reservation_expires_at SET DEFAULT (now()+interval '30 minutes'), ALTER COLUMN reservation_expires_at SET NOT NULL;
ALTER TABLE public.shop_orders ADD COLUMN payment_review_reason text, ADD COLUMN email_tracking_started_at timestamptz;
ALTER TABLE public.shop_orders ADD COLUMN email_status text NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sent','failed'));
ALTER TABLE public.shop_orders DROP CONSTRAINT shop_orders_checkout_state_check;
ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_checkout_state_check CHECK(checkout_state IN ('creating','open','unknown','expired'));
ALTER TABLE public.shop_stock_reservations ADD COLUMN expires_at timestamptz;
UPDATE public.shop_stock_reservations r SET expires_at=o.reservation_expires_at FROM public.shop_orders o WHERE o.id=r.order_id;
ALTER TABLE public.shop_stock_reservations ALTER COLUMN expires_at SET DEFAULT (now()+interval '30 minutes'), ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE public.shop_stock_reservations DROP CONSTRAINT shop_stock_reservations_status_check;
ALTER TABLE public.shop_stock_reservations ADD CONSTRAINT shop_stock_reservations_status_check CHECK(status IN ('held','sold','released'));
CREATE INDEX reservations_expiry_idx ON public.shop_stock_reservations(expires_at,order_id) WHERE status='held';

-- Holds subtract from availability; releasing a hold must NOT increment physical stock.
-- Lock orders before stock rows, matching payment finalisation's lock order.
CREATE FUNCTION public.release_expired_stock_reservations(p_order_id uuid DEFAULT NULL,p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE ord record; released integer:=0; changed integer;
BEGIN
 FOR ord IN SELECT o.id FROM public.shop_orders o
 WHERE o.payment_status<>'paid' AND (p_order_id IS NULL OR o.id=p_order_id)
 AND EXISTS(SELECT 1 FROM public.shop_stock_reservations r WHERE r.order_id=o.id AND r.status='held' AND r.expires_at<=clock_timestamp())
 ORDER BY o.id LIMIT greatest(1,least(p_limit,500)) FOR UPDATE OF o SKIP LOCKED LOOP
   PERFORM 1 FROM public.product_size_stock s WHERE s.product_id IN
    (SELECT r.product_id FROM public.shop_stock_reservations r WHERE r.order_id=ord.id AND r.status='held') ORDER BY s.product_id FOR UPDATE;
   WITH changed_rows AS (
    UPDATE public.shop_stock_reservations SET status='released' WHERE order_id=ord.id AND status='held' AND expires_at<=clock_timestamp() RETURNING product_id
   ), bumped AS (
    UPDATE public.product_size_stock SET revision=revision+1 WHERE product_id IN(SELECT product_id FROM changed_rows) RETURNING product_id
   ) SELECT count(*) INTO changed FROM changed_rows;
   released:=released+changed;
   UPDATE public.shop_orders SET checkout_state='expired' WHERE id=ord.id;
 END LOOP;
 RETURN released;
END $$;
REVOKE ALL ON FUNCTION public.release_expired_stock_reservations(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_stock_reservations(uuid,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.commit_order_size_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE line record;
BEGIN
 IF NOT OLD.stock_required OR NEW.payment_status<>'paid' OR OLD.payment_status='paid' THEN RETURN NEW; END IF;
 IF NEW.items IS DISTINCT FROM OLD.items THEN RAISE EXCEPTION 'Order items cannot change after reservation'; END IF;
 IF OLD.reservation_expires_at<=clock_timestamp() OR NOT EXISTS(SELECT 1 FROM public.shop_stock_reservations WHERE order_id=OLD.id)
 OR EXISTS(SELECT 1 FROM public.shop_stock_reservations WHERE order_id=OLD.id AND (status<>'held' OR expires_at<=clock_timestamp())) THEN
   NEW.payment_status:='review'; NEW.payment_review_reason:='reservation_expired'; NEW.checkout_state:='expired';
   NEW.emails_claimed_at:=NULL; NEW.email_tracking_started_at:=NULL;
   RETURN NEW;
 END IF;
 PERFORM 1 FROM public.product_size_stock s WHERE s.product_id IN
   (SELECT product_id FROM public.shop_stock_reservations WHERE order_id=OLD.id AND status='held') ORDER BY s.product_id FOR UPDATE;
 -- Recheck the deadline after waiting for locks.
 IF OLD.reservation_expires_at<=clock_timestamp() THEN
   NEW.payment_status:='review'; NEW.payment_review_reason:='reservation_expired'; NEW.checkout_state:='expired';
   NEW.emails_claimed_at:=NULL; NEW.email_tracking_started_at:=NULL; RETURN NEW;
 END IF;
 FOR line IN SELECT * FROM public.shop_stock_reservations WHERE order_id=OLD.id AND status='held' LOOP
   UPDATE public.product_size_stock SET quantities=jsonb_set(quantities,ARRAY[line.size],to_jsonb((quantities->>line.size)::int-line.quantity)),revision=revision+1
   WHERE product_id=line.product_id AND (quantities->>line.size)::int>=line.quantity;
   IF NOT FOUND THEN RAISE EXCEPTION 'stock_reservation_missing'; END IF;
 END LOOP;
 UPDATE public.shop_stock_reservations SET status='sold' WHERE order_id=OLD.id AND status='held';
 RETURN NEW;
END $$;

-- Index-backed SQL-only cleanup. No HTTP requests, credentials or notification polling.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
   PERFORM cron.schedule('elegant-expired-stock-reservations','*/5 * * * *','SELECT public.release_expired_stock_reservations();');
 END IF;
END $$;

-- Delivery audit records, not a polling queue. Payload and recipient are immutable on retry.
CREATE TABLE public.order_email_deliveries (
 notification_key text PRIMARY KEY, order_id uuid NOT NULL REFERENCES public.shop_orders(id),
 recipient text NOT NULL, message jsonb NOT NULL,
 email_status text NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0, first_attempt_at timestamptz, sent_at timestamptz,
 lease_token uuid, lease_until timestamptz, last_error text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_email_order_idx ON public.order_email_deliveries(order_id);
ALTER TABLE public.order_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_email_deliveries FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.order_email_deliveries TO service_role;
CREATE FUNCTION public.claim_order_email(p_order_id uuid,p_key text,p_recipient text,p_message jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE row public.order_email_deliveries; token uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.shop_orders WHERE id=p_order_id AND payment_status='paid' AND email_tracking_started_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Tracked paid order required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.order_email_deliveries(notification_key,order_id,recipient,message) VALUES(p_key,p_order_id,p_recipient,p_message) ON CONFLICT DO NOTHING;
 SELECT * INTO row FROM public.order_email_deliveries WHERE notification_key=p_key FOR UPDATE;
 IF row.order_id<>p_order_id THEN RAISE EXCEPTION 'Notification key conflict'; END IF;
 IF row.email_status='sent' THEN RETURN jsonb_build_object('sent',true); END IF;
 IF row.email_status='sending' AND row.lease_until>clock_timestamp() THEN RETURN jsonb_build_object('sent',false,'busy',true); END IF;
 -- Resend idempotency keys expire after 24h. Ambiguous older attempts need reconciliation,
 -- not a blind resend that might duplicate a message already accepted by the provider.
 IF row.first_attempt_at<clock_timestamp()-interval '23 hours' OR row.attempts>=10 THEN
   UPDATE public.order_email_deliveries SET email_status='failed',last_error='Retry window or attempt limit reached; reconcile with provider',lease_token=NULL,lease_until=NULL WHERE notification_key=p_key;
   RETURN jsonb_build_object('sent',false,'blocked',true);
 END IF;
 token:=gen_random_uuid();
 UPDATE public.order_email_deliveries SET email_status='sending',attempts=attempts+1,
   first_attempt_at=coalesce(first_attempt_at,clock_timestamp()),lease_token=token,lease_until=clock_timestamp()+interval '2 minutes',updated_at=clock_timestamp()
 WHERE notification_key=p_key;
 RETURN jsonb_build_object('token',token,'recipient',row.recipient,'message',row.message);
END $$;
REVOKE ALL ON FUNCTION public.claim_order_email(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_email(uuid,text,text,jsonb) TO service_role;

CREATE FUNCTION public.guard_bespoke_status_transition() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF NOT (CASE OLD.status
   WHEN 'new' THEN NEW.status IN ('contacted','cancelled')
   WHEN 'contacted' THEN NEW.status IN ('quoted','cancelled')
   WHEN 'quoted' THEN NEW.status IN ('confirmed','cancelled')
   WHEN 'confirmed' THEN NEW.status IN ('completed','cancelled') ELSE false END) THEN
   RAISE EXCEPTION 'Invalid bespoke status transition' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_bespoke_status_transition BEFORE UPDATE OF status ON public.bespoke_requests
 FOR EACH ROW EXECUTE FUNCTION public.guard_bespoke_status_transition();
REVOKE ALL ON FUNCTION public.guard_bespoke_status_transition() FROM PUBLIC,anon,authenticated;
REVOKE UPDATE ON public.bespoke_requests FROM anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
