-- ============================================================
-- Migration 007: Expand Supported Quiz Card Types
-- ============================================================

-- 1. Drop old constraint restricting question_type to only ('multiple_choice', 'fill_blank', 'enumeration')
ALTER TABLE public.quiz_cards 
  DROP CONSTRAINT IF EXISTS quiz_cards_question_type_check;

-- 2. Add new constraint supporting all 6 interactive card types
ALTER TABLE public.quiz_cards 
  ADD CONSTRAINT quiz_cards_question_type_check 
  CHECK (question_type IN (
    'multiple_choice', 
    'fill_blank', 
    'enumeration', 
    'word_scramble', 
    'true_false', 
    'sentence_scramble'
  ));
