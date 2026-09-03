-- ============================================================
-- Migration 008: Fix Live Session Lobby & Setup Isolation
-- ============================================================

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
    RAISE EXCEPTION 'Live session not found.';
  END IF;

  -- Disallow joins during setup
  IF v_session.status = 'setup' THEN
    RAISE EXCEPTION 'Naghahanda pa ang guro ng live session. Mangyaring maghintay bago sumali.';
  END IF;

  -- Status check: If active or ended (question, reveal, ended)
  IF v_session.status NOT IN ('lobby') THEN
    -- If already joined before, allow reconnect
    SELECT * INTO v_existing FROM public.live_session_participants
    WHERE session_id = p_session_id AND student_id = p_student_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Session has already started and is not accepting new joins.';
    END IF;

    IF v_existing.removed_at IS NOT NULL THEN
      RAISE EXCEPTION 'You were removed from this session by the educator.';
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
    RAISE EXCEPTION 'You must be enrolled in this classroom to join this session.';
  END IF;

  -- Check if previously kicked/removed
  SELECT * INTO v_existing FROM public.live_session_participants
  WHERE session_id = p_session_id AND student_id = p_student_id;

  IF FOUND AND v_existing.removed_at IS NOT NULL THEN
    RAISE EXCEPTION 'You were removed from this session by the educator.';
  END IF;

  -- Check capacity (atomic count of active participants)
  SELECT COUNT(*) INTO v_active_count
  FROM public.live_session_participants
  WHERE session_id = p_session_id AND removed_at IS NULL;

  IF v_active_count >= v_session.capacity AND v_existing IS NULL THEN
    RAISE EXCEPTION 'Session capacity reached (%/%)', v_active_count, v_session.capacity;
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
