-- ============================================================
-- Migration 003: Classroom Management & Moderation Policies
-- ============================================================

-- Allow educators to remove members from their own classrooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'classroom_members' 
    AND policyname = 'Educators can remove members from their classrooms.'
  ) THEN
    CREATE POLICY "Educators can remove members from their classrooms."
      ON public.classroom_members FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.classrooms c
          WHERE c.id = classroom_id AND c.educator_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow students to leave classrooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'classroom_members' 
    AND policyname = 'Students can leave classrooms.'
  ) THEN
    CREATE POLICY "Students can leave classrooms."
      ON public.classroom_members FOR DELETE
      USING ( auth.uid() = student_id );
  END IF;
END $$;
