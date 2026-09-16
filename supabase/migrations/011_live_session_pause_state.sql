-- ============================================================
-- Migration 011: Live Session Pause & Inactivity Standby
-- ============================================================

-- 1. Add pause columns to live_sessions
ALTER TABLE public.live_sessions 
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pause_reason TEXT DEFAULT NULL;

-- 2. Create pause_live_session RPC
CREATE OR REPLACE FUNCTION public.pause_live_session(
  p_session_id UUID,
  p_reason TEXT DEFAULT 'host_disconnected'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session RECORD;
BEGIN
  SELECT s.*, c.educator_id INTO v_session
  FROM public.live_sessions s
  JOIN public.classrooms c ON c.id = s.classroom_id
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hindi nahanap ang Live Session.';
  END IF;

  -- Only allow if session is active (not ended and not setup)
  IF v_session.status IN ('ended', 'setup') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session is not in active state.');
  END IF;

  -- If already paused, no-op
  IF v_session.is_paused THEN
    RETURN jsonb_build_object('success', true, 'is_paused', true, 'already_paused', true);
  END IF;

  UPDATE public.live_sessions
  SET 
    is_paused = true,
    paused_at = timezone('utc'::text, now()),
    pause_reason = p_reason
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'is_paused', true,
    'pause_reason', p_reason
  );
END;
$$;


-- 3. Create resume_live_session RPC
CREATE OR REPLACE FUNCTION public.resume_live_session(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session RECORD;
  v_paused_seconds INTEGER := 0;
  v_new_started_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT s.*, c.educator_id INTO v_session
  FROM public.live_sessions s
  JOIN public.classrooms c ON c.id = s.classroom_id
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hindi nahanap ang Live Session.';
  END IF;

  -- If not paused, return success
  IF NOT v_session.is_paused THEN
    RETURN jsonb_build_object('success', true, 'is_paused', false);
  END IF;

  -- Calculate paused duration and shift question_started_at so remaining time is preserved
  IF v_session.paused_at IS NOT NULL AND v_session.question_started_at IS NOT NULL THEN
    v_paused_seconds := GREATEST(0, EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v_session.paused_at))::INTEGER);
    v_new_started_at := v_session.question_started_at + (v_paused_seconds || ' seconds')::INTERVAL;
  ELSE
    v_new_started_at := v_session.question_started_at;
  END IF;

  UPDATE public.live_sessions
  SET 
    is_paused = false,
    paused_at = NULL,
    pause_reason = NULL,
    question_started_at = v_new_started_at
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'is_paused', false,
    'adjusted_paused_seconds', v_paused_seconds
  );
END;
$$;
