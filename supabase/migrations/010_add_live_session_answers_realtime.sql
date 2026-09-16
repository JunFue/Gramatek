-- ============================================================
-- Migration 010: Add live_session_answers to Realtime Publication
-- ============================================================

-- Ensure live_session_answers table is published to realtime subscribers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'live_session_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_answers;
  END IF;
END $$;

-- Set replica identity to full so update/delete CDC payload contains full row
ALTER TABLE public.live_session_answers REPLICA IDENTITY FULL;
