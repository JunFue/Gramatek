-- ============================================================
-- Migration 006: Feedback Timing & Reveal Settings
-- ============================================================

-- 1. Add feedback_timing column to quizzes
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS feedback_timing TEXT NOT NULL DEFAULT 'immediate'
    CHECK (feedback_timing IN ('immediate', 'delayed'));

-- Index for feedback timing lookups if needed
CREATE INDEX IF NOT EXISTS idx_quizzes_feedback_timing
  ON public.quizzes (feedback_timing);
