import { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseService';
import { getGamification } from '../services/gamificationService';

export async function getSchoolClasses(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (user.role !== 'headmaster') {
      res.status(403).json({ error: 'Akses hanya untuk kepala sekolah.' });
      return;
    }

    const { data: classes, error } = await supabaseAdmin
      .from('classes')
      .select('id, name, grade, teacher_id, school_id, created_at, updated_at')
      .eq('school_id', user.schoolId)
      .order('grade', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch school classes', details: error.message });
      return;
    }

    res.json({ success: true, data: classes || [] });
  } catch (error: any) {
    console.error('Headmaster getSchoolClasses error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function getSchoolStudents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (user.role !== 'headmaster') {
      res.status(403).json({ error: 'Akses hanya untuk kepala sekolah.' });
      return;
    }

    const { data: students, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, school_id, grade, avatar, strike_count, is_blocked, updated_at')
      .eq('school_id', user.schoolId)
      .eq('role', 'student')
      .order('name', { ascending: true });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch school students', details: error.message });
      return;
    }

    res.json({ success: true, data: students || [] });
  } catch (error: any) {
    console.error('Headmaster getSchoolStudents error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function getSchoolTeachers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (user.role !== 'headmaster') {
      res.status(403).json({ error: 'Akses hanya untuk kepala sekolah.' });
      return;
    }

    const { data: teachers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, school_id, grade, avatar, is_blocked, updated_at')
      .eq('school_id', user.schoolId)
      .eq('role', 'teacher')
      .order('name', { ascending: true });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch school teachers', details: error.message });
      return;
    }

    res.json({ success: true, data: teachers || [] });
  } catch (error: any) {
    console.error('Headmaster getSchoolTeachers error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function getSchoolDashboard(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (user.role !== 'headmaster') {
      res.status(403).json({ error: 'Akses hanya untuk kepala sekolah.' });
      return;
    }

    const [classesResult, studentsResult, teachersResult, notificationsResult] = await Promise.all([
      supabaseAdmin.from('classes').select('id').eq('school_id', user.schoolId),
      supabaseAdmin.from('profiles').select('id').eq('school_id', user.schoolId).eq('role', 'student'),
      supabaseAdmin.from('profiles').select('id').eq('school_id', user.schoolId).eq('role', 'teacher'),
      supabaseAdmin.from('teacher_notifications').select('id').eq('school_id', user.schoolId),
    ]);

    const error = [classesResult, studentsResult, teachersResult, notificationsResult].find((entry) => entry.error);
    if (error) {
      res.status(500).json({ error: 'Failed to load school dashboard', details: error.error?.message });
      return;
    }

    res.json({
      success: true,
      data: {
        schoolId: user.schoolId,
        counts: {
          classes: classesResult.data?.length ?? 0,
          students: studentsResult.data?.length ?? 0,
          teachers: teachersResult.data?.length ?? 0,
          notifications: notificationsResult.data?.length ?? 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Headmaster getSchoolDashboard error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function getSchoolStudentChatHistory(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { studentId } = req.params;

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (user.role !== 'headmaster') {
      res.status(403).json({ error: 'Akses hanya untuk kepala sekolah.' });
      return;
    }

    const { data: targetStudent, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('id, school_id, role')
      .eq('id', studentId)
      .maybeSingle();

    if (lookupError || !targetStudent || targetStudent.school_id !== user.schoolId || targetStudent.role !== 'student') {
      res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
      return;
    }

    const { data: history, error: historyError } = await supabaseAdmin
      .from('chat_history')
      .select('id, role, content, request_id, session_id, is_violation, created_at')
      .eq('student_id', studentId)
      .eq('school_id', user.schoolId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (historyError) {
      res.status(500).json({ error: 'Failed to fetch student chat history', details: historyError.message });
      return;
    }

    res.json({ success: true, data: history || [] });
  } catch (error: any) {
    console.error('Headmaster getSchoolStudentChatHistory error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export async function getSchoolStudentGamification(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { studentId } = req.params;

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (user.role !== 'headmaster') {
      res.status(403).json({ error: 'Akses hanya untuk kepala sekolah.' });
      return;
    }

    const { data: targetStudent, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('id, school_id, role')
      .eq('id', studentId)
      .maybeSingle();

    if (lookupError || !targetStudent || targetStudent.school_id !== user.schoolId || targetStudent.role !== 'student') {
      res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
      return;
    }

    const gamification = await getGamification(studentId);
    res.json({ success: true, data: gamification });
  } catch (error: any) {
    console.error('Headmaster getSchoolStudentGamification error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
