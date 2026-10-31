-- ============================================================
-- EduBuz Migration 003
-- Profile + Strikes + Violations + Notifications
-- + Gamification
--
-- Jalankan di:
-- Supabase Dashboard > SQL Editor
-- ============================================================


-- ============================================================
-- 1. PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  email TEXT NOT NULL,

  name TEXT NOT NULL,

  role TEXT NOT NULL DEFAULT 'student'
    CHECK (
      role IN (
        'student',
        'teacher',
        'parent'
      )
    ),

  school_id TEXT NOT NULL DEFAULT '',

  grade INTEGER,

  avatar TEXT DEFAULT '🦁',

  strike_count INTEGER NOT NULL DEFAULT 0
    CHECK (strike_count >= 0),

  is_blocked BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. TAMBAHKAN KOLOM KE PROFILES JIKA TABLE SUDAH ADA
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT
    NOT NULL DEFAULT 'student';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_id TEXT
    NOT NULL DEFAULT '';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grade INTEGER;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar TEXT
    DEFAULT '🦁';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strike_count INTEGER
    NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN
    NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
    NOT NULL DEFAULT now();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
    NOT NULL DEFAULT now();


-- ============================================================
-- 3. NORMALISASI DATA LAMA
-- ============================================================

UPDATE public.profiles
SET strike_count = 0
WHERE strike_count IS NULL;

UPDATE public.profiles
SET is_blocked = false
WHERE is_blocked IS NULL;

UPDATE public.profiles
SET school_id = ''
WHERE school_id IS NULL;

UPDATE public.profiles
SET avatar = '🦁'
WHERE avatar IS NULL;

UPDATE public.profiles
SET role = 'student'
WHERE role IS NULL;


-- ============================================================
-- 4. STRIKES / VIOLATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.violations (
  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  request_id TEXT NOT NULL UNIQUE,

  student_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  school_id TEXT NOT NULL,

  message TEXT NOT NULL,

  detected_words TEXT[] NOT NULL
    DEFAULT '{}',

  strike_level INTEGER NOT NULL
    CHECK (
      strike_level BETWEEN 1 AND 3
    ),

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT now()
);


CREATE INDEX IF NOT EXISTS
  violations_student_idx
ON public.violations(student_id);


CREATE INDEX IF NOT EXISTS
  violations_school_idx
ON public.violations(school_id);


CREATE INDEX IF NOT EXISTS
  violations_request_idx
ON public.violations(request_id);


-- ============================================================
-- 5. TEACHER NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.teacher_notifications (
  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  violation_id UUID
    REFERENCES public.violations(id)
    ON DELETE CASCADE,

  school_id TEXT NOT NULL,

  student_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  student_name TEXT NOT NULL,

  student_avatar TEXT NOT NULL
    DEFAULT '🦁',

  strike_level INTEGER NOT NULL
    CHECK (
      strike_level BETWEEN 1 AND 3
    ),

  type TEXT NOT NULL
    DEFAULT 'strike_warning',

  title TEXT NOT NULL,

  description TEXT NOT NULL,

  is_read BOOLEAN NOT NULL
    DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT now()
);


CREATE INDEX IF NOT EXISTS
  teacher_notifications_school_idx
ON public.teacher_notifications(school_id);


CREATE INDEX IF NOT EXISTS
  teacher_notifications_read_idx
ON public.teacher_notifications(is_read);


CREATE INDEX IF NOT EXISTS
  teacher_notifications_student_idx
ON public.teacher_notifications(student_id);


-- ============================================================
-- 6. STRIKE RESET AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.strike_resets (
  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  teacher_id UUID NOT NULL
    REFERENCES public.profiles(id),

  school_id TEXT NOT NULL,

  reset_at TIMESTAMPTZ NOT NULL
    DEFAULT now(),

  notes TEXT
);


CREATE INDEX IF NOT EXISTS
  strike_resets_student_idx
ON public.strike_resets(student_id);


CREATE INDEX IF NOT EXISTS
  strike_resets_teacher_idx
ON public.strike_resets(teacher_id);


-- ============================================================
-- 7. STUDENT GAMIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_gamification (
  student_id UUID PRIMARY KEY
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  xp INTEGER NOT NULL DEFAULT 0
    CHECK (xp >= 0),

  level INTEGER NOT NULL DEFAULT 1
    CHECK (level >= 1),

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT now()
);


CREATE INDEX IF NOT EXISTS
  student_gamification_student_idx
ON public.student_gamification(student_id);


-- ============================================================
-- 8. GAMIFICATION EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gamification_events (
  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  student_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  event_type TEXT NOT NULL,

  request_id TEXT,

  reward_delta INTEGER NOT NULL
    DEFAULT 0,

  xp_after INTEGER NOT NULL
    DEFAULT 0
    CHECK (xp_after >= 0),

  moderation_label TEXT
    CHECK (
      moderation_label IN (
        'SAFE',
        'UNSAFE'
      )
    ),

  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT now()
);


CREATE INDEX IF NOT EXISTS
  gamification_events_student_idx
ON public.gamification_events(student_id);


CREATE INDEX IF NOT EXISTS
  gamification_events_created_idx
ON public.gamification_events(created_at DESC);


CREATE INDEX IF NOT EXISTS
  gamification_events_type_idx
ON public.gamification_events(event_type);


-- ============================================================
-- 9. IDEMPOTENCY GAMIFICATION
-- ============================================================
--
-- Satu request yang sama + event yang sama
-- tidak boleh tersimpan dua kali.
--

CREATE UNIQUE INDEX IF NOT EXISTS
  gamification_events_request_type_uidx
ON public.gamification_events(
  student_id,
  request_id,
  event_type
)
WHERE request_id IS NOT NULL;


-- ============================================================
-- 10. UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- 11. PROFILE UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS
  profiles_updated_at
ON public.profiles;


CREATE TRIGGER
  profiles_updated_at
BEFORE UPDATE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION
  public.handle_updated_at();


-- ============================================================
-- 12. GAMIFICATION UPDATED_AT TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS
  student_gamification_updated_at
ON public.student_gamification;


CREATE TRIGGER
  student_gamification_updated_at
BEFORE UPDATE
ON public.student_gamification
FOR EACH ROW
EXECUTE FUNCTION
  public.handle_updated_at();


-- ============================================================
-- 13. ENABLE RLS
-- ============================================================

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.violations
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.teacher_notifications
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.strike_resets
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.student_gamification
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gamification_events
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 14. PROFILES RLS
-- ============================================================

DROP POLICY IF EXISTS
  "profiles own read"
ON public.profiles;

CREATE POLICY
  "profiles own read"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
);

DROP POLICY IF EXISTS
  "profiles own insert"
ON public.profiles;

CREATE POLICY
  "profiles own insert"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id
);

DROP POLICY IF EXISTS
  "profiles own update"
ON public.profiles;

CREATE POLICY
  "profiles own update"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id
);


-- ============================================================
-- 15. VIOLATIONS RLS
-- ============================================================

DROP POLICY IF EXISTS
  "violations student own"
ON public.violations;

CREATE POLICY
  "violations student own"
ON public.violations
FOR SELECT
USING (
  student_id = auth.uid()
);


-- ============================================================
-- 16. TEACHER NOTIFICATIONS RLS
-- ============================================================

DROP POLICY IF EXISTS
  "teacher notifications own school"
ON public.teacher_notifications;

CREATE POLICY
  "teacher notifications own school"
ON public.teacher_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'teacher'
      AND p.school_id =
          teacher_notifications.school_id
  )
);


DROP POLICY IF EXISTS
  "teacher notifications update"
ON public.teacher_notifications;

CREATE POLICY
  "teacher notifications update"
ON public.teacher_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'teacher'
      AND p.school_id =
          teacher_notifications.school_id
  )
);


-- ============================================================
-- 17. STRIKE RESET RLS
-- ============================================================

DROP POLICY IF EXISTS
  "strike resets own school"
ON public.strike_resets;

CREATE POLICY
  "strike resets own school"
ON public.strike_resets
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'teacher'
      AND p.school_id =
          strike_resets.school_id
  )
);


-- ============================================================
-- 18. GAMIFICATION RLS
-- ============================================================

DROP POLICY IF EXISTS
  "gamification own read"
ON public.student_gamification;

CREATE POLICY
  "gamification own read"
ON public.student_gamification
FOR SELECT
USING (
  auth.uid() = student_id
);


DROP POLICY IF EXISTS
  "gamification events own read"
ON public.gamification_events;

CREATE POLICY
  "gamification events own read"
ON public.gamification_events
FOR SELECT
USING (
  auth.uid() = student_id
);


-- ============================================================
-- 19. PROFILE CHECK CONSTRAINT
-- ============================================================
--
-- Karena profiles mungkin sudah ada sebelumnya,
-- tambahkan constraint hanya jika memungkinkan.
--

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'profiles_role_check'
      AND conrelid =
        'public.profiles'::regclass
  ) THEN

    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (
      role IN (
        'student',
        'teacher',
        'parent'
      )
    );

  END IF;
END
$$;


-- ============================================================
-- 20. PROFILE STRIKE CHECK
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'profiles_strike_count_check'
      AND conrelid =
        'public.profiles'::regclass
  ) THEN

    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_strike_count_check
    CHECK (
      strike_count >= 0
    );

  END IF;
END
$$;


-- ============================================================
-- 21. GAMIFICATION EVENT CHECK
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'gamification_events_moderation_label_check'
      AND conrelid =
        'public.gamification_events'::regclass
  ) THEN

    ALTER TABLE public.gamification_events
    ADD CONSTRAINT
      gamification_events_moderation_label_check
    CHECK (
      moderation_label IS NULL
      OR moderation_label IN (
        'SAFE',
        'UNSAFE'
      )
    );

  END IF;
END
$$;


-- ============================================================
-- 22. CREATE INITIAL GAMIFICATION RECORDS
-- ============================================================
--
-- Semua student yang sudah ada mendapatkan:
-- XP = 0
-- Level = 1
--

INSERT INTO public.student_gamification (
  student_id,
  xp,
  level
)
SELECT
  p.id,
  0,
  1
FROM public.profiles p
WHERE p.role = 'student'
ON CONFLICT (student_id)
DO NOTHING;


-- ============================================================
-- 23. RELOAD SUPABASE POSTGREST SCHEMA
-- ============================================================

NOTIFY pgrst, 'reload schema';