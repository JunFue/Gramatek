-- ============================================================
-- Migration 013: Classroom Announcements & Enhanced Notifications
-- ============================================================

-- 1. Create Classroom Announcements Table
CREATE TABLE IF NOT EXISTS public.classroom_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  educator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'urgent')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_announcements_classroom
  ON public.classroom_announcements (classroom_id, created_at DESC);

ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Educators manage classroom announcements" ON public.classroom_announcements;
DROP POLICY IF EXISTS "Students view enrolled classroom announcements" ON public.classroom_announcements;

-- Educators can full CRUD announcements for their own classrooms
CREATE POLICY "Educators manage classroom announcements"
  ON public.classroom_announcements
  FOR ALL
  TO public
  USING (
    auth.uid() = educator_id OR
    public.is_classroom_educator(classroom_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = educator_id AND
    public.is_classroom_educator(classroom_id, auth.uid())
  );

-- Enrolled students can view announcements for classrooms they belong to
CREATE POLICY "Students view enrolled classroom announcements"
  ON public.classroom_announcements
  FOR SELECT
  TO public
  USING (
    public.is_classroom_member(classroom_id, auth.uid()) OR
    public.is_classroom_educator(classroom_id, auth.uid())
  );

-- Enable Realtime for classroom_announcements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'classroom_announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_announcements;
  END IF;
END $$;
