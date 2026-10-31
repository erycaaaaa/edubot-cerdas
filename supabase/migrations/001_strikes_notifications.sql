-- ============================================================
-- EduBuz Migration 001: Strikes, Violations & Notifications
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── 1. Ensure profiles table has required columns ──────────
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS strike_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_blocked     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS school_id      TEXT,
  ADD COLUMN IF NOT EXISTS grade          INTEGER,
  ADD COLUMN IF NOT EXISTS avatar         TEXT,
  ADD COLUMN IF NOT EXISTS role           TEXT NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS name           TEXT,
  ADD COLUMN IF NOT EXISTS email          TEXT;

-- Create profiles table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','parent')),
  school_id     TEXT NOT NULL DEFAULT '',
  grade         INTEGER,
  avatar        TEXT DEFAULT '🦁',
  strike_count  INTEGER NOT NULL DEFAULT 0,
  is_blocked    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. violations table (one row per detected bad-word event) ──
CREATE TABLE IF NOT EXISTS violations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      TEXT NOT NULL UNIQUE,        -- for idempotency
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id       TEXT NOT NULL,
  message         TEXT NOT NULL,
  detected_words  TEXT[] NOT NULL DEFAULT '{}',
  strike_level    INTEGER NOT NULL CHECK (strike_level BETWEEN 1 AND 3),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS violations_student_idx ON violations(student_id);
CREATE INDEX IF NOT EXISTS violations_school_idx  ON violations(school_id);
CREATE INDEX IF NOT EXISTS violations_req_idx     ON violations(request_id);

-- ─── 3. teacher_notifications table ─────────────────────────
CREATE TABLE IF NOT EXISTS teacher_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id    UUID REFERENCES violations(id) ON DELETE CASCADE,
  school_id       TEXT NOT NULL,
  student_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_name    TEXT NOT NULL,
  student_avatar  TEXT NOT NULL DEFAULT '🦁',
  strike_level    INTEGER NOT NULL CHECK (strike_level BETWEEN 1 AND 3),
  type            TEXT NOT NULL DEFAULT 'strike_warning',  -- 'strike_warning' | 'strike_critical'
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifs_school_idx ON teacher_notifications(school_id);
CREATE INDEX IF NOT EXISTS notifs_read_idx   ON teacher_notifications(is_read);

-- ─── 4. strike_resets audit table ───────────────────────────
CREATE TABLE IF NOT EXISTS strike_resets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id    UUID NOT NULL REFERENCES profiles(id),
  school_id     TEXT NOT NULL,
  reset_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT
);

-- ─── 5. Row Level Security ───────────────────────────────────

-- profiles: users can read their own; teachers read same school
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: own read"      ON profiles;
DROP POLICY IF EXISTS "profiles: own insert"    ON profiles;
DROP POLICY IF EXISTS "profiles: own update"    ON profiles;
DROP POLICY IF EXISTS "profiles: teacher read"  ON profiles;

CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: own insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Teachers can read profiles of same school
CREATE POLICY "profiles: teacher read same school"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.school_id = profiles.school_id
    )
  );

-- violations: student sees own; teacher sees same school
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "violations: student own"          ON violations;
DROP POLICY IF EXISTS "violations: teacher same school"  ON violations;

CREATE POLICY "violations: student own"
  ON violations FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "violations: teacher same school"
  ON violations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.school_id = violations.school_id
    )
  );

-- teacher_notifications: teachers read own school
ALTER TABLE teacher_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifs: teacher same school" ON teacher_notifications;
DROP POLICY IF EXISTS "notifs: teacher update"      ON teacher_notifications;

CREATE POLICY "notifs: teacher same school"
  ON teacher_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.school_id = teacher_notifications.school_id
    )
  );

CREATE POLICY "notifs: teacher update"
  ON teacher_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.school_id = teacher_notifications.school_id
    )
  );

-- strike_resets: teacher sees own school
ALTER TABLE strike_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resets: teacher same school" ON strike_resets;

CREATE POLICY "resets: teacher same school"
  ON strike_resets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'teacher'
        AND p.school_id = strike_resets.school_id
    )
  );

-- ─── 6. Updated_at trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

NOTIFY pgrst, 'reload schema';
