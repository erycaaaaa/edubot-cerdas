"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchoolClasses = getSchoolClasses;
exports.getSchoolStudents = getSchoolStudents;
exports.getSchoolTeachers = getSchoolTeachers;
exports.getSchoolDashboard = getSchoolDashboard;
exports.getSchoolStudentChatHistory = getSchoolStudentChatHistory;
exports.getSchoolStudentGamification = getSchoolStudentGamification;
const supabaseService_1 = require("../services/supabaseService");
const gamificationService_1 = require("../services/gamificationService");
async function getSchoolClasses(req, res) {
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
        const { data: classes, error } = await supabaseService_1.supabaseAdmin
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
    }
    catch (error) {
        console.error('Headmaster getSchoolClasses error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
async function getSchoolStudents(req, res) {
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
        const { data: students, error } = await supabaseService_1.supabaseAdmin
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
    }
    catch (error) {
        console.error('Headmaster getSchoolStudents error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
async function getSchoolTeachers(req, res) {
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
        const { data: teachers, error } = await supabaseService_1.supabaseAdmin
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
    }
    catch (error) {
        console.error('Headmaster getSchoolTeachers error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
async function getSchoolDashboard(req, res) {
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
            supabaseService_1.supabaseAdmin.from('classes').select('id').eq('school_id', user.schoolId),
            supabaseService_1.supabaseAdmin.from('profiles').select('id').eq('school_id', user.schoolId).eq('role', 'student'),
            supabaseService_1.supabaseAdmin.from('profiles').select('id').eq('school_id', user.schoolId).eq('role', 'teacher'),
            supabaseService_1.supabaseAdmin.from('teacher_notifications').select('id').eq('school_id', user.schoolId),
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
    }
    catch (error) {
        console.error('Headmaster getSchoolDashboard error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
async function getSchoolStudentChatHistory(req, res) {
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
        console.error('Headmaster getSchoolStudentChatHistory error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
async function getSchoolStudentGamification(req, res) {
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
        console.error('Headmaster getSchoolStudentGamification error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
