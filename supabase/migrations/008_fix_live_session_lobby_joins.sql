-- ============================================================
-- Migration 008: Fix Live Session Lobby & Setup Isolation
-- ============================================================

-- 1. Update create_live_session to automatically end old sessions and create with 'lobby' status
CREATE OR REPLACE FUNCTION public.create_live_session(
  p_classroom_id UUID,
  p_mode TEXT DEFAULT 'individual',
  p_capacity INTEGER DEFAULT 30,
  p_pacing TEXT DEFAULT 'manual',
  p_default_time_limit_seconds INTEGER DEFAULT NULL,
  p_randomize_choices BOOLEAN DEFAULT false,
  p_randomize_question_order BOOLEAN DEFAULT false,
  p_reveal_mode TEXT DEFAULT 'auto_per_question'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session_id UUID;
BEGIN
  -- Validate educator ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms 
    WHERE id = p_classroom_id AND educator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only classroom educator can create live sessions.';
  END IF;

  -- Validate capacity constraint
  IF p_capacity < 1 OR p_capacity > 50 THEN
    RAISE EXCEPTION 'Capacity must be between 1 and 50.';
  END IF;

  -- End any previous unended sessions in this classroom so no stale sessions remain
  UPDATE public.live_sessions
  SET status = 'ended'
  WHERE classroom_id = p_classroom_id AND status != 'ended';

  -- Create new session directly with 'lobby' status
  INSERT INTO public.live_sessions (
    classroom_id,
    status,
    mode,
    capacity,
    pacing,
    default_time_limit_seconds,
    randomize_choices,
    randomize_question_order,
    reveal_mode,
    created_by
  ) VALUES (
    p_classroom_id,
    'lobby',
    p_mode,
    p_capacity,
    p_pacing,
    p_default_time_limit_seconds,
    p_randomize_choices,
    p_randomize_question_order,
    p_reveal_mode,
    v_user_id
  ) RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;


-- 2. Update join_live_session with precise status validation & clear errors
CREATE OR REPLACE FUNCTION public.join_live_session(
  p_session_id UUID,
  p_student_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_active_count INTEGER;
  v_existing RECORD;
BEGIN
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to join.';
  END IF;

  -- Fetch session details
  SELECT s.*, c.name as classroom_name INTO v_session
  FROM public.live_sessions s
  JOIN public.classrooms c ON c.id = s.classroom_id
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hindi nahanap ang Live Session.';
  END IF;

  -- If still in setup
  IF v_session.status = 'setup' THEN
    RAISE EXCEPTION 'Naghahanda pa ang guro ng live session. Mangyaring maghintay bago sumali.';
  END IF;

  -- Status check: If active (question, reveal) or ended
  IF v_session.status NOT IN ('lobby') THEN
    -- If already joined before, allow reconnect
    SELECT * INTO v_existing FROM public.live_session_participants
    WHERE session_id = p_session_id AND student_id = p_student_id;
    
    IF NOT FOUND THEN
      IF v_session.status = 'ended' THEN
        RAISE EXCEPTION 'Tapos na ang Live Session na ito.';
      ELSE
        RAISE EXCEPTION 'Nagsimula na ang sesyon at sarado na ang pagsali.';
      END IF;
    END IF;

    IF v_existing.removed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Inalis ka ng guro mula sa sesyong ito.';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'reconnected',
      'session_id', p_session_id,
      'group_id', v_existing.group_id
    );
  END IF;

  -- Verify classroom enrollment
  IF NOT EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_id = v_session.classroom_id AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'Kailangan mong maging miyembro ng silid-aralang ito upang makasali.';
  END IF;

  -- Check if previously kicked/removed
  SELECT * INTO v_existing FROM public.live_session_participants
  WHERE session_id = p_session_id AND student_id = p_student_id;

  IF FOUND AND v_existing.removed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Inalis ka ng guro mula sa sesyong ito.';
  END IF;

  -- Check capacity (atomic count of active participants)
  SELECT COUNT(*) INTO v_active_count
  FROM public.live_session_participants
  WHERE session_id = p_session_id AND removed_at IS NULL;

  IF v_active_count >= v_session.capacity AND v_existing IS NULL THEN
    RAISE EXCEPTION 'Puno na ang kapasidad ng sesyon (%/%)', v_active_count, v_session.capacity;
  END IF;

  -- Insert participant record if new
  INSERT INTO public.live_session_participants (
    session_id,
    student_id,
    joined_at,
    total_score
  ) VALUES (
    p_session_id,
    p_student_id,
    timezone('utc'::text, now()),
    0
  )
  ON CONFLICT (session_id, student_id) 
  DO UPDATE SET removed_at = NULL
  WHERE live_session_participants.removed_at IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'joined',
    'session_id', p_session_id,
    'classroom_name', v_session.classroom_name,
    'mode', v_session.mode,
    'capacity', v_session.capacity
  );
END;
$$;
