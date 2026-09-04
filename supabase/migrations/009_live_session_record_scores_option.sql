-- ============================================================
-- Migration 009: Live Session Score Recording Option (Student Progress & Grades)
-- ============================================================

-- 1. Add columns to live_sessions
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS scores_recorded_to_progress BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL;

-- 2. Update create_live_session RPC to accept optional quiz_id
CREATE OR REPLACE FUNCTION public.create_live_session(
  p_classroom_id UUID,
  p_mode TEXT DEFAULT 'individual',
  p_capacity INTEGER DEFAULT 30,
  p_pacing TEXT DEFAULT 'manual',
  p_default_time_limit_seconds INTEGER DEFAULT NULL,
  p_randomize_choices BOOLEAN DEFAULT false,
  p_randomize_question_order BOOLEAN DEFAULT false,
  p_reveal_mode TEXT DEFAULT 'auto_per_question',
  p_quiz_id UUID DEFAULT NULL
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

  -- End any previous unended sessions in this classroom
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
    quiz_id,
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
    p_quiz_id,
    v_user_id
  ) RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;


-- 3. Function to record or remove live session scores from official student progress
CREATE OR REPLACE FUNCTION public.record_live_session_scores(
  p_session_id UUID,
  p_record BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session RECORD;
  v_target_quiz_id UUID;
  v_total_questions INTEGER := 0;
  v_part RECORD;
  v_correct_count INTEGER := 0;
  v_total_time_ms BIGINT := 0;
  v_affected_count INTEGER := 0;
  v_mode_tag TEXT;
BEGIN
  -- 1. Verify educator ownership
  SELECT s.*, c.educator_id, c.name as classroom_name INTO v_session
  FROM public.live_sessions s
  JOIN public.classrooms c ON c.id = s.classroom_id
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hindi nahanap ang Live Session.';
  END IF;

  IF v_session.educator_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Guro lamang ng silid-aralang ito ang maaaring magtala ng grado.';
  END IF;

  v_mode_tag := CASE WHEN v_session.mode = 'group' THEN 'team_clash' ELSE 'live_arena' END;
  v_target_quiz_id := v_session.quiz_id;

  -- 2. If RECORD = TRUE: write scores to quiz_attempts
  IF p_record IS TRUE THEN
    -- Ensure target quiz exists
    IF v_target_quiz_id IS NULL THEN
      -- Create a published classroom quiz entry to house these live scores
      INSERT INTO public.quizzes (
        classroom_id,
        educator_id,
        title,
        description,
        is_published,
        game_mode
      ) VALUES (
        v_session.classroom_id,
        v_session.educator_id,
        'Live Session: ' || v_session.classroom_name || ' (' || to_char(v_session.created_at, 'Mon DD, YYYY') || ')',
        'Pagsusulit mula sa Live Session (' || (CASE WHEN v_session.mode = 'group' THEN 'Pangkatang Laro' ELSE 'Indibidwal' END) || ')',
        true,
        v_mode_tag
      ) RETURNING id INTO v_target_quiz_id;

      UPDATE public.live_sessions
      SET quiz_id = v_target_quiz_id
      WHERE id = p_session_id;
    END IF;

    -- Count total questions in the live session
    SELECT COUNT(*) INTO v_total_questions
    FROM public.live_session_questions
    WHERE session_id = p_session_id;

    IF v_total_questions = 0 THEN
      v_total_questions := 1;
    END IF;

    -- Clean up any prior attempts for this quiz from this session mode to prevent duplicate entries
    DELETE FROM public.quiz_attempts
    WHERE quiz_id = v_target_quiz_id 
      AND game_mode = v_mode_tag
      AND student_id IN (
        SELECT student_id FROM public.live_session_participants
        WHERE session_id = p_session_id
      );

    -- Iterate active participants and insert attempt records
    FOR v_part IN (
      SELECT student_id, group_id 
      FROM public.live_session_participants
      WHERE session_id = p_session_id AND removed_at IS NULL
    ) LOOP
      IF v_session.mode = 'group' AND v_part.group_id IS NOT NULL THEN
        -- In group mode, score comes from group answers
        SELECT 
          COALESCE(COUNT(*) FILTER (WHERE a.is_correct = true), 0),
          COALESCE(SUM(a.response_ms), 0)
        INTO v_correct_count, v_total_time_ms
        FROM public.live_session_answers a
        WHERE a.session_id = p_session_id AND a.group_id = v_part.group_id;
      ELSE
        -- Individual mode: score comes from student answers
        SELECT 
          COALESCE(COUNT(*) FILTER (WHERE a.is_correct = true), 0),
          COALESCE(SUM(a.response_ms), 0)
        INTO v_correct_count, v_total_time_ms
        FROM public.live_session_answers a
        WHERE a.session_id = p_session_id AND a.student_id = v_part.student_id;
      END IF;

      INSERT INTO public.quiz_attempts (
        quiz_id,
        student_id,
        score,
        total_questions,
        time_taken_seconds,
        completed_at,
        game_mode
      ) VALUES (
        v_target_quiz_id,
        v_part.student_id,
        v_correct_count,
        v_total_questions,
        ROUND(v_total_time_ms / 1000.0),
        timezone('utc'::text, now()),
        v_mode_tag
      );

      v_affected_count := v_affected_count + 1;
    END LOOP;

    -- Mark session as recorded
    UPDATE public.live_sessions
    SET scores_recorded_to_progress = true
    WHERE id = p_session_id;

  ELSE
    -- 3. If RECORD = FALSE: Remove attempts if previously recorded
    IF v_target_quiz_id IS NOT NULL THEN
      DELETE FROM public.quiz_attempts
      WHERE quiz_id = v_target_quiz_id 
        AND game_mode = v_mode_tag
        AND student_id IN (
          SELECT student_id FROM public.live_session_participants
          WHERE session_id = p_session_id
        );
    END IF;

    -- Mark session as unrecorded / casual
    UPDATE public.live_sessions
    SET scores_recorded_to_progress = false
    WHERE id = p_session_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'recorded', p_record,
    'affected_students', v_affected_count
  );
END;
$$;
