BEGIN;
ALTER TABLE public.shop_orders ADD COLUMN transfer_receipt_path text, ADD COLUMN transfer_submitted_at timestamptz, ADD COLUMN transfer_approved_by uuid, ADD COLUMN payment_method text NOT NULL DEFAULT 'bachs';
ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_payment_method_check CHECK (payment_method IN ('bachs','bank_transfer'));
CREATE FUNCTION public.extend_transfer_reservation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.payment_method='bank_transfer' THEN UPDATE public.shop_stock_reservations SET expires_at=NEW.reservation_expires_at WHERE order_id=NEW.id AND status='held'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER z_extend_transfer_reservation AFTER INSERT ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.extend_transfer_reservation();
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('transfer-receipts','transfer-receipts',false,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT (id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.approve_transfer_order(p_order uuid,p_actor uuid) RETURNS public.shop_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result public.shop_orders;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_actor AND is_admin AND is_active) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 SELECT * INTO result FROM public.shop_orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='P0002'; END IF;
 IF result.payment_method<>'bank_transfer' OR result.transfer_receipt_path IS NULL OR result.transfer_submitted_at IS NULL OR result.payment_status<>'pending' THEN RAISE EXCEPTION 'Order is not awaiting transfer approval' USING ERRCODE='42501'; END IF;
 IF result.reservation_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Stock reservation expired; reconcile this order manually' USING ERRCODE='42501'; END IF;
 UPDATE public.shop_orders SET payment_status='paid',paid_at=clock_timestamp(),payment_id='transfer:'||id::text,paid_event_id='transfer:'||id::text,transfer_approved_by=p_actor,emails_claimed_at=clock_timestamp(),email_tracking_started_at=clock_timestamp() WHERE id=p_order RETURNING * INTO result;
 IF result.payment_status<>'paid' THEN RAISE EXCEPTION 'Stock could not be committed' USING ERRCODE='42501'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.approve_transfer_order(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.approve_transfer_order(uuid,uuid) TO service_role;
CREATE FUNCTION public.flag_transfer_order(p_order uuid,p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_actor AND is_admin AND is_active) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 UPDATE public.shop_orders SET payment_status='review',payment_review_reason='transfer_not_verified' WHERE id=p_order AND payment_method='bank_transfer' AND payment_status='pending' AND transfer_submitted_at IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order is not awaiting transfer review' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.flag_transfer_order(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_transfer_order(uuid,uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
