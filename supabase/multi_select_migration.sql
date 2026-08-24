-- ============================================================
-- StudyQuiz — Multi-Select Migration
-- Run this in the Supabase SQL editor AFTER the base schema
-- ============================================================

-- Add is_multi_select column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_multi_select BOOLEAN DEFAULT false;
