-- ============================================================
-- StudyQuiz — Timer Migration & Quiz Attempts Fix
-- Run this in the Supabase SQL editor to fix the scoring bug
-- ============================================================

-- 1. Add missing RLS policy so the score can actually be updated when you finish a quiz
CREATE POLICY "Users can update own quiz attempts"
  ON quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- 2. Add columns to track the new timer feature metrics
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS timer_duration_seconds INTEGER;
