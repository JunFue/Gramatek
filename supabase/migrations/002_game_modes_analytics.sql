-- ============================================================
-- Migration 002: Game Modes, Per-Card Timers, Analytics & Notifications
-- ============================================================

-- 1. Add game mode columns to quizzes
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS game_mode TEXT NOT NULL DEFAULT 'mastery'
    CHECK (game_mode IN ('mastery', 'scheduled', 'survival', 'live_arena', 'team_clash')),
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS scoring_method TEXT DEFAULT 'highest'
    CHECK (scoring_method IN ('highest', 'average')),
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS survival_strikes INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS streak_multiplier BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT false;

-- 2. Add per-card timer override to quiz_cards
ALTER TABLE public.quiz_cards
  ADD COLUMN IF NOT EXISTS time_limit_override INTEGER DEFAULT NULL;

-- 3. Add game-mode-specific columns to quiz_attempts
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'mastery',
  ADD COLUMN IF NOT EXISTS streak_max INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eliminated_at_card INTEGER DEFAULT NULL;

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications."
  ON notifications FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can update their own notifications."
  ON notifications FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "System can insert notifications."
  ON notifications FOR INSERT
  WITH CHECK ( true );

-- Index for fast notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read)
  WHERE is_read = false;

-- Index for scheduled quiz lookups
CREATE INDEX IF NOT EXISTS idx_quizzes_scheduled
  ON public.quizzes (game_mode, scheduled_start, scheduled_end)
  WHERE game_mode = 'scheduled';

-- Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
