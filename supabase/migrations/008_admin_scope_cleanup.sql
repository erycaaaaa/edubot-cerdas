BEGIN;

-- Admin scope cleanup: teacher block/unblock is intentionally removed from the API.
-- Keep profiles.is_blocked because it is part of the student safety/strike mechanism.
-- Recreate the existing admin RPC without the teacher_status mutation branch.
CREATE OR REPLACE FUNCTION public.admin_manage(p_actor UUID,p_action TEXT,p_target TEXT,p_data JSONB) RETURNS JSONB
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

NOTIFY pgrst,'reload schema';
COMMIT;
