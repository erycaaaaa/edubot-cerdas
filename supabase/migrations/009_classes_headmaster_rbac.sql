BEGIN;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'teacher', 'headmaster', 'parent', 'admin'));

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  grade TEXT NOT NULL CHECK (length(trim(grade)) > 0),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, school_id, name, grade)
);

CREATE TABLE IF NOT EXISTS public.class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS classes_teacher_idx ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS classes_school_idx ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS class_students_class_idx ON public.class_students(class_id);
CREATE INDEX IF NOT EXISTS class_students_student_idx ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS class_students_school_idx ON public.class_students(school_id);

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
    WHERE p.id = auth.uid()
      AND p.role = 'headmaster'
      AND p.school_id = p_school_id
      AND NOT p.is_blocked
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = p_class_id
      AND c.teacher_id = auth.uid()
  );
$$;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classes: teacher or headmaster read" ON public.classes;
CREATE POLICY "classes: teacher or headmaster read"
  ON public.classes
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_headmaster_of_school(school_id)
    OR EXISTS (
      SELECT 1
      FROM public.class_students cs
      WHERE cs.class_id = classes.id
        AND cs.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "classes: headmaster manage" ON public.classes;
CREATE POLICY "classes: headmaster manage"
  ON public.classes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_headmaster_of_school(school_id));

CREATE POLICY "classes: headmaster update"
  ON public.classes
  FOR UPDATE
  TO authenticated
  USING (public.is_headmaster_of_school(school_id))
  WITH CHECK (public.is_headmaster_of_school(school_id));

CREATE POLICY "classes: headmaster delete"
  ON public.classes
  FOR DELETE
  TO authenticated
  USING (public.is_headmaster_of_school(school_id));

DROP POLICY IF EXISTS "class_students: teacher or headmaster read" ON public.class_students;
CREATE POLICY "class_students: teacher or headmaster read"
  ON public.class_students
  FOR SELECT
  TO authenticated
  USING (
    public.is_headmaster_of_school(school_id)
    OR EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = class_students.class_id
        AND c.teacher_id = auth.uid()
    )
    OR student_id = auth.uid()
  );

CREATE POLICY "class_students: headmaster manage"
  ON public.class_students
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_headmaster_of_school(school_id));

CREATE POLICY "class_students: headmaster update"
  ON public.class_students
  FOR UPDATE
  TO authenticated
  USING (public.is_headmaster_of_school(school_id))
  WITH CHECK (public.is_headmaster_of_school(school_id));

CREATE POLICY "class_students: headmaster delete"
  ON public.class_students
  FOR DELETE
  TO authenticated
  USING (public.is_headmaster_of_school(school_id));

DROP POLICY IF EXISTS "profiles: teacher access assigned class" ON public.profiles;
CREATE POLICY "profiles: teacher access assigned class"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_headmaster_of_school(school_id)
    OR EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.student_id = profiles.id
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profiles: headmaster manage same school" ON public.profiles;
CREATE POLICY "profiles: headmaster manage same school"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_headmaster_of_school(school_id))
  WITH CHECK (public.is_headmaster_of_school(school_id));

DROP POLICY IF EXISTS "violations: teacher same school" ON public.violations;
CREATE POLICY "violations: teacher assigned class"
  ON public.violations
  FOR SELECT
  TO authenticated
  USING (
    public.is_headmaster_of_school(school_id)
    OR EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.student_id = violations.student_id
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "notifs: teacher same school" ON public.teacher_notifications;
CREATE POLICY "notifs: teacher assigned class"
  ON public.teacher_notifications
  FOR SELECT
  TO authenticated
  USING (
    public.is_headmaster_of_school(school_id)
    OR EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.student_id = teacher_notifications.student_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "notifs: teacher assigned class update"
  ON public.teacher_notifications
  FOR UPDATE
  TO authenticated
  USING (
    public.is_headmaster_of_school(school_id)
    OR EXISTS (
      SELECT 1
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.student_id = teacher_notifications.student_id
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "resets: teacher same school" ON public.strike_resets;
CREATE POLICY "resets: teacher assigned class"
  ON public.strike_resets
  FOR SELECT
  TO authenticated
  USING (
    public.is_headmaster_of_school(school_id)
    OR teacher_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.ensure_class_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.school_id IS NULL OR NEW.school_id = '' THEN
    RAISE EXCEPTION 'CLASS_SCHOOL_REQUIRED';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = NEW.teacher_id
      AND p.role IN ('teacher', 'headmaster')
      AND p.school_id = NEW.school_id
  ) THEN
    RAISE EXCEPTION 'CLASS_TEACHER_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classes_membership_guard ON public.classes;
CREATE TRIGGER classes_membership_guard
BEFORE INSERT OR UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.ensure_class_membership();

CREATE OR REPLACE FUNCTION public.ensure_student_in_school_class()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.school_id IS NULL OR NEW.school_id = '' THEN
    RAISE EXCEPTION 'CLASS_STUDENT_SCHOOL_REQUIRED';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = NEW.student_id
      AND p.role = 'student'
      AND p.school_id = NEW.school_id
  ) THEN
    RAISE EXCEPTION 'STUDENT_SCHOOL_MISMATCH';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = NEW.class_id
      AND c.school_id = NEW.school_id
  ) THEN
    RAISE EXCEPTION 'CLASS_SCHOOL_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS class_students_membership_guard ON public.class_students;
CREATE TRIGGER class_students_membership_guard
BEFORE INSERT OR UPDATE ON public.class_students
FOR EACH ROW EXECUTE FUNCTION public.ensure_student_in_school_class();

NOTIFY pgrst, 'reload schema';
COMMIT;
