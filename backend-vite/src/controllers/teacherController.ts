import { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseService';
import { resetStrikes, StrikeAccessError } from '../services/strikeService';
import { getGamification } from '../services/gamificationService';

/**
 * GET /api/teacher/classes
 *
 * Mengambil seluruh kelas di sekolah guru (school-wide),
 * tidak dibatasi oleh penugasan wali kelas (teacher_id).
 */
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

/**
 * GET /api/teacher/students
 *
 * Mengambil seluruh siswa di sekolah guru (school-wide, Kelas 1–6),
 * tanpa dibatasi oleh keanggotaan kelas atau penugasan guru.
 */
export async function getStudents(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { data: students, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, school_id, grade, avatar, strike_count, is_blocked, updated_at')
      .eq('school_id', user.schoolId)
      .eq('role', 'student')
      .order('strike_count', { ascending: false })
      .order('name', { ascending: true });

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

/**
 * GET /api/teacher/notifications
 *
 * Mengambil notifikasi pelanggaran siswa di sekolah guru (school-wide).
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { data: notifications, error } = await supabaseAdmin
      .from('teacher_notifications')
      .select('id, violation_id, school_id, student_id, student_name, student_avatar, strike_level, type, title, description, is_read, created_at')
      .eq('school_id', user.schoolId)
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

/**
 * PATCH /api/teacher/notifications/:id/read
 *
 * Menandai notifikasi telah dibaca, divalidasi berdasarkan school_id.
 */
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

/**
 * PATCH /api/teacher/notifications/read-all
 *
 * Menandai semua notifikasi di sekolah yang sama telah dibaca.
 */
export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('teacher_notifications')
      .update({ is_read: true })
      .eq('school_id', user.schoolId)
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

/**
 * POST /api/teacher/students/:studentId/reset-strikes
 *
 * Mereset strike siswa. Siswa harus berada di sekolah yang sama dengan guru.
 * Identitas guru diambil dari token terverifikasi (req.user.id), bukan body.
 */
export async function handleResetStudentStrikes(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { studentId } = req.params;
    const { notes } = req.body ?? {};

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
      .select('id, school_id, role')
      .eq('id', studentId)
      .maybeSingle();

    if (studentLookupError || !targetStudent) {
      res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
      return;
    }

    if (targetStudent.school_id !== user.schoolId || targetStudent.role !== 'student') {
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
    if (error instanceof StrikeAccessError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Reset strikes error:', error);
    res.status(500).json({ error: 'Failed to reset strikes' });
  }
}

/**
 * GET /api/teacher/students/:studentId/chat-history
 *
 * Mengambil riwayat percakapan chatbot siswa di sekolah yang sama.
 */
export async function getStudentChatHistory(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { studentId } = req.params;

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
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
      .order('created_at', { ascending: false })
      .limit(200);

    if (historyError) {
      res.status(500).json({ error: 'Failed to fetch student chat history', details: historyError.message });
      return;
    }

    res.json({ success: true, data: (history || []).reverse() });
  } catch (error: any) {
    console.error('Teacher getStudentChatHistory error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * GET /api/teacher/students/:studentId/gamification
 *
 * Mengambil detail XP, level, dan progres gamifikasi siswa di sekolah yang sama.
 */
export async function getStudentGamification(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { studentId } = req.params;

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
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
    console.error('Teacher getStudentGamification error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}


/**
 * GET /api/teacher/students/:studentId/strike-history
 * Mengambil histori pelanggaran dan reset tanpa menghapus rekam jejak.
 */
export async function getStudentStrikeHistory(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { studentId } = req.params;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, school_id, role')
      .eq('id', studentId)
      .maybeSingle();

    if (targetError || !target || target.school_id !== user.schoolId || target.role !== 'student') {
      res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
      return;
    }

    const [violationsResult, resetsResult] = await Promise.all([
      supabaseAdmin
        .from('violations')
        .select('id, message, detected_words, strike_level, created_at')
        .eq('student_id', studentId)
        .eq('school_id', user.schoolId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('strike_resets')
        .select('id, teacher_id, reset_at, notes, teacher:profiles!strike_resets_teacher_id_fkey(name)')
        .eq('student_id', studentId)
        .eq('school_id', user.schoolId)
        .order('reset_at', { ascending: false }),
    ]);

    if (violationsResult.error) {
      res.status(500).json({ error: 'Failed to fetch violations', details: violationsResult.error.message });
      return;
    }
    if (resetsResult.error) {
      res.status(500).json({ error: 'Failed to fetch strike reset history', details: resetsResult.error.message });
      return;
    }

    const resets = (resetsResult.data || []).map((row: any) => ({
      id: row.id,
      teacher_id: row.teacher_id,
      teacher_name: row.teacher?.name ?? null,
      reset_at: row.reset_at,
      notes: row.notes,
    }));

    res.json({
      success: true,
      data: {
        violations: violationsResult.data || [],
        resets,
      },
    });
  } catch (error: any) {
    console.error('Teacher getStudentStrikeHistory error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

/**
 * PATCH /api/teacher/students/:studentId/strike-resets/:resetId/notes
 * Memperbarui catatan pembinaan pada record reset yang dimiliki sekolah guru.
 */
export async function updateStrikeResetNotes(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { studentId, resetId } = req.params;
    const { notes } = req.body ?? {};

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    if (typeof notes !== 'string' || notes.length > 2000) {
      res.status(400).json({ error: 'Catatan wajib berupa teks maksimal 2000 karakter.' });
      return;
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, school_id, role')
      .eq('id', studentId)
      .maybeSingle();

    if (targetError || !target || target.school_id !== user.schoolId || target.role !== 'student') {
      res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
      return;
    }

    const { data: reset, error: resetLookupError } = await supabaseAdmin
      .from('strike_resets')
      .select('id')
      .eq('id', resetId)
      .eq('student_id', studentId)
      .eq('school_id', user.schoolId)
      .maybeSingle();

    if (resetLookupError || !reset) {
      res.status(404).json({ error: 'Riwayat reset tidak ditemukan.' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('strike_resets')
      .update({ notes: notes.trim() || null })
      .eq('id', resetId)
      .eq('student_id', studentId)
      .eq('school_id', user.schoolId);

    if (error) {
      res.status(500).json({ error: 'Gagal menyimpan catatan pembinaan.', details: error.message });
      return;
    }

    res.json({ success: true, message: 'Catatan pembinaan berhasil diperbarui.' });
  } catch (error: any) {
    console.error('Teacher updateStrikeResetNotes error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}


/**
 * GET /api/teacher/reports
 * Ringkasan laporan sekolah untuk dashboard guru. Semua query dibatasi school_id.
 */
export async function getTeacherReports(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    const thirtyDaysAgo = new Date(startOfToday);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

    const [studentsResult, chatsResult, violationsResult, resetsResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, name, grade, strike_count, is_blocked')
        .eq('school_id', user.schoolId)
        .eq('role', 'student'),
      supabaseAdmin
        .from('chat_history')
        .select('student_id, role, session_id, created_at')
        .eq('school_id', user.schoolId)
        .eq('role', 'user')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(10000),
      supabaseAdmin
        .from('violations')
        .select('student_id, strike_level, created_at')
        .eq('school_id', user.schoolId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(10000),
      supabaseAdmin
        .from('strike_resets')
        .select('id')
        .eq('school_id', user.schoolId)
        .gte('reset_at', thirtyDaysAgo.toISOString()),
    ]);

    const firstError = studentsResult.error || chatsResult.error || violationsResult.error || resetsResult.error;
    if (firstError) {
      console.error('Teacher reports query error:', firstError);
      res.status(500).json({ error: 'Gagal mengambil data laporan.', details: firstError.message });
      return;
    }

    const students = studentsResult.data || [];
    const chats = chatsResult.data || [];
    const violations = violationsResult.data || [];
    const resets = resetsResult.data || [];
    const studentIds = students.map((student: any) => student.id);

    let xpTotal = 0;
    if (studentIds.length > 0) {
      const { data: gamificationRows, error: gamificationError } = await supabaseAdmin
        .from('student_gamification')
        .select('student_id, xp')
        .in('student_id', studentIds);
      if (gamificationError) {
        console.error('Teacher reports gamification query error:', gamificationError);
        res.status(500).json({ error: 'Gagal mengambil data XP laporan.', details: gamificationError.message });
        return;
      }
      xpTotal = (gamificationRows || []).reduce((sum: number, row: any) => sum + Number(row.xp || 0), 0);
    }

    const dayKeys: string[] = [];
    const daily = new Map<string, { messages: number; violations: number }>();
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(sevenDaysAgo);
      day.setUTCDate(day.getUTCDate() + offset);
      const key = day.toISOString().slice(0, 10);
      dayKeys.push(key);
      daily.set(key, { messages: 0, violations: 0 });
    }

    const activeStudentIds = new Set<string>();
    chats.forEach((chat: any) => {
      const key = String(chat.created_at).slice(0, 10);
      const bucket = daily.get(key);
      if (bucket) bucket.messages += 1;
      if (chat.student_id) activeStudentIds.add(chat.student_id);
    });
    violations.forEach((violation: any) => {
      const key = String(violation.created_at).slice(0, 10);
      const bucket = daily.get(key);
      if (bucket) bucket.violations += 1;
    });

    const gradeMap = new Map<string, number>();
    const strikeMap = new Map<number, number>([[0, 0], [1, 0], [2, 0], [3, 0]]);
    students.forEach((student: any) => {
      const grade = student.grade ? `Kelas ${student.grade}` : 'Belum diatur';
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
      const strike = Math.max(0, Math.min(3, Number(student.strike_count || 0)));
      strikeMap.set(strike, (strikeMap.get(strike) || 0) + 1);
    });

    const violationLevels = [1, 2, 3].map((level) => ({
      level,
      count: violations.filter((item: any) => Number(item.strike_level) === level).length,
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalStudents: students.length,
          activeStudents: activeStudentIds.size,
          messagesThisWeek: chats.length,
          violationsThisMonth: violations.length,
          resetsThisMonth: resets.length,
          totalXp: xpTotal,
          blockedStudents: students.filter((student: any) => Boolean(student.is_blocked)).length,
        },
        weeklyActivity: dayKeys.map((date) => ({
          date,
          label: new Date(`${date}T00:00:00Z`).toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'UTC' }),
          messages: daily.get(date)?.messages || 0,
          violations: daily.get(date)?.violations || 0,
        })),
        gradeDistribution: Array.from(gradeMap.entries()).map(([grade, count]) => ({ grade, count })),
        strikeDistribution: Array.from(strikeMap.entries()).map(([level, count]) => ({ level, count })),
        violationLevels,
        generatedAt: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Teacher getTeacherReports error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
