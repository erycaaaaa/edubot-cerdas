-- ==============================================================================
-- Migration 010: Teacher School-Wide Access & RBAC Consolidation
-- ==============================================================================
-- Purpose:
-- 1. Ensure all teachers in the same school (school_id) can view ALL students
--    (Kelas 1-6), all classes, and all notifications in their school without
--    being restricted to assigned classes (reversing regression from migration 009).
-- 2. Consolidate RLS policies on profiles, classes, class_students, violations,
--    teacher_notifications, strike_resets, gamification, and chat_history.
-- 3. Maintain tenant isolation: no cross-school access.
-- 4. Maintain student isolation: students read only own data.
-- 5. Safe and idempotent.
-- ==============================================================================

BEGIN;

-- 1. Consolidate helper functions with active school check
CREATE OR REPLACE FUNCTION public.is_school_teacher(p_school_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.schools s ON s.id = p.school_id
    WHERE p.id = auth.uid()
      AND p.role = 'teacher'
      AND NOT p.is_blocked
      AND s.is_active
      AND p.school_id = p_school_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_headmaster_of_school(p_school_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.schools s ON s.id = p.school_id
    WHERE p.id = auth.uid()
      AND p.role = 'headmaster'
      AND NOT p.is_blocked
      AND s.is_active
      AND p.school_id = p_school_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_school_teacher(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_headmaster_of_school(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_school_teacher(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_headmaster_of_school(TEXT) TO authenticated, service_role;

-- 2. CLASSES: All teachers & headmasters of the school can read all classes in the school
DROP POLICY IF EXISTS "classes: teacher or headmaster read" ON public.classes;
CREATE POLICY "classes: teacher or headmaster read"
  ON public.classes
  FOR SELECT
  TO authenticated
  USING (
    public.is_school_teacher(school_id)
    OR public.is_headmaster_of_school(school_id)
    OR EXISTS (
      SELECT 1
      FROM public.class_students cs
      WHERE cs.class_id = classes.id
        AND cs.student_id = auth.uid()
    )
  );

-- 3. CLASS_STUDENTS: All teachers & headmasters of the school can read class enrollments
DROP POLICY IF EXISTS "class_students: teacher or headmaster read" ON public.class_students;
CREATE POLICY "class_students: teacher or headmaster read"
  ON public.class_students
  FOR SELECT
  TO authenticated
  USING (
    public.is_school_teacher(school_id)
    OR public.is_headmaster_of_school(school_id)
    OR student_id = auth.uid()
  );

-- 4. PROFILES: Remove assigned-class restriction for teachers; allow school-wide read
DROP POLICY IF EXISTS "profiles: teacher access assigned class" ON public.profiles;
DROP POLICY IF EXISTS "profiles: teacher read same school" ON public.profiles;
CREATE POLICY "profiles: teacher read same school"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_school_teacher(school_id)
    OR public.is_headmaster_of_school(school_id)
  );

-- 5. VIOLATIONS: Teachers & headmaster can read violations of all students in their school
DROP POLICY IF EXISTS "violations: teacher assigned class" ON public.violations;
DROP POLICY IF EXISTS "violations: teacher same school" ON public.violations;
CREATE POLICY "violations: teacher same school"
  ON public.violations
  FOR SELECT
  TO authenticated
  USING (
    public.is_school_teacher(school_id)
    OR public.is_headmaster_of_school(school_id)
  );

-- 6. TEACHER_NOTIFICATIONS: School-wide read and update for teachers & headmaster
DROP POLICY IF EXISTS "notifs: teacher assigned class" ON public.teacher_notifications;
DROP POLICY IF EXISTS "notifs: teacher assigned class update" ON public.teacher_notifications;
DROP POLICY IF EXISTS "notifs: teacher same school" ON public.teacher_notifications;
DROP POLICY IF EXISTS "notifs: teacher same school update" ON public.teacher_notifications;

CREATE POLICY "notifs: teacher same school"
  ON public.teacher_notifications
  FOR SELECT
  TO authenticated
  USING (
    public.is_school_teacher(school_id)
    OR public.is_headmaster_of_school(school_id)
  );

CREATE POLICY "notifs: teacher same school update"
  ON public.teacher_notifications
  FOR UPDATE
  TO authenticated
  USING (
    public.is_school_teacher(school_id)
    OR public.is_headmaster_of_school(school_id)
  )
  WITH CHECK (
    public.is_school_teacher(school_id)
    OR public.is_headmaster_of_school(school_id)
  );

-- 7. STRIKE_RESETS: School-wide read for teachers & headmaster
DROP POLICY IF EXISTS "resets: teacher assigned class" ON public.strike_resets;
DROP POLICY IF EXISTS "resets: teacher same school" ON public.strike_resets;
CREATE POLICY "resets: teacher same school"
  ON public.strike_resets
  FOR SELECT
  TO authenticated
  USING (
    public.is_school_teacher(school_id)
    OR public.is_headmaster_of_school(school_id)
  );

-- 8. GAMIFICATION & AVATARS: Staff read for same school students
DROP POLICY IF EXISTS "student_gamification: staff read same school" ON public.student_gamification;
CREATE POLICY "student_gamification: staff read same school"
  ON public.student_gamification
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = student_gamification.student_id
        AND (public.is_school_teacher(p.school_id) OR public.is_headmaster_of_school(p.school_id))
    )
  );

DROP POLICY IF EXISTS "gamification_events: staff read same school" ON public.gamification_events;
CREATE POLICY "gamification_events: staff read same school"
  ON public.gamification_events
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = gamification_events.student_id
        AND (public.is_school_teacher(p.school_id) OR public.is_headmaster_of_school(p.school_id))
    )
  );

DROP POLICY IF EXISTS "user_avatars: staff read same school" ON public.user_avatars;
CREATE POLICY "user_avatars: staff read same school"
  ON public.user_avatars
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_avatars.user_id
        AND (public.is_school_teacher(p.school_id) OR public.is_headmaster_of_school(p.school_id))
    )
  );

-- 9. CHAT_HISTORY: Ensure DDL and school-scoped RLS policies exist
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  request_id TEXT,
  session_id TEXT,
  is_violation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_history_student_idx ON public.chat_history(student_id);
CREATE INDEX IF NOT EXISTS chat_history_school_idx ON public.chat_history(school_id);
CREATE INDEX IF NOT EXISTS chat_history_created_idx ON public.chat_history(created_at);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_history: student own read" ON public.chat_history;
CREATE POLICY "chat_history: student own read"
  ON public.chat_history
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "chat_history: staff read same school" ON public.chat_history;
CREATE POLICY "chat_history: staff read same school"
  ON public.chat_history
  FOR SELECT
  TO authenticated
  USING (
    public.is_school_teacher(school_id)
    OR public.is_headmaster_of_school(school_id)
  );

REVOKE INSERT, UPDATE, DELETE ON public.chat_history FROM anon, authenticated;
GRANT SELECT ON public.chat_history TO authenticated;
GRANT ALL ON public.chat_history TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

