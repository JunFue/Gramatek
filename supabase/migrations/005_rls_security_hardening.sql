-- ====================================================================
-- MIGRATION 005: RLS POLICIES & PERMISSIONS HARDENING (RECURSION-SAFE)
-- ====================================================================
-- This migration comprehensively audits, repairs, and secures Row Level Security (RLS)
-- across all Gramatek tables to ensure:
-- 1. Teachers can full CRUD (Create, Read, Update, Delete) their own classrooms, quizzes, cards, attempts, and live sessions.
-- 2. Students can ONLY view and take quizzes/games belonging to classrooms they are enrolled in.
-- 3. Quizzes from Classroom A are strictly hidden and inaccessible to students enrolled in Classroom B.
-- 4. Classroom member isolation and classmate roster visibility are properly calibrated.
-- 5. Safe fallbacks for built-in practice games and real-time live sessions.
-- 6. Non-recursive SECURITY DEFINER helper functions to prevent Postgres error 42P17.

-- --------------------------------------------------------------------
-- 0. SECURITY DEFINER HELPER FUNCTIONS (Bypass RLS in subqueries)
-- --------------------------------------------------------------------

-- Helper function to check if user is an enrolled member of a classroom
CREATE OR REPLACE FUNCTION public.is_classroom_member(p_classroom_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_id = p_classroom_id AND student_id = p_user_id
  );
$$;

-- Helper function to check if user is the educator of a classroom
CREATE OR REPLACE FUNCTION public.is_classroom_educator(p_classroom_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = p_classroom_id AND educator_id = p_user_id
  );
$$;

-- Helper function to check if user is educator of a quiz
CREATE OR REPLACE FUNCTION public.is_quiz_educator(p_quiz_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = p_quiz_id AND (q.educator_id = p_user_id OR public.is_classroom_educator(q.classroom_id, p_user_id))
  );
$$;

-- Helper function to check if user can access a quiz as a student
CREATE OR REPLACE FUNCTION public.is_quiz_accessible_by_student(p_quiz_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = p_quiz_id 
      AND (
        (q.is_published = true AND public.is_classroom_member(q.classroom_id, p_user_id))
        OR p_quiz_id IN (
          '00000000-0000-4000-8000-000000000001'::uuid,
          '00000000-0000-4000-8000-000000000002'::uuid,
          '00000000-0000-4000-8000-000000000003'::uuid
        )
      )
  );
$$;

-- Helper function to check if user is educator of a live session
CREATE OR REPLACE FUNCTION public.is_live_session_educator(p_session_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = p_session_id AND public.is_classroom_educator(s.classroom_id, p_user_id)
  );
$$;

-- Helper function to check if user is member of a live session
CREATE OR REPLACE FUNCTION public.is_live_session_member(p_session_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = p_session_id AND public.is_classroom_member(s.classroom_id, p_user_id)
  );
$$;

-- --------------------------------------------------------------------
-- 1. CLASSROOMS TABLE
-- --------------------------------------------------------------------
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Classrooms are viewable by everyone (to join)." ON public.classrooms;
DROP POLICY IF EXISTS "Educators can create classrooms." ON public.classrooms;
DROP POLICY IF EXISTS "Educators can update their classrooms." ON public.classrooms;
DROP POLICY IF EXISTS "Educators manage their classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Students and members can view classrooms" ON public.classrooms;

-- Educator Full CRUD: Educators can Insert, Select, Update, Delete their own classrooms
CREATE POLICY "Educators manage their classrooms"
  ON public.classrooms
  FOR ALL
  TO public
  USING (auth.uid() = educator_id)
  WITH CHECK (auth.uid() = educator_id);

-- Enrolled students can view their classrooms, and active classrooms can be looked up to join
CREATE POLICY "Students and members can view classrooms"
  ON public.classrooms
  FOR SELECT
  TO public
  USING (
    (auth.uid() = educator_id) OR
    (is_active = true) OR
    public.is_classroom_member(id, auth.uid())
  );

-- --------------------------------------------------------------------
-- 2. CLASSROOM MEMBERS TABLE
-- --------------------------------------------------------------------
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members viewable by classroom educator and the member themself." ON public.classroom_members;
DROP POLICY IF EXISTS "Students can join classrooms." ON public.classroom_members;
DROP POLICY IF EXISTS "Educators can remove members from their classrooms." ON public.classroom_members;
DROP POLICY IF EXISTS "Students can leave classrooms." ON public.classroom_members;
DROP POLICY IF EXISTS "Members viewable by educator and classmates" ON public.classroom_members;
DROP POLICY IF EXISTS "Students can join classrooms" ON public.classroom_members;
DROP POLICY IF EXISTS "Educators and students can remove memberships" ON public.classroom_members;

-- Educators can view members of their classrooms; students can view themselves and classmates in the same classroom
CREATE POLICY "Members viewable by educator and classmates"
  ON public.classroom_members
  FOR SELECT
  TO public
  USING (
    (auth.uid() = student_id) OR
    public.is_classroom_educator(classroom_id, auth.uid()) OR
    public.is_classroom_member(classroom_id, auth.uid())
  );

-- Students can join classrooms (insert their own record)
CREATE POLICY "Students can join classrooms"
  ON public.classroom_members
  FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() = student_id) OR
    public.is_classroom_educator(classroom_id, auth.uid())
  );

-- Educators can kick members, and students can leave classrooms
CREATE POLICY "Educators and students can remove memberships"
  ON public.classroom_members
  FOR DELETE
  TO public
  USING (
    (auth.uid() = student_id) OR
    public.is_classroom_educator(classroom_id, auth.uid())
  );

-- --------------------------------------------------------------------
-- 3. QUIZZES TABLE (STRICT CLASSROOM ISOLATION)
-- --------------------------------------------------------------------
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Educators can manage their own quizzes." ON public.quizzes;
DROP POLICY IF EXISTS "Students can view published quizzes in their classrooms." ON public.quizzes;
DROP POLICY IF EXISTS "Educators can manage their quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Students can view published quizzes in their enrolled classrooms" ON public.quizzes;

-- Educator Full CRUD: Educators can manage quizzes in their classrooms
CREATE POLICY "Educators can manage their quizzes"
  ON public.quizzes
  FOR ALL
  TO public
  USING (
    (auth.uid() = educator_id) OR
    public.is_classroom_educator(classroom_id, auth.uid())
  )
  WITH CHECK (
    (auth.uid() = educator_id) AND
    public.is_classroom_educator(classroom_id, auth.uid())
  );

-- Student SELECT: Students can ONLY view published quizzes in classrooms they are currently enrolled in
CREATE POLICY "Students can view published quizzes in their enrolled classrooms"
  ON public.quizzes
  FOR SELECT
  TO public
  USING (
    (is_published = true) AND
    public.is_classroom_member(classroom_id, auth.uid())
  );

-- --------------------------------------------------------------------
-- 4. QUIZ CARDS TABLE
-- --------------------------------------------------------------------
ALTER TABLE public.quiz_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Educators can manage cards in their quizzes." ON public.quiz_cards;
DROP POLICY IF EXISTS "Students can view cards for published quizzes they can access." ON public.quiz_cards;
DROP POLICY IF EXISTS "Educators can manage cards in their quizzes" ON public.quiz_cards;
DROP POLICY IF EXISTS "Students can view cards for published quizzes they can access" ON public.quiz_cards;

-- Educator Full CRUD: Educators manage cards for quizzes they own
CREATE POLICY "Educators manage cards in their quizzes"
  ON public.quiz_cards
  FOR ALL
  TO public
  USING (public.is_quiz_educator(quiz_id, auth.uid()))
  WITH CHECK (public.is_quiz_educator(quiz_id, auth.uid()));

-- Student SELECT: Students can view cards ONLY for published quizzes in their enrolled classrooms
CREATE POLICY "Students can view cards for published quizzes they can access"
  ON public.quiz_cards
  FOR SELECT
  TO public
  USING (public.is_quiz_accessible_by_student(quiz_id, auth.uid()));

-- --------------------------------------------------------------------
-- 5. QUIZ ATTEMPTS TABLE
-- --------------------------------------------------------------------
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own attempts." ON public.quiz_attempts;
DROP POLICY IF EXISTS "Educators can view attempts for their quizzes." ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can create attempts." ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students and educators can view attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students can insert attempts for accessible quizzes" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Educators can delete quiz attempts" ON public.quiz_attempts;

-- SELECT: Students view their own attempts; Educators view attempts for their quizzes
CREATE POLICY "Students and educators can view attempts"
  ON public.quiz_attempts
  FOR SELECT
  TO public
  USING (
    (auth.uid() = student_id) OR
    public.is_quiz_educator(quiz_id, auth.uid())
  );

-- INSERT: Students can ONLY record attempts for quizzes in classrooms they belong to, OR prebuilt practice levels
CREATE POLICY "Students can insert attempts for accessible quizzes"
  ON public.quiz_attempts
  FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() = student_id) AND
    public.is_quiz_accessible_by_student(quiz_id, auth.uid())
  );

-- DELETE: Educators can delete attempts for their quizzes if needed
CREATE POLICY "Educators can delete quiz attempts"
  ON public.quiz_attempts
  FOR DELETE
  TO public
  USING (public.is_quiz_educator(quiz_id, auth.uid()));

-- --------------------------------------------------------------------
-- 6. LIVE SESSIONS & REALTIME TABLES AUDIT
-- --------------------------------------------------------------------
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_leader_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Educators manage classroom live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Enrolled students can view active sessions" ON public.live_sessions;

CREATE POLICY "Educators manage classroom live sessions"
  ON public.live_sessions FOR ALL
  TO public
  USING (public.is_classroom_educator(classroom_id, auth.uid()));

CREATE POLICY "Enrolled students can view active sessions"
  ON public.live_sessions FOR SELECT
  TO public
  USING (public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Educators manage live session questions" ON public.live_session_questions;
DROP POLICY IF EXISTS "Students can view live session questions" ON public.live_session_questions;

CREATE POLICY "Educators manage live session questions"
  ON public.live_session_questions FOR ALL
  TO public
  USING (public.is_live_session_educator(session_id, auth.uid()));

CREATE POLICY "Students can view live session questions"
  ON public.live_session_questions FOR SELECT
  TO public
  USING (public.is_live_session_member(session_id, auth.uid()));

DROP POLICY IF EXISTS "Educators manage participants" ON public.live_session_participants;
DROP POLICY IF EXISTS "Students can view session participants" ON public.live_session_participants;

CREATE POLICY "Educators manage participants"
  ON public.live_session_participants FOR ALL
  TO public
  USING (public.is_live_session_educator(session_id, auth.uid()));

CREATE POLICY "Students can view session participants"
  ON public.live_session_participants FOR SELECT
  TO public
  USING (public.is_live_session_member(session_id, auth.uid()));

DROP POLICY IF EXISTS "Educators manage groups" ON public.live_session_groups;
DROP POLICY IF EXISTS "Students can view groups" ON public.live_session_groups;

CREATE POLICY "Educators manage groups"
  ON public.live_session_groups FOR ALL
  TO public
  USING (public.is_live_session_educator(session_id, auth.uid()));

CREATE POLICY "Students can view groups"
  ON public.live_session_groups FOR SELECT
  TO public
  USING (public.is_live_session_member(session_id, auth.uid()));

DROP POLICY IF EXISTS "Educators manage all answers" ON public.live_session_answers;
DROP POLICY IF EXISTS "Students can view answers" ON public.live_session_answers;

CREATE POLICY "Educators manage all answers"
  ON public.live_session_answers FOR ALL
  TO public
  USING (public.is_live_session_educator(session_id, auth.uid()));

CREATE POLICY "Students can view answers"
  ON public.live_session_answers FOR SELECT
  TO public
  USING (
    (student_id = auth.uid()) OR
    (public.is_live_session_member(session_id, auth.uid()))
  );

-- --------------------------------------------------------------------
-- 7. PROFILES & NOTIFICATIONS AUDIT
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  TO public
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own notifications." ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications." ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications." ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications." ON public.notifications;

CREATE POLICY "Users can view their own notifications."
  ON public.notifications FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications."
  ON public.notifications FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications."
  ON public.notifications FOR DELETE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications."
  ON public.notifications FOR INSERT
  TO public
  WITH CHECK (true);
