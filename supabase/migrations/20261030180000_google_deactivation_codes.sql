-- One-time email confirmation for Google-connected account deactivation.
CREATE TABLE IF NOT EXISTS public.account_deactivation_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5)
);
ALTER TABLE public.account_deactivation_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deactivation_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.account_deactivation_codes TO service_role;

CREATE OR REPLACE FUNCTION public.consume_account_deactivation_code(p_user_id UUID, p_code_hash TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE pending public.account_deactivation_codes%ROWTYPE;
BEGIN
  SELECT * INTO pending FROM public.account_deactivation_codes
  WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF pending.expires_at <= now() OR pending.attempts >= 5 THEN
    DELETE FROM public.account_deactivation_codes WHERE user_id = p_user_id;
    RETURN FALSE;
  END IF;
  IF pending.code_hash = p_code_hash THEN
    DELETE FROM public.account_deactivation_codes WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;
  UPDATE public.account_deactivation_codes SET attempts = attempts + 1
  WHERE user_id = p_user_id;
  RETURN FALSE;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_account_deactivation_code(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_account_deactivation_code(UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_account_action_limit(p_user_id UUID, p_action TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE count_now INTEGER; window_size INTERVAL; maximum INTEGER;
BEGIN
  IF p_action NOT IN ('password', 'deactivate', 'deactivate_code_send', 'deactivate_code_verify', 'refund', 'complaint') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;
  window_size := CASE WHEN p_action IN ('password', 'deactivate', 'deactivate_code_send', 'deactivate_code_verify')
    THEN INTERVAL '15 minutes' ELSE INTERVAL '1 hour' END;
  maximum := CASE p_action WHEN 'deactivate_code_send' THEN 3
    WHEN 'password' THEN 5 WHEN 'deactivate' THEN 5 WHEN 'deactivate_code_verify' THEN 5 ELSE 10 END;
  INSERT INTO public.account_action_limits AS limits (user_id, action, window_started_at, request_count)
  VALUES (p_user_id, p_action, now(), 1)
  ON CONFLICT (user_id, action) DO UPDATE SET
    window_started_at = CASE WHEN limits.window_started_at <= now() - window_size THEN now() ELSE limits.window_started_at END,
    request_count = CASE WHEN limits.window_started_at <= now() - window_size THEN 1 ELSE limits.request_count + 1 END
  RETURNING request_count INTO count_now;
  RETURN count_now <= maximum;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_account_action_limit(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_account_action_limit(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
