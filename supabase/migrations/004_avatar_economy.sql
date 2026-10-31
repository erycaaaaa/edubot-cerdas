-- Prerequisite: 001, 002, and nested supabase/migrations/003_profile_gamification.sql.
-- XP remains lifetime earned XP. Spendable EXP = xp - exp_spent.
-- Apply before deploying the matching backend. No historical rewards are invented.
BEGIN;

ALTER TABLE public.student_gamification
  ADD COLUMN IF NOT EXISTS exp_spent INTEGER NOT NULL DEFAULT 0
  CHECK (exp_spent >= 0 AND exp_spent <= xp);

CREATE TABLE public.avatar_catalog (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{1,64}$'),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  cost_exp INTEGER NOT NULL CHECK (cost_exp >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.user_avatars (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatar_id TEXT NOT NULL REFERENCES public.avatar_catalog(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, avatar_id)
);
CREATE INDEX user_avatars_avatar_idx ON public.user_avatars(avatar_id);
ALTER TABLE public.profiles ADD COLUMN equipped_avatar_id TEXT;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_owned_avatar_fk
  FOREIGN KEY (id, equipped_avatar_id) REFERENCES public.user_avatars(user_id, avatar_id);

INSERT INTO public.avatar_catalog(id,name,description,emoji,cost_exp) VALUES
  ('lion','Lion','Avatar awal','🦁',0), ('panda','Panda','Avatar awal','🐼',0),
  ('fox','Fox','Avatar awal','🦊',0), ('frog','Frog','Avatar awal','🐸',0),
  ('unicorn','Unicorn','Avatar awal','🦄',0), ('koala','Koala','Avatar awal','🐨',0),
  ('butterfly','Butterfly','Avatar awal','🦋',0), ('turtle','Turtle','Avatar awal','🐢',0),
  ('runner','Runner','Semangat bergerak dan belajar','🏃',100),
  ('astronaut','Astronaut','Jelajahi pengetahuan baru','🧑‍🚀',250),
  ('dragon','Dragon','Teman petualangan belajarmu','🐉',500);

-- Preserve existing profile appearance and grant its matching starter avatar.
INSERT INTO public.user_avatars(user_id,avatar_id)
  SELECT p.id,a.id FROM public.profiles p JOIN public.avatar_catalog a
    ON a.emoji=p.avatar AND a.cost_exp=0;
UPDATE public.profiles p SET equipped_avatar_id=a.id
  FROM public.avatar_catalog a WHERE p.avatar=a.emoji AND a.cost_exp=0;

ALTER TABLE public.gamification_events ADD COLUMN exp_after INTEGER CHECK(exp_after >= 0);
ALTER TABLE public.gamification_events ADD COLUMN avatar_id TEXT REFERENCES public.avatar_catalog(id);
-- Migrate the existing vocabulary without discarding historical events.
ALTER TABLE public.gamification_events DROP CONSTRAINT IF EXISTS gamification_events_moderation_label_check;
UPDATE public.gamification_events SET moderation_label=CASE moderation_label
  WHEN 'SAFE' THEN 'NON_TOXIC' WHEN 'UNSAFE' THEN 'TOXIC' ELSE moderation_label END;
ALTER TABLE public.gamification_events ADD CONSTRAINT gamification_events_moderation_label_check
  CHECK(moderation_label IN ('NON_TOXIC','TOXIC'));

ALTER TABLE public.avatar_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY avatar_catalog_read ON public.avatar_catalog FOR SELECT TO authenticated USING (is_active);
CREATE POLICY user_avatars_own_read ON public.user_avatars FOR SELECT TO authenticated USING (user_id=auth.uid());
REVOKE ALL ON public.avatar_catalog, public.user_avatars FROM anon, authenticated;
GRANT SELECT ON public.avatar_catalog, public.user_avatars TO authenticated;
GRANT ALL ON public.avatar_catalog, public.user_avatars TO service_role;
-- RLS alone is not enough if an older deployment has permissive write policies.
REVOKE INSERT, UPDATE, DELETE ON public.student_gamification, public.gamification_events FROM anon, authenticated;

-- Existing own-profile policies must not provide an avatar/role bypass.
CREATE FUNCTION public.guard_profile_economy() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon','authenticated') THEN
    IF TG_OP='INSERT' THEN
      IF NEW.equipped_avatar_id IS NOT NULL OR NEW.avatar NOT IN ('🦁','🐼','🦊','🐸','🦄','🐨','🦋','🐢') THEN
        RAISE EXCEPTION 'Avatar selection requires the server' USING ERRCODE='42501';
      END IF;
    ELSIF NEW.avatar IS DISTINCT FROM OLD.avatar OR NEW.equipped_avatar_id IS DISTINCT FROM OLD.equipped_avatar_id
      OR NEW.role IS DISTINCT FROM OLD.role OR NEW.school_id IS DISTINCT FROM OLD.school_id
      OR NEW.strike_count IS DISTINCT FROM OLD.strike_count OR NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
      RAISE EXCEPTION 'Protected profile fields require the server' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_economy_guard BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_economy();

CREATE FUNCTION public.xp_level(p_xp INTEGER) RETURNS INTEGER LANGUAGE sql IMMUTABLE
SET search_path = '' AS $$ SELECT CASE WHEN p_xp>=1000 THEN 5 WHEN p_xp>=500 THEN 4
  WHEN p_xp>=250 THEN 3 WHEN p_xp>=100 THEN 2 ELSE 1 END $$;

-- Shared row lock serializes earning and spending for the same user.
-- SECURITY INVOKER + service_role-only EXECUTE: no browser can choose p_user_id or a reward.
CREATE FUNCTION public.credit_learning_reward(p_user_id UUID,p_request_id TEXT,p_event TEXT,
  p_delta INTEGER,p_label TEXT,p_reason TEXT) RETURNS JSONB LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE g public.student_gamification%ROWTYPE; old_event public.gamification_events%ROWTYPE;
BEGIN
  IF p_request_id IS NULL OR length(trim(p_request_id))=0 OR length(p_request_id)>200
    OR p_event IS NULL OR p_event NOT IN ('conversation_completed','helpful_feedback','challenge_completed','learning_milestone','safe_interaction')
    OR p_delta IS NULL OR p_delta<0 OR p_label IS NULL OR p_label NOT IN ('NON_TOXIC','TOXIC')
    OR (p_label='TOXIC' AND p_delta<>0) THEN
    RAISE EXCEPTION 'INVALID_REWARD' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.student_gamification(student_id,xp,level) VALUES(p_user_id,0,1) ON CONFLICT DO NOTHING;
  SELECT * INTO g FROM public.student_gamification WHERE student_id=p_user_id FOR UPDATE;
  SELECT * INTO old_event FROM public.gamification_events
    WHERE student_id=p_user_id AND request_id=p_request_id AND event_type=p_event;
  IF FOUND THEN
    RETURN jsonb_build_object('xp',g.xp,'level',g.level,'expBalance',g.xp-g.exp_spent,'rewardDelta',0,'duplicate',true);
  END IF;
  UPDATE public.student_gamification SET xp=xp+p_delta,level=public.xp_level(xp+p_delta),updated_at=now()
    WHERE student_id=p_user_id RETURNING * INTO g;
  INSERT INTO public.gamification_events(student_id,event_type,request_id,reward_delta,xp_after,exp_after,moderation_label,reason)
    VALUES(p_user_id,p_event,p_request_id,p_delta,g.xp,g.xp-g.exp_spent,p_label,p_reason);
  RETURN jsonb_build_object('xp',g.xp,'level',g.level,'expBalance',g.xp-g.exp_spent,'rewardDelta',p_delta,'duplicate',false);
END $$;

CREATE FUNCTION public.unlock_avatar(p_user_id UUID,p_avatar_id TEXT) RETURNS JSONB LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE a public.avatar_catalog%ROWTYPE; g public.student_gamification%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.avatar_catalog WHERE id=p_avatar_id FOR SHARE;
  IF NOT FOUND OR NOT a.is_active THEN RAISE EXCEPTION 'AVATAR_NOT_AVAILABLE' USING ERRCODE='P0001'; END IF;
  INSERT INTO public.student_gamification(student_id,xp,level) VALUES(p_user_id,0,1) ON CONFLICT DO NOTHING;
  SELECT * INTO g FROM public.student_gamification WHERE student_id=p_user_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.user_avatars WHERE user_id=p_user_id AND avatar_id=p_avatar_id) THEN
    RETURN jsonb_build_object('avatar',to_jsonb(a),'expSpent',0,'remainingExp',g.xp-g.exp_spent,'alreadyOwned',true);
  END IF;
  IF g.xp-g.exp_spent<a.cost_exp THEN RAISE EXCEPTION 'INSUFFICIENT_EXP' USING ERRCODE='P0001'; END IF;
  UPDATE public.student_gamification SET exp_spent=exp_spent+a.cost_exp,updated_at=now()
    WHERE student_id=p_user_id RETURNING * INTO g;
  INSERT INTO public.user_avatars(user_id,avatar_id) VALUES(p_user_id,p_avatar_id);
  INSERT INTO public.gamification_events(student_id,event_type,request_id,reward_delta,xp_after,exp_after,avatar_id,reason)
    VALUES(p_user_id,'avatar_unlocked','avatar:'||p_avatar_id,-a.cost_exp,g.xp,g.xp-g.exp_spent,p_avatar_id,'Unlocked Avatar: '||a.name);
  RETURN jsonb_build_object('avatar',to_jsonb(a),'expSpent',a.cost_exp,'remainingExp',g.xp-g.exp_spent,'alreadyOwned',false);
END $$;

CREATE FUNCTION public.equip_avatar(p_user_id UUID,p_avatar_id TEXT) RETURNS JSONB LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE a public.avatar_catalog%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.avatar_catalog WHERE id=p_avatar_id;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.user_avatars WHERE user_id=p_user_id AND avatar_id=p_avatar_id) THEN
    RAISE EXCEPTION 'AVATAR_NOT_OWNED' USING ERRCODE='P0001';
  END IF;
  -- Retired avatars may still be equipped by their existing owners.
  UPDATE public.profiles SET equipped_avatar_id=p_avatar_id,avatar=a.emoji WHERE id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  RETURN jsonb_build_object('avatar',a.emoji,'equippedAvatarId',a.id);
END $$;

REVOKE ALL ON FUNCTION public.credit_learning_reward(UUID,TEXT,TEXT,INTEGER,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.unlock_avatar(UUID,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.equip_avatar(UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.credit_learning_reward(UUID,TEXT,TEXT,INTEGER,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.unlock_avatar(UUID,TEXT),public.equip_avatar(UUID,TEXT) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
