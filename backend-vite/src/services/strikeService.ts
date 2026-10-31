import { supabaseAdmin } from './supabaseService';

export interface StrikeResult {
  strikeLevel: 1 | 2 | 3;
  strikeCount: number;
  isBlocked: boolean;
  notificationId: string;
}

export interface AddStrikeParams {
  requestId: string;
  studentId: string;
  schoolId: string;
  studentName: string;
  studentAvatar: string;
  message: string;
  detectedWords: string[];
}


export class StrikeAccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Profile increment, violation and teacher notification are one transaction.
export async function addStrike(params: AddStrikeParams): Promise<StrikeResult> {
  const { data, error } = await supabaseAdmin.rpc('record_student_strike', {
    p_student_id: params.studentId, p_school_id: params.schoolId,
    p_request_id: params.requestId, p_message: params.message,
    p_detected_words: params.detectedWords,
  });
  if (error) throw new Error('Failed to persist strike: ' + error.message);
  return data as StrikeResult;
}

export interface ResetStrikeParams {
  studentId: string;
  teacherId: string;
  schoolId: string;
  notes?: string;
}

// SQL verifies the current teacher/school and commits the reset with its audit.
export async function resetStrikes(params: ResetStrikeParams): Promise<void> {
  const { error } = await supabaseAdmin.rpc('reset_student_strikes', {
    p_student_id: params.studentId, p_teacher_id: params.teacherId,
    p_school_id: params.schoolId, p_notes: params.notes ?? null,
  });
  if (error?.message === 'STUDENT_NOT_FOUND') throw new StrikeAccessError(404, 'Siswa tidak ditemukan di sekolah ini.');
  if (error?.message === 'TEACHER_NOT_AUTHORIZED') throw new StrikeAccessError(403, 'Tidak berwenang mereset strike.');
  if (error) throw new Error('Failed to reset strikes: ' + error.message);
}

export async function getStudentStrikeInfo(
  studentId: string,
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from('profiles')
    .select(
      'strike_count, is_blocked',
    )
    .eq(
      'id',
      studentId,
    )
    .single();

  if (
    error ||
    !data
  ) {
    throw new Error(
      `Profile not found: ${
        error?.message ??
        'unknown error'
      }`,
    );
  }

  return {
    strikeCount:
      Math.min(
        Math.max(
          Number(
            data.strike_count ?? 0,
          ),
          0,
        ),
        3,
      ),

    isBlocked:
      Boolean(
        data.is_blocked,
      ),
  };
}