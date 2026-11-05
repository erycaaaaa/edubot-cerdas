"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClasses = getClasses;
exports.getStudents = getStudents;
exports.getNotifications = getNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.handleResetStudentStrikes = handleResetStudentStrikes;
exports.getStudentChatHistory = getStudentChatHistory;
exports.getStudentGamification = getStudentGamification;
const supabaseService_1 = require("../services/supabaseService");
const strikeService_1 = require("../services/strikeService");
const gamificationService_1 = require("../services/gamificationService");
/**
 * GET /api/teacher/classes
 *
 * Mengambil seluruh kelas di sekolah guru (school-wide),
 * tidak dibatasi oleh penugasan wali kelas (teacher_id).
 */
async function getClasses(req, res) {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { data: classes, error } = await supabaseService_1.supabaseAdmin
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
    }
    catch (error) {
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
async function getStudents(req, res) {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { data: students, error } = await supabaseService_1.supabaseAdmin
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
    }
    catch (error) {
        console.error('Teacher getStudents error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
/**
 * GET /api/teacher/notifications
 *
 * Mengambil notifikasi pelanggaran siswa di sekolah guru (school-wide).
 */
async function getNotifications(req, res) {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { data: notifications, error } = await supabaseService_1.supabaseAdmin
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
    }
    catch (error) {
        console.error('Teacher getNotifications error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
/**
 * PATCH /api/teacher/notifications/:id/read
 *
 * Menandai notifikasi telah dibaca, divalidasi berdasarkan school_id.
 */
async function markNotificationRead(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { data: notification, error: lookupError } = await supabaseService_1.supabaseAdmin
            .from('teacher_notifications')
            .select('id, student_id, school_id')
            .eq('id', id)
            .eq('school_id', user.schoolId)
            .maybeSingle();
        if (lookupError || !notification) {
            res.status(404).json({ error: 'Notification not found' });
            return;
        }
        const { error } = await supabaseService_1.supabaseAdmin
            .from('teacher_notifications')
            .update({ is_read: true })
            .eq('id', id)
            .eq('school_id', user.schoolId);
        if (error) {
            res.status(500).json({ error: 'Failed to update notification', details: error.message });
            return;
        }
        res.json({ success: true, message: 'Notification marked as read' });
    }
    catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
/**
 * PATCH /api/teacher/notifications/read-all
 *
 * Menandai semua notifikasi di sekolah yang sama telah dibaca.
 */
async function markAllNotificationsRead(req, res) {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { error } = await supabaseService_1.supabaseAdmin
            .from('teacher_notifications')
            .update({ is_read: true })
            .eq('school_id', user.schoolId)
            .eq('is_read', false);
        if (error) {
            res.status(500).json({ error: 'Failed to update notifications', details: error.message });
            return;
        }
        res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (error) {
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
async function handleResetStudentStrikes(req, res) {
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
        const { data: targetStudent, error: studentLookupError } = await supabaseService_1.supabaseAdmin
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
        await (0, strikeService_1.resetStrikes)({
            studentId,
            teacherId: user.id,
            schoolId: user.schoolId,
            notes,
        });
        res.json({ success: true, message: 'Student strikes reset successfully' });
    }
    catch (error) {
        if (error instanceof strikeService_1.StrikeAccessError) {
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
async function getStudentChatHistory(req, res) {
    try {
        const user = req.user;
        const { studentId } = req.params;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { data: targetStudent, error: lookupError } = await supabaseService_1.supabaseAdmin
            .from('profiles')
            .select('id, school_id, role')
            .eq('id', studentId)
            .maybeSingle();
        if (lookupError || !targetStudent || targetStudent.school_id !== user.schoolId || targetStudent.role !== 'student') {
            res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
            return;
        }
        const { data: history, error: historyError } = await supabaseService_1.supabaseAdmin
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
    }
    catch (error) {
        console.error('Teacher getStudentChatHistory error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
/**
 * GET /api/teacher/students/:studentId/gamification
 *
 * Mengambil detail XP, level, dan progres gamifikasi siswa di sekolah yang sama.
 */
async function getStudentGamification(req, res) {
    try {
        const user = req.user;
        const { studentId } = req.params;
        if (!user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { data: targetStudent, error: lookupError } = await supabaseService_1.supabaseAdmin
            .from('profiles')
            .select('id, school_id, role')
            .eq('id', studentId)
            .maybeSingle();
        if (lookupError || !targetStudent || targetStudent.school_id !== user.schoolId || targetStudent.role !== 'student') {
            res.status(404).json({ error: 'Siswa tidak ditemukan di sekolah ini.' });
            return;
        }
        const gamification = await (0, gamificationService_1.getGamification)(studentId);
        res.json({ success: true, data: gamification });
    }
    catch (error) {
        console.error('Teacher getStudentGamification error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
