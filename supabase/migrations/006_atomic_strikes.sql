-- Atomic, owner-scoped strikes and school-scoped resets. Apply after 005.
BEGIN;
ALTER TABLE public.violations DROP CONSTRAINT IF EXISTS violations_request_id_key;
CREATE UNIQUE INDEX violations_student_request_uidx ON public.violations(student_id,request_id);

CREATE FUNCTION public.record_student_strike(p_student_id UUID,p_school_id TEXT,p_request_id TEXT,
  p_message TEXT,p_detected_words TEXT[]) RETURNS JSONB LANGUAGE plpgsql SET search_path='' AS $$
DECLARE p public.profiles%ROWTYPE; v public.violations%ROWTYPE; nid UUID;
  new_count INTEGER; severity TEXT;
BEGIN
  IF p_request_id IS NULL OR length(trim(p_request_id))=0 OR length(p_request_id)>200
    OR p_message IS NULL OR length(trim(p_message))=0 OR length(p_message)>10000 THEN
    RAISE EXCEPTION 'INVALID_STRIKE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id=p_student_id AND role='student'
    AND school_id=p_school_id FOR UPDATE;
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
    VALUES(p_request_id,p_student_id,p.school_id,p_message,coalesce(p_detected_words,'{}'),new_count)
    RETURNING * INTO v;
  UPDATE public.profiles SET strike_count=new_count,is_blocked=(new_count=3),updated_at=now() WHERE id=p_student_id;
  INSERT INTO public.teacher_notifications(violation_id,school_id,student_id,student_name,student_avatar,
    strike_level,type,title,description) VALUES(v.id,p.school_id,p.id,p.name,coalesce(p.avatar,'🦁'),
    new_count,CASE WHEN new_count=3 THEN 'strike_critical' ELSE 'strike_warning' END,
    'Peringatan '||severity||' - '||p.name,
    p.name||' menerima strike ke-'||new_count||' ('||severity||'). Kata terdeteksi: '||coalesce(array_to_string(p_detected_words,', '),''))
    RETURNING id INTO nid;
  RETURN jsonb_build_object('strikeLevel',new_count,'strikeCount',new_count,'isBlocked',new_count=3,'notificationId',nid);
END $$;

CREATE FUNCTION public.reset_student_strikes(p_student_id UUID,p_teacher_id UUID,p_school_id TEXT,p_notes TEXT)
RETURNS VOID LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF p_notes IS NOT NULL AND length(p_notes)>2000 THEN RAISE EXCEPTION 'INVALID_NOTES' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_teacher_id AND role='teacher' AND NOT is_blocked
    AND school_id=p_school_id AND school_id<>'' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEACHER_NOT_AUTHORIZED' USING ERRCODE='P0001'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_student_id AND role='student' AND school_id=p_school_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'STUDENT_NOT_FOUND' USING ERRCODE='P0001'; END IF;
  UPDATE public.profiles SET strike_count=0,is_blocked=false,updated_at=now() WHERE id=p_student_id;
  INSERT INTO public.strike_resets(student_id,teacher_id,school_id,notes)
    VALUES(p_student_id,p_teacher_id,p_school_id,p_notes);
END $$;

REVOKE ALL ON FUNCTION public.record_student_strike(UUID,TEXT,TEXT,TEXT,TEXT[]) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reset_student_strikes(UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_student_strike(UUID,TEXT,TEXT,TEXT,TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_student_strikes(UUID,UUID,TEXT,TEXT) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
