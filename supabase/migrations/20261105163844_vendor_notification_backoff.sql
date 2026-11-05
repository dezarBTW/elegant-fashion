ALTER TABLE public.vendor_notifications ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX vendor_notifications_pending_idx ON public.vendor_notifications(next_attempt_at,created_at) WHERE sent_at IS NULL;
