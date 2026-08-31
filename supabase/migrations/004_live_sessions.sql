-- ============================================================
-- Migration 004: Synchronous Live Sessions (Individual & Group Modes)
-- ============================================================

-- 1. Live Sessions Table
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup', 'lobby', 'question', 'reveal', 'ended')),
  mode TEXT NOT NULL DEFAULT 'individual'
    CHECK (mode IN ('individual', 'group')),
  capacity INTEGER NOT NULL DEFAULT 30
    CHECK (capacity >= 1 AND capacity <= 50),
  pacing TEXT NOT NULL DEFAULT 'manual'
    CHECK (pacing IN ('manual', 'timed')),
  default_time_limit_seconds INTEGER DEFAULT 30
    CHECK (default_time_limit_seconds IS NULL OR default_time_limit_seconds > 0),
  randomize_choices BOOLEAN NOT NULL DEFAULT false,
  randomize_question_order BOOLEAN NOT NULL DEFAULT false,
  reveal_mode TEXT NOT NULL DEFAULT 'auto_per_question'
    CHECK (reveal_mode IN ('auto_per_question', 'manual_per_question', 'end_of_session')),
  current_question_id UUID DEFAULT NULL,
  question_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  question_index INTEGER NOT NULL DEFAULT 0,
  results_revealed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- 2. Live Session Questions Table
CREATE TABLE IF NOT EXISTS public.live_session_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  source_question_id UUID REFERENCES public.quiz_cards(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  prompt TEXT NOT NULL,
  choices JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  time_limit_seconds INTEGER DEFAULT NULL
    CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
  revealed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  PRIMARY KEY (id)
);

-- Add foreign key constraint from live_sessions.current_question_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_live_sessions_current_question'
  ) THEN
    ALTER TABLE public.live_sessions
      ADD CONSTRAINT fk_live_sessions_current_question
      FOREIGN KEY (current_question_id) REFERENCES public.live_session_questions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Live Session Groups Table
CREATE TABLE IF NOT EXISTS public.live_session_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  elected_leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

-- 4. Live Session Participants Table
CREATE TABLE IF NOT EXISTS public.live_session_participants (
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  group_id UUID REFERENCES public.live_session_groups(id) ON DELETE SET NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  removed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  PRIMARY KEY (session_id, student_id)
);

-- 5. Live Session Leader Votes Table
CREATE TABLE IF NOT EXISTS public.live_session_leader_votes (
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.live_session_groups(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cast_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (session_id, group_id, voter_id)
);

-- 6. Live Session Answers Table
CREATE TABLE IF NOT EXISTS public.live_session_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.live_session_questions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.live_session_groups(id) ON DELETE SET NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  response_ms INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

-- Unique constraints for answers:
-- Individual mode: 1 answer per student per question
CREATE UNIQUE INDEX IF NOT EXISTS uq_live_answers_individual 
  ON public.live_session_answers(question_id, student_id) 
  WHERE student_id IS NOT NULL AND group_id IS NULL;

-- Group mode: 1 answer per group per question
CREATE UNIQUE INDEX IF NOT EXISTS uq_live_answers_group 
  ON public.live_session_answers(question_id, group_id) 
  WHERE group_id IS NOT NULL;

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_live_sessions_classroom ON public.live_sessions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_live_questions_session ON public.live_session_questions(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_live_participants_session ON public.live_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_live_groups_session ON public.live_session_groups(session_id);
CREATE INDEX IF NOT EXISTS idx_live_answers_session ON public.live_session_answers(session_id, question_id);

-- ============================================================
-- Realtime Publication
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_leader_votes;

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_leader_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_answers ENABLE ROW LEVEL SECURITY;

-- 1. live_sessions RLS
CREATE POLICY "Educators manage classroom live sessions"
  ON public.live_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = live_sessions.classroom_id AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled students can view active sessions"
  ON public.live_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = live_sessions.classroom_id AND cm.student_id = auth.uid()
    )
  );

-- 2. live_session_questions RLS
CREATE POLICY "Educators manage live session questions"
  ON public.live_session_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.classrooms c ON c.id = s.classroom_id
      WHERE s.id = live_session_questions.session_id AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view live session questions"
  ON public.live_session_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.classroom_members cm ON cm.classroom_id = s.classroom_id
      WHERE s.id = live_session_questions.session_id AND cm.student_id = auth.uid()
    )
  );

-- 3. live_session_participants RLS
CREATE POLICY "Educators manage participants"
  ON public.live_session_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.classrooms c ON c.id = s.classroom_id
      WHERE s.id = live_session_participants.session_id AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view session participants"
  ON public.live_session_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.classroom_members cm ON cm.classroom_id = s.classroom_id
      WHERE s.id = live_session_participants.session_id AND cm.student_id = auth.uid()
    )
  );

-- 4. live_session_groups RLS
CREATE POLICY "Educators manage groups"
  ON public.live_session_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.classrooms c ON c.id = s.classroom_id
      WHERE s.id = live_session_groups.session_id AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view groups"
  ON public.live_session_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.classroom_members cm ON cm.classroom_id = s.classroom_id
      WHERE s.id = live_session_groups.session_id AND cm.student_id = auth.uid()
    )
  );

-- 5. live_session_leader_votes RLS
CREATE POLICY "Educators can view all leader votes"
  ON public.live_session_leader_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.classrooms c ON c.id = s.classroom_id
      WHERE s.id = live_session_leader_votes.session_id AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view votes in their group"
  ON public.live_session_leader_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_session_participants p
      WHERE p.session_id = live_session_leader_votes.session_id
        AND p.group_id = live_session_leader_votes.group_id
        AND p.student_id = auth.uid()
    )
  );

CREATE POLICY "Students can cast their vote"
  ON public.live_session_leader_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM public.live_session_participants p
      WHERE p.session_id = live_session_leader_votes.session_id
        AND p.group_id = live_session_leader_votes.group_id
        AND p.student_id = auth.uid()
        AND p.removed_at IS NULL
    )
  );

CREATE POLICY "Students can update their vote"
  ON public.live_session_leader_votes FOR UPDATE
  USING ( auth.uid() = voter_id );

-- 6. live_session_answers RLS
CREATE POLICY "Educators manage all answers"
  ON public.live_session_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.classrooms c ON c.id = s.classroom_id
      WHERE s.id = live_session_answers.session_id AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view answers"
  ON public.live_session_answers FOR SELECT
  USING (
    -- Submitter can always view their own answer
    (student_id = auth.uid()) OR
    -- Group member can view their group answer
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.live_session_participants p
      WHERE p.session_id = live_session_answers.session_id
        AND p.group_id = live_session_answers.group_id
        AND p.student_id = auth.uid()
    )) OR
    -- Other answers only viewable after question revealed
    EXISTS (
      SELECT 1 FROM public.live_session_questions q
      JOIN public.live_sessions s ON s.id = q.session_id
      JOIN public.classroom_members cm ON cm.classroom_id = s.classroom_id
      WHERE q.id = live_session_answers.question_id
        AND cm.student_id = auth.uid()
        AND (q.revealed_at IS NOT NULL OR s.results_revealed_at IS NOT NULL)
    )
  );

-- ============================================================
-- Postgres Database Functions / RPCs
-- ============================================================

-- 0. Get Server Time (for client offset calibration)
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT timezone('utc'::text, now());
$$;

-- 1. Create Live Session
CREATE OR REPLACE FUNCTION public.create_live_session(
  p_classroom_id UUID,
  p_mode TEXT DEFAULT 'individual',
  p_capacity INTEGER DEFAULT 30,
  p_pacing TEXT DEFAULT 'manual',
  p_default_time_limit_seconds INTEGER DEFAULT 30,
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
    'setup',
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

-- 2. Add Questions to Live Session (Snapshots cards)
CREATE OR REPLACE FUNCTION public.add_questions_to_session(
  p_session_id UUID,
  p_source_question_ids UUID[],
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
  FOR v_idx IN 1..array_length(p_source_question_ids, 1) LOOP
    SELECT * INTO v_card FROM public.quiz_cards WHERE id = p_source_question_ids[v_idx];
    
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
        choices,
        correct_answer,
        time_limit_seconds
      ) VALUES (
        p_session_id,
        v_card.id,
        v_order,
        v_card.question_text,
        COALESCE(v_card.options, '[]'::jsonb),
        COALESCE(v_card.correct_answer::text, ''),
        COALESCE(v_time_override, v_card.time_limit_override)
      );

      v_order := v_order + 1;
      v_count := v_count + 1;
    END IF;
  END LOOP;

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

-- 3. Join Live Session
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

  -- Status check
  IF v_session.status NOT IN ('setup', 'lobby') THEN
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
  WHERE session_id = p_session_id AND removed_at IS NULL AND student_id <> p_student_id;

  IF v_active_count >= v_session.capacity THEN
    RAISE EXCEPTION 'Session full: capacity of % reached.', v_session.capacity;
  END IF;

  -- Upsert participant
  INSERT INTO public.live_session_participants (
    session_id,
    student_id,
    joined_at,
    total_score,
    removed_at
  ) VALUES (
    p_session_id,
    p_student_id,
    timezone('utc'::text, now()),
    0,
    NULL
  )
  ON CONFLICT (session_id, student_id) 
  DO UPDATE SET removed_at = NULL;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'joined',
    'session_id', p_session_id,
    'capacity', v_session.capacity,
    'current_count', v_active_count + 1
  );
END;
$$;

-- 4. Randomize Groups (Round-robin distribution)
CREATE OR REPLACE FUNCTION public.randomize_groups(
  p_session_id UUID,
  p_number_of_groups INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group_ids UUID[] := ARRAY[]::UUID[];
  v_group_id UUID;
  v_i INTEGER;
  v_participant RECORD;
  v_group_idx INTEGER := 1;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions s
    JOIN public.classrooms c ON c.id = s.classroom_id
    WHERE s.id = p_session_id AND c.educator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only educator can configure groups.';
  END IF;

  IF p_number_of_groups < 1 THEN
    RAISE EXCEPTION 'Number of groups must be at least 1.';
  END IF;

  -- Clear existing leader votes & groups
  DELETE FROM public.live_session_leader_votes WHERE session_id = p_session_id;
  UPDATE public.live_session_participants SET group_id = NULL WHERE session_id = p_session_id;
  DELETE FROM public.live_session_groups WHERE session_id = p_session_id;

  -- Create N groups
  FOR v_i IN 1..p_number_of_groups LOOP
    INSERT INTO public.live_session_groups (
      session_id,
      label,
      total_score
    ) VALUES (
      p_session_id,
      'Pangkat ' || v_i,
      0
    ) RETURNING id INTO v_group_id;

    v_group_ids := array_append(v_group_ids, v_group_id);
  END LOOP;

  -- Round-robin distribute participants
  FOR v_participant IN 
    SELECT student_id 
    FROM public.live_session_participants 
    WHERE session_id = p_session_id AND removed_at IS NULL
    ORDER BY joined_at ASC
  LOOP
    v_group_id := v_group_ids[v_group_idx];
    
    UPDATE public.live_session_participants
    SET group_id = v_group_id
    WHERE session_id = p_session_id AND student_id = v_participant.student_id;

    v_group_idx := v_group_idx + 1;
    IF v_group_idx > p_number_of_groups THEN
      v_group_idx := 1;
    END IF;
  END LOOP;

  -- Handle groups with exactly 1 member: auto-assign leader
  FOR v_group_id IN SELECT unnest(v_group_ids) LOOP
    IF (SELECT COUNT(*) FROM public.live_session_participants WHERE session_id = p_session_id AND group_id = v_group_id) = 1 THEN
      SELECT student_id INTO v_participant FROM public.live_session_participants 
      WHERE session_id = p_session_id AND group_id = v_group_id LIMIT 1;

      UPDATE public.live_session_groups
      SET leader_id = v_participant.student_id, elected_leader_id = v_participant.student_id
      WHERE id = v_group_id;
    END IF;
  END LOOP;

  RETURN p_number_of_groups;
END;
$$;

-- 5. Set Manual Groups
CREATE OR REPLACE FUNCTION public.set_manual_groups(
  p_session_id UUID,
  p_assignments JSONB -- array of objects: [{ "student_id": "...", "group_label": "Pangkat 1" }]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_item JSONB;
  v_label TEXT;
  v_student_id UUID;
  v_group_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions s
    JOIN public.classrooms c ON c.id = s.classroom_id
    WHERE s.id = p_session_id AND c.educator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only educator can configure groups.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_assignments) LOOP
    v_student_id := (v_item->>'student_id')::UUID;
    v_label := COALESCE(v_item->>'group_label', 'Pangkat');

    -- Find or create group
    SELECT id INTO v_group_id FROM public.live_session_groups
    WHERE session_id = p_session_id AND label = v_label;

    IF NOT FOUND THEN
      INSERT INTO public.live_session_groups (session_id, label)
      VALUES (p_session_id, v_label)
      RETURNING id INTO v_group_id;
    END IF;

    -- Update participant
    UPDATE public.live_session_participants
    SET group_id = v_group_id
    WHERE session_id = p_session_id AND student_id = v_student_id;

    v_count := v_count + 1;
  END LOOP;

  -- Auto assign leader if group has 1 member
  FOR v_group_id IN SELECT id FROM public.live_session_groups WHERE session_id = p_session_id LOOP
    IF (SELECT COUNT(*) FROM public.live_session_participants WHERE session_id = p_session_id AND group_id = v_group_id) = 1 THEN
      SELECT student_id INTO v_student_id FROM public.live_session_participants 
      WHERE session_id = p_session_id AND group_id = v_group_id LIMIT 1;

      UPDATE public.live_session_groups
      SET leader_id = v_student_id, elected_leader_id = v_student_id
      WHERE id = v_group_id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 6. Cast Leader Vote
CREATE OR REPLACE FUNCTION public.cast_leader_vote(
  p_session_id UUID,
  p_group_id UUID,
  p_candidate_id UUID,
  p_voter_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_voter_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to vote.';
  END IF;

  -- Validate voter belongs to group
  IF NOT EXISTS (
    SELECT 1 FROM public.live_session_participants
    WHERE session_id = p_session_id AND group_id = p_group_id AND student_id = p_voter_id AND removed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Voter is not an active member of this group.';
  END IF;

  -- Validate candidate belongs to group
  IF NOT EXISTS (
    SELECT 1 FROM public.live_session_participants
    WHERE session_id = p_session_id AND group_id = p_group_id AND student_id = p_candidate_id AND removed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Candidate is not an active member of this group.';
  END IF;

  -- Upsert vote
  INSERT INTO public.live_session_leader_votes (
    session_id,
    group_id,
    voter_id,
    candidate_id,
    cast_at
  ) VALUES (
    p_session_id,
    p_group_id,
    p_voter_id,
    p_candidate_id,
    timezone('utc'::text, now())
  )
  ON CONFLICT (session_id, group_id, voter_id)
  DO UPDATE SET
    candidate_id = EXCLUDED.candidate_id,
    cast_at = timezone('utc'::text, now());

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Finalize Leader
CREATE OR REPLACE FUNCTION public.finalize_leader(
  p_session_id UUID,
  p_group_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winner_id UUID;
BEGIN
  -- Find candidate with most votes, tie-break by earliest cast_at
  SELECT candidate_id INTO v_winner_id
  FROM public.live_session_leader_votes
  WHERE session_id = p_session_id AND group_id = p_group_id
  GROUP BY candidate_id
  ORDER BY COUNT(*) DESC, MIN(cast_at) ASC
  LIMIT 1;

  -- Fallback if no votes cast: first joined participant
  IF v_winner_id IS NULL THEN
    SELECT student_id INTO v_winner_id
    FROM public.live_session_participants
    WHERE session_id = p_session_id AND group_id = p_group_id AND removed_at IS NULL
    ORDER BY joined_at ASC
    LIMIT 1;
  END IF;

  IF v_winner_id IS NOT NULL THEN
    UPDATE public.live_session_groups
    SET leader_id = v_winner_id, elected_leader_id = v_winner_id
    WHERE id = p_group_id;
  END IF;

  RETURN v_winner_id;
END;
$$;

-- 8. Force Assign Leader (Teacher Escape Hatch)
CREATE OR REPLACE FUNCTION public.force_assign_leader(
  p_session_id UUID,
  p_group_id UUID,
  p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Verify teacher ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions s
    JOIN public.classrooms c ON c.id = s.classroom_id
    WHERE s.id = p_session_id AND c.educator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only educator can force assign leaders.';
  END IF;

  -- Verify student belongs to group
  IF NOT EXISTS (
    SELECT 1 FROM public.live_session_participants
    WHERE session_id = p_session_id AND group_id = p_group_id AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'Student is not in this group.';
  END IF;

  UPDATE public.live_session_groups
  SET leader_id = p_student_id, elected_leader_id = p_student_id
  WHERE id = p_group_id;

  RETURN jsonb_build_object('success', true, 'leader_id', p_student_id);
END;
$$;

-- 9. Duplicate Session
CREATE OR REPLACE FUNCTION public.duplicate_session(
  p_source_session_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_source RECORD;
  v_new_session_id UUID;
  v_q RECORD;
BEGIN
  -- Verify educator ownership
  SELECT s.* INTO v_source
  FROM public.live_sessions s
  JOIN public.classrooms c ON c.id = s.classroom_id
  WHERE s.id = p_source_session_id AND c.educator_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source session not found or unauthorized.';
  END IF;

  -- Create new session in setup status
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
    v_source.classroom_id,
    'setup',
    v_source.mode,
    v_source.capacity,
    v_source.pacing,
    v_source.default_time_limit_seconds,
    v_source.randomize_choices,
    v_source.randomize_question_order,
    v_source.reveal_mode,
    v_user_id
  ) RETURNING id INTO v_new_session_id;

  -- Re-snapshot questions
  FOR v_q IN 
    SELECT * FROM public.live_session_questions
    WHERE session_id = p_source_session_id
    ORDER BY order_index ASC
  LOOP
    INSERT INTO public.live_session_questions (
      session_id,
      source_question_id,
      order_index,
      prompt,
      choices,
      correct_answer,
      time_limit_seconds
    ) VALUES (
      v_new_session_id,
      v_q.source_question_id,
      v_q.order_index,
      v_q.prompt,
      v_q.choices,
      v_q.correct_answer,
      v_q.time_limit_seconds
    );
  END LOOP;

  RETURN v_new_session_id;
END;
$$;

-- 10. Start Session
CREATE OR REPLACE FUNCTION public.start_session(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session RECORD;
  v_question_count INTEGER;
  v_unassigned_group_count INTEGER;
BEGIN
  -- Verify ownership
  SELECT s.* INTO v_session
  FROM public.live_sessions s
  JOIN public.classrooms c ON c.id = s.classroom_id
  WHERE s.id = p_session_id AND c.educator_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized or session not found.';
  END IF;

  -- Verify questions exist
  SELECT COUNT(*) INTO v_question_count
  FROM public.live_session_questions
  WHERE session_id = p_session_id;

  IF v_question_count = 0 THEN
    RAISE EXCEPTION 'Cannot start session with 0 questions.';
  END IF;

  -- If group mode, verify all groups have a leader
  IF v_session.mode = 'group' THEN
    SELECT COUNT(*) INTO v_unassigned_group_count
    FROM public.live_session_groups
    WHERE session_id = p_session_id AND leader_id IS NULL;

    IF v_unassigned_group_count > 0 THEN
      RAISE EXCEPTION 'All groups must have a leader before starting.';
    END IF;
  END IF;

  UPDATE public.live_sessions
  SET status = 'lobby'
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'status', 'lobby');
END;
$$;

-- 11. Advance Question (Supports Teacher advance & Self-Healing Pacing)
CREATE OR REPLACE FUNCTION public.advance_question(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session RECORD;
  v_is_educator BOOLEAN;
  v_next_q RECORD;
  v_current_q RECORD;
  v_time_limit INTEGER;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  SELECT s.*, c.educator_id INTO v_session
  FROM public.live_sessions s
  JOIN public.classrooms c ON c.id = s.classroom_id
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found.';
  END IF;

  v_is_educator := (v_session.educator_id = v_user_id);

  -- Pacing guard: If timed and called by non-educator, enforce deadline + 3s buffer
  IF NOT v_is_educator THEN
    IF v_session.pacing <> 'timed' THEN
      RAISE EXCEPTION 'Unauthorized: Manual pacing can only be advanced by the educator.';
    END IF;

    IF v_session.current_question_id IS NOT NULL AND v_session.question_started_at IS NOT NULL THEN
      SELECT * INTO v_current_q FROM public.live_session_questions WHERE id = v_session.current_question_id;
      v_time_limit := COALESCE(v_current_q.time_limit_seconds, v_session.default_time_limit_seconds, 30);
      
      IF v_now < (v_session.question_started_at + (v_time_limit || ' seconds')::INTERVAL + INTERVAL '3 seconds') THEN
        RAISE EXCEPTION 'Question time limit has not expired yet.';
      END IF;
    END IF;
  END IF;

  -- Auto reveal current question if reveal_mode = 'auto_per_question'
  IF v_session.current_question_id IS NOT NULL AND v_session.reveal_mode = 'auto_per_question' THEN
    UPDATE public.live_session_questions
    SET revealed_at = v_now
    WHERE id = v_session.current_question_id AND revealed_at IS NULL;
  END IF;

  -- Find next question by order_index
  IF v_session.status = 'lobby' OR v_session.current_question_id IS NULL THEN
    -- First question
    SELECT * INTO v_next_q
    FROM public.live_session_questions
    WHERE session_id = p_session_id
    ORDER BY order_index ASC
    LIMIT 1;
  ELSE
    SELECT * INTO v_current_q FROM public.live_session_questions WHERE id = v_session.current_question_id;
    
    SELECT * INTO v_next_q
    FROM public.live_session_questions
    WHERE session_id = p_session_id AND order_index > v_current_q.order_index
    ORDER BY order_index ASC
    LIMIT 1;
  END IF;

  IF v_next_q.id IS NOT NULL THEN
    UPDATE public.live_sessions
    SET 
      current_question_id = v_next_q.id,
      question_started_at = v_now,
      question_index = v_next_q.order_index,
      status = 'question'
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'success', true, 
      'status', 'question', 
      'question_id', v_next_q.id,
      'question_index', v_next_q.order_index
    );
  ELSE
    -- No more questions -> End session
    UPDATE public.live_sessions
    SET status = 'ended'
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'status', 'ended');
  END IF;
END;
$$;

-- 12. Go to Question (Jump forward or backward, Teacher-only)
CREATE OR REPLACE FUNCTION public.go_to_question(
  p_session_id UUID,
  p_question_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_target_q RECORD;
BEGIN
  -- Verify educator ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions s
    JOIN public.classrooms c ON c.id = s.classroom_id
    WHERE s.id = p_session_id AND c.educator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only educator can jump between questions.';
  END IF;

  SELECT * INTO v_target_q
  FROM public.live_session_questions
  WHERE session_id = p_session_id AND order_index = p_question_index;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target question index not found.';
  END IF;

  UPDATE public.live_sessions
  SET 
    current_question_id = v_target_q.id,
    question_started_at = timezone('utc'::text, now()),
    question_index = p_question_index,
    status = 'question'
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'question_id', v_target_q.id,
    'question_index', p_question_index
  );
END;
$$;

-- 13. Remove Participant (Kick) & Trigger Auto-Promotion if Leader
CREATE OR REPLACE FUNCTION public.remove_participant(
  p_session_id UUID,
  p_student_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_participant RECORD;
BEGIN
  -- Verify educator ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions s
    JOIN public.classrooms c ON c.id = s.classroom_id
    WHERE s.id = p_session_id AND c.educator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only educator can remove participants.';
  END IF;

  SELECT * INTO v_participant
  FROM public.live_session_participants
  WHERE session_id = p_session_id AND student_id = p_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found in this session.';
  END IF;

  -- Soft delete participant
  UPDATE public.live_session_participants
  SET removed_at = timezone('utc'::text, now())
  WHERE session_id = p_session_id AND student_id = p_student_id;

  -- If group mode and was leader, promote next member
  IF v_participant.group_id IS NOT NULL THEN
    PERFORM public.check_and_promote_leader(p_session_id, v_participant.group_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'removed_student_id', p_student_id);
END;
$$;

-- 14. Check and Promote Leader (Fallback for disconnect or removal)
CREATE OR REPLACE FUNCTION public.check_and_promote_leader(
  p_session_id UUID,
  p_group_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group RECORD;
  v_next_leader_id UUID;
BEGIN
  SELECT * INTO v_group FROM public.live_session_groups WHERE id = p_group_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check next-joined non-removed group member
  SELECT student_id INTO v_next_leader_id
  FROM public.live_session_participants
  WHERE session_id = p_session_id 
    AND group_id = p_group_id 
    AND removed_at IS NULL
    AND student_id <> COALESCE(v_group.leader_id, '00000000-0000-0000-0000-000000000000'::UUID)
  ORDER BY joined_at ASC
  LIMIT 1;

  IF v_next_leader_id IS NOT NULL THEN
    UPDATE public.live_session_groups
    SET leader_id = v_next_leader_id
    WHERE id = p_group_id;
  END IF;

  RETURN v_next_leader_id;
END;
$$;

-- 15. Submit Answer
CREATE OR REPLACE FUNCTION public.submit_answer(
  p_session_id UUID,
  p_question_id UUID,
  p_answer TEXT,
  p_submitter_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_question RECORD;
  v_participant RECORD;
  v_group RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_time_limit INTEGER;
  v_response_ms INTEGER;
  v_is_correct BOOLEAN := false;
  v_points INTEGER := 0;
  v_base_points INTEGER := 1000;
  v_speed_bonus INTEGER := 0;
BEGIN
  IF p_submitter_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit answer.';
  END IF;

  -- 1. Fetch session and question details
  SELECT * INTO v_session FROM public.live_sessions WHERE id = p_session_id;
  IF NOT FOUND OR v_session.status <> 'question' OR v_session.current_question_id <> p_question_id THEN
    RAISE EXCEPTION 'Question is not currently active for submissions.';
  END IF;

  SELECT * INTO v_question FROM public.live_session_questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found.';
  END IF;

  -- 2. Verify participant not removed
  SELECT * INTO v_participant
  FROM public.live_session_participants
  WHERE session_id = p_session_id AND student_id = p_submitter_id;

  IF NOT FOUND OR v_participant.removed_at IS NOT NULL THEN
    RAISE EXCEPTION 'You are not an active participant in this session.';
  END IF;

  -- 3. Group Mode validation
  IF v_session.mode = 'group' THEN
    IF v_participant.group_id IS NULL THEN
      RAISE EXCEPTION 'You have not been assigned to a group.';
    END IF;

    SELECT * INTO v_group FROM public.live_session_groups WHERE id = v_participant.group_id;
    IF v_group.leader_id <> p_submitter_id THEN
      RAISE EXCEPTION 'Only the group leader can submit answers.';
    END IF;
  END IF;

  -- 4. Timing & Grace Period Check (500ms grace period for timed pacing)
  IF v_session.pacing = 'timed' AND v_session.question_started_at IS NOT NULL THEN
    v_time_limit := COALESCE(v_question.time_limit_seconds, v_session.default_time_limit_seconds, 30);
    IF v_now > (v_session.question_started_at + (v_time_limit || ' seconds')::INTERVAL + INTERVAL '500 milliseconds') THEN
      RAISE EXCEPTION 'Submission deadline has passed.';
    END IF;
  END IF;

  -- 5. Calculate response_ms
  v_response_ms := GREATEST(0, (EXTRACT(EPOCH FROM (v_now - COALESCE(v_session.question_started_at, v_now))) * 1000)::INTEGER);

  -- 6. Check Correctness against server snapshotted answer
  v_is_correct := (TRIM(LOWER(v_question.correct_answer)) = TRIM(LOWER(p_answer)));

  -- 7. Calculate Scoring: Base 1000 + speed bonus up to 500
  IF v_is_correct THEN
    v_time_limit := COALESCE(v_question.time_limit_seconds, v_session.default_time_limit_seconds, 30);
    IF v_time_limit > 0 THEN
      v_speed_bonus := GREATEST(0, ROUND(500 * (1 - (v_response_ms::FLOAT / (v_time_limit * 1000))))::INTEGER);
    ELSE
      v_speed_bonus := 250;
    END IF;
    v_points := v_base_points + v_speed_bonus;
  ELSE
    v_points := 0;
  END IF;

  -- 8. Insert Answer
  IF v_session.mode = 'individual' THEN
    INSERT INTO public.live_session_answers (
      session_id,
      question_id,
      student_id,
      group_id,
      answer,
      is_correct,
      submitted_at,
      response_ms,
      points_awarded
    ) VALUES (
      p_session_id,
      p_question_id,
      p_submitter_id,
      NULL,
      p_answer,
      v_is_correct,
      v_now,
      v_response_ms,
      v_points
    );

    -- Update participant score
    UPDATE public.live_session_participants
    SET total_score = total_score + v_points
    WHERE session_id = p_session_id AND student_id = p_submitter_id;

  ELSE
    INSERT INTO public.live_session_answers (
      session_id,
      question_id,
      student_id,
      group_id,
      answer,
      is_correct,
      submitted_at,
      response_ms,
      points_awarded
    ) VALUES (
      p_session_id,
      p_question_id,
      p_submitter_id,
      v_participant.group_id,
      p_answer,
      v_is_correct,
      v_now,
      v_response_ms,
      v_points
    );

    -- Update group score
    UPDATE public.live_session_groups
    SET total_score = total_score + v_points
    WHERE id = v_participant.group_id;

    -- Mirror score to group members
    UPDATE public.live_session_participants
    SET total_score = total_score + v_points
    WHERE session_id = p_session_id AND group_id = v_participant.group_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'points_awarded', v_points,
    'response_ms', v_response_ms
  );
END;
$$;

-- 16. Reveal Answer (Manual per question)
CREATE OR REPLACE FUNCTION public.reveal_answer(
  p_session_id UUID,
  p_question_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Verify educator ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions s
    JOIN public.classrooms c ON c.id = s.classroom_id
    WHERE s.id = p_session_id AND c.educator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only educator can reveal answers.';
  END IF;

  UPDATE public.live_session_questions
  SET revealed_at = timezone('utc'::text, now())
  WHERE id = p_question_id AND session_id = p_session_id;

  RETURN jsonb_build_object('success', true, 'question_id', p_question_id);
END;
$$;

-- 17. Reveal Final Results (End of session reveal)
CREATE OR REPLACE FUNCTION public.reveal_final_results(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- Verify educator ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions s
    JOIN public.classrooms c ON c.id = s.classroom_id
    WHERE s.id = p_session_id AND c.educator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only educator can reveal final results.';
  END IF;

  -- Set revealed_at on all questions
  UPDATE public.live_session_questions
  SET revealed_at = v_now
  WHERE session_id = p_session_id;

  -- Set results_revealed_at on live_sessions
  UPDATE public.live_sessions
  SET results_revealed_at = v_now
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'results_revealed_at', v_now);
END;
$$;

-- 18. End Session
CREATE OR REPLACE FUNCTION public.end_session(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Verify educator ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.live_sessions s
    JOIN public.classrooms c ON c.id = s.classroom_id
    WHERE s.id = p_session_id AND c.educator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only educator can end session.';
  END IF;

  UPDATE public.live_sessions
  SET status = 'ended'
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'status', 'ended');
END;
$$;
