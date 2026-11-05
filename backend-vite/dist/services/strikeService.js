"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrikeAccessError = void 0;
exports.addStrike = addStrike;
exports.resetStrikes = resetStrikes;
exports.getStudentStrikeInfo = getStudentStrikeInfo;
const supabaseService_1 = require("./supabaseService");
class StrikeAccessError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.StrikeAccessError = StrikeAccessError;
// Profile increment, violation and teacher notification are one transaction.
async function addStrike(params) {
    const { data, error } = await supabaseService_1.supabaseAdmin.rpc('record_student_strike', {
        p_student_id: params.studentId, p_school_id: params.schoolId,
        p_request_id: params.requestId, p_message: params.message,
        p_detected_words: params.detectedWords,
    });
    if (error)
        throw new Error('Failed to persist strike: ' + error.message);
    return data;
}
// SQL verifies the current teacher/school and commits the reset with its audit.
async function resetStrikes(params) {
    const { error } = await supabaseService_1.supabaseAdmin.rpc('reset_student_strikes', {
        p_student_id: params.studentId, p_teacher_id: params.teacherId,
        p_school_id: params.schoolId, p_notes: params.notes ?? null,
    });
    if (error?.message === 'STUDENT_NOT_FOUND')
        throw new StrikeAccessError(404, 'Siswa tidak ditemukan di sekolah ini.');
    if (error?.message === 'TEACHER_NOT_AUTHORIZED')
        throw new StrikeAccessError(403, 'Tidak berwenang mereset strike.');
    if (error)
        throw new Error('Failed to reset strikes: ' + error.message);
}
async function getStudentStrikeInfo(studentId) {
    const { data, error, } = await supabaseService_1.supabaseAdmin
        .from('profiles')
        .select('strike_count, is_blocked')
        .eq('id', studentId)
        .single();
    if (error ||
        !data) {
        throw new Error(`Profile not found: ${error?.message ??
            'unknown error'}`);
    }
    return {
        strikeCount: Math.min(Math.max(Number(data.strike_count ?? 0), 0), 3),
        isBlocked: Boolean(data.is_blocked),
    };
}
