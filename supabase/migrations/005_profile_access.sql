-- Prerequisite: 001 -> 002 -> nested 003 -> 004.
-- Resolve the recursive profiles policy and restrict browser profile mutations.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_school_teacher(p_school_id TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'teacher' AND NOT p.is_blocked
      AND p.school_id <> '' AND p.school_id = p_school_id
  )
$$;
REVOKE ALL ON FUNCTION public.is_school_teacher(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_school_teacher(TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS "profiles: teacher read same school" ON public.profiles;
CREATE POLICY "profiles: teacher read same school" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_school_teacher(school_id));

-- Registration and protected fields are written only by the authenticated backend.
-- Keep own-profile name/grade edits compatible with existing own-update policies.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE(name, grade) ON public.profiles TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.violations, public.teacher_notifications,
  public.strike_resets FROM anon, authenticated;
GRANT ALL ON public.profiles, public.violations, public.teacher_notifications,
  public.strike_resets, public.student_gamification, public.gamification_events TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
