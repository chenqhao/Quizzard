-- ============================================================
-- StudyQuiz — Friends, Leaderboard, Timer & Mail Migration
-- Run this in the Supabase SQL editor AFTER the base schema
-- ============================================================

-- ============================================================
-- 1. PROFILES — Add friend_code column
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;

-- Generate friend codes for existing users who don't have one
CREATE OR REPLACE FUNCTION generate_friend_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'SQ-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE friend_code = code) INTO exists_already;
    IF NOT exists_already THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Set friend codes for existing profiles
UPDATE profiles SET friend_code = generate_friend_code() WHERE friend_code IS NULL;

-- Update the handle_new_user trigger to also generate friend_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, friend_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    generate_friend_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. FRIENDSHIPS TABLE (must be created BEFORE policies that reference it)
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Users can update friendships"
  ON friendships FOR UPDATE USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

CREATE POLICY "Users can delete friendships"
  ON friendships FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- ============================================================
-- 3. PROFILES — Update SELECT policy (now that friendships table exists)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view friends profiles"
  ON profiles FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND friend_id = profiles.id)
        OR (friend_id = auth.uid() AND user_id = profiles.id)
      )
    )
  );

-- ============================================================
-- 4. QUIZ ATTEMPTS — Add timer columns + friend visibility
-- ============================================================
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS timer_duration_seconds INTEGER;

DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;

CREATE POLICY "Friends can view quiz attempts"
  ON quiz_attempts FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND (
        (friendships.user_id = auth.uid() AND friendships.friend_id = quiz_attempts.user_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = quiz_attempts.user_id)
      )
    )
  );

-- ============================================================
-- 5. QUIZ MAIL — For sharing quizzes between users
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_mail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  question_ids JSONB NOT NULL DEFAULT '[]',
  subject_name TEXT,
  scope TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  share_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quiz_mail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view received mail"
  ON quiz_mail FOR SELECT USING (
    auth.uid() = recipient_id OR auth.uid() = sender_id
  );

CREATE POLICY "Users can send mail"
  ON quiz_mail FOR INSERT WITH CHECK (
    auth.uid() = sender_id
  );

CREATE POLICY "Users can update own mail"
  ON quiz_mail FOR UPDATE USING (
    auth.uid() = recipient_id
  );

CREATE POLICY "Users can delete own mail"
  ON quiz_mail FOR DELETE USING (
    auth.uid() = recipient_id OR auth.uid() = sender_id
  );

CREATE INDEX IF NOT EXISTS idx_quiz_mail_recipient ON quiz_mail(recipient_id);
CREATE INDEX IF NOT EXISTS idx_quiz_mail_sender ON quiz_mail(sender_id);

-- ============================================================
-- 6. SHARED QUIZ CODES — For public quiz import by anyone
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_quiz_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE SET NULL,
  question_ids JSONB NOT NULL DEFAULT '[]',
  import_code TEXT UNIQUE NOT NULL,
  subject_name TEXT,
  scope TEXT,
  total_questions INTEGER DEFAULT 0,
  times_imported INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shared_quiz_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared codes"
  ON shared_quiz_codes FOR SELECT USING (true);

CREATE POLICY "Users can create shared codes"
  ON shared_quiz_codes FOR INSERT WITH CHECK (
    auth.uid() = creator_id
  );

CREATE POLICY "Users can update own shared codes"
  ON shared_quiz_codes FOR UPDATE USING (
    auth.uid() = creator_id
  );

CREATE POLICY "Users can delete own shared codes"
  ON shared_quiz_codes FOR DELETE USING (
    auth.uid() = creator_id
  );

CREATE INDEX IF NOT EXISTS idx_shared_quiz_codes_import ON shared_quiz_codes(import_code);
CREATE INDEX IF NOT EXISTS idx_shared_quiz_codes_creator ON shared_quiz_codes(creator_id);

-- ============================================================
-- 7. INDEXES for profiles friend_code
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON profiles(friend_code);
