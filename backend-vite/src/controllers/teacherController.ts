import { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseService';
import { resetStrikes, StrikeAccessError } from '../services/strikeService';

async function getTeacherClassIds(teacherId: string, schoolId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('classes')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId);

  if (error) throw error;
  return (data ?? []).map((row: any) => row.id).filter(Boolean);
}

async function getTeacherStudentIds(teacherId: string, schoolId: string): Promise<string[]> {
  const classIds = await getTeacherClassIds(teacherId, schoolId);
  if (!classIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('class_students')
    .select('student_id')
    .in('class_id', classIds);

  if (error) throw error;
  return [...new Set((data ?? []).map((row: any) => row.student_id).filter(Boolean))];
}

async function ensureTeacherStudentAccess(teacherId: string, schoolId: string, studentId: string): Promise<boolean> {
  const studentIds = await getTeacherStudentIds(teacherId, schoolId);
  return studentIds.includes(studentId);
}

export async function getClasses(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { data: classes, error } = await supabaseAdmin
      .from('classes')
      .select('id, name, grade, teacher_id, school_id, created_at, updated_at')
      .eq('teacher_id', user.id)
      .eq('school_id', user.schoolId)
      .order('grade', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch classes', details: error.message });
      return;
    }

    res.json({ success: true, data: classes || [] });
  } catch (error: any) {
    console.error('Teacher getClasses error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const teacherClassIds = await getTeacherClassIds(user.id, user.schoolId);
    if (!teacherClassIds.length) {
      res.json({ success: true, data: [] });
      return;
    }

    const { data: classStudentRows, error: classStudentsError } = await supabaseAdmin
      .from('class_students')
      .select('student_id')
      .in('class_id', teacherClassIds);

    if (classStudentsError) {
      res.status(500).json({ error: 'Failed to fetch teacher class memberships', details: classStudentsError.message });
      return;
    }

    const studentIds = [...new Set((classStudentRows ?? []).map((row: any) => row.student_id).filter(Boolean))];
    if (!studentIds.length) {
      res.json({ success: true, data: [] });
      return;
    }

    const { data: students, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, school_id, grade, avatar, strike_count, is_blocked, updated_at')
      .eq('school_id', user.schoolId)
      .in('id', studentIds)
      .eq('role', 'student')
      .order('strike_count', { ascending: false });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch students', details: error.message });
      return;
    }

    res.json({ success: true, data: students || [] });
  } catch (error: any) {
    console.error('Teacher getStudents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const studentIds = await getTeacherStudentIds(user.id, user.schoolId);
    if (!studentIds.length) {
      res.json({ success: true, data: [] });
      return;
    }

    const { data: notifications, error } = await supabaseAdmin
      .from('teacher_notifications')
      .select('id, violation_id, school_id, student_id, student_name, student_avatar, strike_level, type, title, description, is_read, created_at')
      .eq('school_id', user.schoolId)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
      return;
    }

    res.json({ success: true, data: notifications || [] });
  } catch (error: any) {
    console.error('Teacher getNotifications error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { data: notification, error: lookupError } = await supabaseAdmin
      .from('teacher_notifications')
      .select('id, student_id, school_id')
      .eq('id', id)
      .eq('school_id', user.schoolId)
      .maybeSingle();

    if (lookupError || !notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const allowed = await ensureTeacherStudentAccess(user.id, user.schoolId, notification.student_id);
    if (!allowed) {
      res.status(403).json({ error: 'Tidak berwenang mengakses notifikasi ini.' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('teacher_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('school_id', user.schoolId);

    if (error) {
      res.status(500).json({ error: 'Failed to update notification', details: error.message });
      return;
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const studentIds = await getTeacherStudentIds(user.id, user.schoolId);
    if (!studentIds.length) {
      res.json({ success: true, message: 'No notifications to mark as read' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('teacher_notifications')
      .update({ is_read: true })
      .eq('school_id', user.schoolId)
      .in('student_id', studentIds)
      .eq('is_read', false);

    if (error) {
      res.status(500).json({ error: 'Failed to update notifications', details: error.message });
      return;
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function handleResetStudentStrikes(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { studentId } = req.params;
    const { notes, teacherId: _ignoredTeacherId } = req.body ?? {};

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!studentId || (notes != null && (typeof notes !== 'string' || notes.length > 2000))) {
      res.status(400).json({ error: 'Student ID wajib diisi dan catatan maksimal 2000 karakter.' });
      return;
    }

    const { data: targetStudent, error: studentLookupError } = await supabaseAdmin
      .from('profiles')
      .select('id, school_id')
      .eq('id', studentId)
      .maybeSingle();

    if (studentLookupError || !targetStudent) {
      res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
      return;
    }

    if (targetStudent.school_id !== user.schoolId) {
      res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
      return;
    }

    const allowed = await ensureTeacherStudentAccess(user.id, user.schoolId, studentId);
    if (!allowed) {
      res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
      return;
    }

    await resetStrikes({
      studentId,
      teacherId: user.id,
      schoolId: user.schoolId,
      notes,
    });

    res.json({ success: true, message: 'Student strikes reset successfully' });
  } catch (error: any) {
    if (error instanceof StrikeAccessError) { res.status(error.status).json({ error: error.message }); return; }
    console.error('Reset strikes error:', error);
    res.status(500).json({ error: 'Failed to reset strikes' });
  }
}
