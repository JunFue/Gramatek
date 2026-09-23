-- ============================================================
-- Migration 012: Add Question Type Support to Live Session Questions
-- ============================================================

-- 1. Add question_type column to live_session_questions if it does not exist
ALTER TABLE public.live_session_questions 
  ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';

-- 2. Update add_questions_to_session to snapshot question_type from quiz_cards
CREATE OR REPLACE FUNCTION public.add_questions_to_session(
  p_session_id UUID,
  p_source_question_ids TEXT[],
  p_per_question_time_limits INTEGER[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_randomize_order BOOLEAN;
  v_count INTEGER := 0;
  v_idx INTEGER;
  v_card RECORD;
  v_time_override INTEGER;
  v_order INTEGER := 0;
  v_id_text TEXT;
BEGIN
  -- Verify ownership
  SELECT s.randomize_question_order INTO v_randomize_order
  FROM public.live_sessions s
  JOIN public.classrooms c ON c.id = s.classroom_id
  WHERE s.id = p_session_id AND c.educator_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized or session not found.';
  END IF;

  -- Delete existing questions if in setup
  DELETE FROM public.live_session_questions WHERE session_id = p_session_id;

  -- Insert questions
  IF p_source_question_ids IS NOT NULL AND array_length(p_source_question_ids, 1) > 0 THEN
    FOR v_idx IN 1..array_length(p_source_question_ids, 1) LOOP
      v_id_text := p_source_question_ids[v_idx];

      -- Only query quiz_cards if it looks like a valid UUID
      IF v_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT * INTO v_card FROM public.quiz_cards WHERE id = v_id_text::uuid;
        
        IF FOUND THEN
          v_time_override := NULL;
          IF p_per_question_time_limits IS NOT NULL AND array_length(p_per_question_time_limits, 1) >= v_idx THEN
            v_time_override := p_per_question_time_limits[v_idx];
          END IF;

          INSERT INTO public.live_session_questions (
            session_id,
            source_question_id,
            order_index,
            prompt,
            question_type,
            choices,
            correct_answer,
            time_limit_seconds
          ) VALUES (
            p_session_id,
            v_id_text,
            v_order,
            v_card.question_text,
            COALESCE(v_card.question_type, 'multiple_choice'),
            COALESCE(v_card.options, '[]'::jsonb),
            COALESCE(v_card.correct_answer::text, ''),
            COALESCE(v_time_override, v_card.time_limit_override)
          );

          v_order := v_order + 1;
          v_count := v_count + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- If randomized question order was requested, shuffle order_index now
  IF v_randomize_order THEN
    WITH shuffled AS (
      SELECT id, row_number() OVER (ORDER BY random()) - 1 as new_order
      FROM public.live_session_questions
      WHERE session_id = p_session_id
    )
    UPDATE public.live_session_questions q
    SET order_index = s.new_order
    FROM shuffled s
    WHERE q.id = s.id;
  END IF;

  RETURN v_count;
END;
$$;
