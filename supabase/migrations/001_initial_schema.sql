-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('educator', 'learner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user handling
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Classrooms Table
CREATE TABLE public.classrooms (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  educator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enrollment_code TEXT NOT NULL UNIQUE,
  enrollment_limit INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classrooms are viewable by everyone (to join)."
  ON classrooms FOR SELECT
  USING ( true );

CREATE POLICY "Educators can create classrooms."
  ON classrooms FOR INSERT
  WITH CHECK ( auth.uid() = educator_id );

CREATE POLICY "Educators can update their classrooms."
  ON classrooms FOR UPDATE
  USING ( auth.uid() = educator_id );


-- 3. Classroom Members Table
CREATE TABLE public.classroom_members (
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (classroom_id, student_id)
);

ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members viewable by classroom educator and the member themself."
  ON classroom_members FOR SELECT
  USING (
    auth.uid() = student_id OR 
    EXISTS (
      SELECT 1 FROM classrooms c 
      WHERE c.id = classroom_id AND c.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can join classrooms."
  ON classroom_members FOR INSERT
  WITH CHECK ( auth.uid() = student_id );


-- 4. Quizzes Table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  educator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_seconds INTEGER DEFAULT 60,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can manage their own quizzes."
  ON quizzes FOR ALL
  USING ( auth.uid() = educator_id );

CREATE POLICY "Students can view published quizzes in their classrooms."
  ON quizzes FOR SELECT
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM classroom_members cm
      WHERE cm.classroom_id = quizzes.classroom_id AND cm.student_id = auth.uid()
    )
  );


-- 5. Quiz Cards (Questions) Table
CREATE TABLE public.quiz_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'fill_blank', 'enumeration')),
  question_text TEXT NOT NULL,
  options JSONB, -- For multiple_choice
  correct_answer JSONB NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

ALTER TABLE public.quiz_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can manage cards in their quizzes."
  ON quiz_cards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id AND q.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can view cards for published quizzes they can access."
  ON quiz_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id AND q.is_published = true AND EXISTS (
        SELECT 1 FROM classroom_members cm
        WHERE cm.classroom_id = q.classroom_id AND cm.student_id = auth.uid()
      )
    )
  );


-- 6. Quiz Attempts Table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  time_taken_seconds INTEGER,
  answers JSONB,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own attempts."
  ON quiz_attempts FOR SELECT
  USING ( auth.uid() = student_id );

CREATE POLICY "Educators can view attempts for their quizzes."
  ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_id AND q.educator_id = auth.uid()
    )
  );

CREATE POLICY "Students can create attempts."
  ON quiz_attempts FOR INSERT
  WITH CHECK ( auth.uid() = student_id );


-- Realtime Setup
alter publication supabase_realtime add table public.classrooms;
alter publication supabase_realtime add table public.quizzes;
