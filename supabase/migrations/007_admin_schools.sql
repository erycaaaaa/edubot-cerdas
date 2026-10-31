-- Apply after 006. Keep legacy school identifiers; no domain-based assignment for new users.
BEGIN;
CREATE TABLE public.schools (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
 code TEXT NOT NULL UNIQUE CHECK (length(code) BETWEEN 1 AND 64),
 is_active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Preserve historical grouping exactly. Admin should rename/review imported groups.
INSERT INTO public.schools(id,name,code)
 SELECT school_id, left(school_id,120), 'LEGACY-'||md5(school_id)
 FROM public.profiles WHERE school_id IS NOT NULL AND school_id<>'' GROUP BY school_id;
ALTER TABLE public.profiles ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN school_id DROP DEFAULT;
UPDATE public.profiles SET school_id=NULL WHERE school_id='';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_school_fk FOREIGN KEY(school_id) REFERENCES public.schools(id);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK(role IN ('student','teacher','parent','admin'));
CREATE TRIGGER schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TABLE public.teacher_invitations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL, school_id TEXT NOT NULL REFERENCES public.schools(id),
 user_id UUID UNIQUE REFERENCES public.profiles(id), invited_by UUID NOT NULL REFERENCES public.profiles(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed','accepted')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), accepted_at TIMESTAMPTZ
);
-- Reward and strike audit records have incompatible ownership/event contracts.
CREATE TABLE public.admin_audit_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID NOT NULL REFERENCES public.profiles(id),
 action TEXT NOT NULL, target_id TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schools,public.teacher_invitations,public.admin_audit_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.schools,public.teacher_invitations,public.admin_audit_events TO service_role;
CREATE OR REPLACE FUNCTION public.is_school_teacher(p_school_id TEXT) RETURNS BOOLEAN
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.schools s ON s.id=p.school_id
 WHERE p.id=auth.uid() AND p.role='teacher' AND NOT p.is_blocked AND s.is_active AND p.school_id=p_school_id)
$$;
DROP POLICY IF EXISTS "violations: teacher same school" ON public.violations;
CREATE POLICY "violations: teacher same school" ON public.violations FOR SELECT TO authenticated USING(public.is_school_teacher(school_id));
DROP POLICY IF EXISTS "notifs: teacher same school" ON public.teacher_notifications;
CREATE POLICY "notifs: teacher same school" ON public.teacher_notifications FOR SELECT TO authenticated USING(public.is_school_teacher(school_id));
DROP POLICY IF EXISTS "teacher notifications own school" ON public.teacher_notifications;
DROP POLICY IF EXISTS "teacher notifications update" ON public.teacher_notifications;
DROP POLICY IF EXISTS "strike resets own school" ON public.strike_resets;
DROP POLICY IF EXISTS "notifs: teacher update" ON public.teacher_notifications;
DROP POLICY IF EXISTS "resets: teacher same school" ON public.strike_resets;
CREATE POLICY "resets: teacher same school" ON public.strike_resets FOR SELECT TO authenticated USING(public.is_school_teacher(school_id));

-- Invoker RPC: only the backend service role can call; actor is revalidated under a lock.
-- Every database mutation and its audit entry commit together.
CREATE FUNCTION public.admin_manage(p_actor UUID,p_action TEXT,p_target TEXT,p_data JSONB) RETURNS JSONB
 LANGUAGE plpgsql SET search_path='' AS $$
DECLARE result JSONB; target TEXT:=p_target; inv public.teacher_invitations%ROWTYPE;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_actor AND role='admin' AND NOT is_blocked FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 IF p_action='school_create' THEN
  INSERT INTO public.schools(name,code) VALUES(p_data->>'name',p_data->>'code') RETURNING to_jsonb(schools.*),id INTO result,target;
 ELSIF p_action='school_update' THEN
  UPDATE public.schools SET name=coalesce(p_data->>'name',name),code=coalesce(p_data->>'code',code),
   is_active=coalesce((p_data->>'is_active')::boolean,is_active) WHERE id=target RETURNING to_jsonb(schools.*) INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'SCHOOL_NOT_FOUND'; END IF;
 ELSIF p_action IN ('teacher_school','invite_prepare') THEN
  PERFORM 1 FROM public.schools WHERE id=p_data->>'school_id' AND is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SCHOOL_UNAVAILABLE'; END IF;
  IF p_action='teacher_school' THEN
   UPDATE public.profiles SET school_id=p_data->>'school_id' WHERE id=target::uuid AND role='teacher' RETURNING to_jsonb(profiles.*) INTO result;
   IF NOT FOUND THEN RAISE EXCEPTION 'TEACHER_NOT_FOUND'; END IF;
   UPDATE public.teacher_invitations SET school_id=p_data->>'school_id' WHERE user_id=target::uuid;
  ELSE
   PERFORM pg_advisory_xact_lock(hashtextextended(lower(p_data->>'email'),0));
   IF EXISTS(SELECT 1 FROM public.profiles WHERE lower(email)=lower(p_data->>'email')) THEN RAISE EXCEPTION 'EMAIL_EXISTS'; END IF;
   INSERT INTO public.teacher_invitations(email,name,school_id,invited_by)
    VALUES(lower(p_data->>'email'),p_data->>'name',p_data->>'school_id',p_actor)
    RETURNING to_jsonb(teacher_invitations.*),id::text INTO result,target;
  END IF;
 ELSIF p_action='teacher_status' THEN
  UPDATE public.profiles SET is_blocked=(p_data->>'is_blocked')::boolean WHERE id=target::uuid AND role='teacher' RETURNING to_jsonb(profiles.*) INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEACHER_NOT_FOUND'; END IF;
 ELSIF p_action IN ('invite_finish','invite_failed') THEN
  SELECT * INTO inv FROM public.teacher_invitations WHERE id=target::uuid AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVITATION_NOT_PENDING'; END IF;
  IF p_action='invite_finish' THEN
   PERFORM 1 FROM public.schools WHERE id=inv.school_id AND is_active FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'SCHOOL_UNAVAILABLE'; END IF;
   INSERT INTO public.profiles(id,email,name,role,school_id,is_blocked,strike_count)
    VALUES((p_data->>'user_id')::uuid,inv.email,inv.name,'teacher',inv.school_id,false,0);
   UPDATE public.teacher_invitations SET user_id=(p_data->>'user_id')::uuid,status='sent' WHERE id=inv.id RETURNING to_jsonb(teacher_invitations.*) INTO result;
  ELSE
   UPDATE public.teacher_invitations SET status='failed' WHERE id=inv.id RETURNING to_jsonb(teacher_invitations.*) INTO result;
  END IF;
 ELSE RAISE EXCEPTION 'INVALID_ADMIN_ACTION'; END IF;
 INSERT INTO public.admin_audit_events(actor_id,action,target_id,details) VALUES(p_actor,p_action,target,p_data-'user_id');
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_manage(UUID,TEXT,TEXT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage(UUID,TEXT,TEXT,JSONB) TO service_role;
CREATE FUNCTION public.accept_teacher_invitation(p_user UUID) RETURNS VOID LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_user AND role='teacher' AND NOT is_blocked FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'TEACHER_NOT_FOUND'; END IF;
 UPDATE public.teacher_invitations SET status='accepted',accepted_at=now() WHERE user_id=p_user AND status='sent';
 IF FOUND THEN INSERT INTO public.admin_audit_events(actor_id,action,target_id) VALUES(p_user,'invite_accepted',p_user::text); END IF;
END $$;
REVOKE ALL ON FUNCTION public.accept_teacher_invitation(UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_teacher_invitation(UUID) TO service_role;
CREATE OR REPLACE FUNCTION public.record_student_strike(p_student_id UUID,p_school_id TEXT,p_request_id TEXT,
  p_message TEXT,p_detected_words TEXT[]) RETURNS JSONB LANGUAGE plpgsql SET search_path='' AS $$
DECLARE p public.profiles%ROWTYPE; v public.violations%ROWTYPE; nid UUID;
  new_count INTEGER; severity TEXT;
BEGIN
  IF p_request_id IS NULL OR length(trim(p_request_id))=0 OR length(p_request_id)>200
    OR p_message IS NULL OR length(trim(p_message))=0 OR length(p_message)>10000 THEN
    RAISE EXCEPTION 'INVALID_STRIKE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id=p_student_id AND role='student'
    AND school_id IS NOT DISTINCT FROM nullif(p_school_id,'') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'STUDENT_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  SELECT * INTO v FROM public.violations WHERE student_id=p_student_id AND request_id=p_request_id;
  IF FOUND THEN
    SELECT id INTO nid FROM public.teacher_notifications WHERE violation_id=v.id ORDER BY created_at LIMIT 1;
    RETURN jsonb_build_object('strikeLevel',v.strike_level,'strikeCount',p.strike_count,
      'isBlocked',p.is_blocked,'notificationId',coalesce(nid::text,''));
  END IF;
  IF p.is_blocked OR p.strike_count>=3 THEN
    RETURN jsonb_build_object('strikeLevel',3,'strikeCount',3,'isBlocked',true,'notificationId','');
  END IF;
  new_count:=least(p.strike_count+1,3);
  severity:=CASE new_count WHEN 1 THEN 'Ringan' WHEN 2 THEN 'Sedang' ELSE 'Berat' END;
  INSERT INTO public.violations(request_id,student_id,school_id,message,detected_words,strike_level)
    VALUES(p_request_id,p_student_id,coalesce(p.school_id,''),p_message,coalesce(p_detected_words,'{}'),new_count)
    RETURNING * INTO v;
  UPDATE public.profiles SET strike_count=new_count,is_blocked=(new_count=3),updated_at=now() WHERE id=p_student_id;
  INSERT INTO public.teacher_notifications(violation_id,school_id,student_id,student_name,student_avatar,
    strike_level,type,title,description) VALUES(v.id,coalesce(p.school_id,''),p.id,p.name,coalesce(p.avatar,'🦁'),
    new_count,CASE WHEN new_count=3 THEN 'strike_critical' ELSE 'strike_warning' END,
    'Peringatan '||severity||' - '||p.name,
    p.name||' menerima strike ke-'||new_count||' ('||severity||'). Kata terdeteksi: '||coalesce(array_to_string(p_detected_words,', '),''))
    RETURNING id INTO nid;
  RETURN jsonb_build_object('strikeLevel',new_count,'strikeCount',new_count,'isBlocked',new_count=3,'notificationId',nid);
END $$;


NOTIFY pgrst,'reload schema';
COMMIT;
