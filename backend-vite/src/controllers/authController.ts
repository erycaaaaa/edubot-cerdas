
import { Request, Response } from 'express';

import {
  createLoginClient,
  supabaseAdmin,
} from '../services/supabaseService';

export { requireAuth, requireRole } from '../middleware/auth';
export type { AuthUser } from '../middleware/auth';

const STARTER_AVATARS = [
  '🦁',
  '🐼',
  '🦊',
  '🐸',
  '🦄',
  '🐨',
  '🦋',
  '🐢',
] as const;

type UserRole = 'student' | 'teacher' | 'parent';

function getRequestId(res: Response): string {
  return res.locals.requestId || 'unknown';
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');

  if (!name || !domain) {
    return 'invalid-email';
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

function logAuth(
  level: 'info' | 'warn' | 'error',
  message: string,
  res: Response,
  details: Record<string, unknown> = {},
): void {
  const logData = {
    requestId: getRequestId(res),
    timestamp: new Date().toISOString(),
    message,
    ...details,
  };

  if (level === 'error') {
    console.error('[AUTH]', logData);
  } else if (level === 'warn') {
    console.warn('[AUTH]', logData);
  } else {
    console.log('[AUTH]', logData);
  }
}

function getSupabaseError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') {
    return {
      message: String(error),
    };
  }

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    status?: number;
  };

  return {
    code: candidate.code,
    message: candidate.message,
    details: candidate.details,
    hint: candidate.hint,
    status: candidate.status,
  };
}

export async function registerUser(
  req: Request,
  res: Response,
): Promise<void> {
  const body = req.body ?? {};

  const {
    email,
    password,
    name,
    role,
    grade,
    avatar,
  } = body;

  logAuth('info', 'Registration request received', res, {
    email: typeof email === 'string' ? maskEmail(email) : undefined,
    requestedRole: role ?? 'default',
  });

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof name !== 'string' ||
    !email.trim() ||
    !password ||
    !name.trim()
  ) {
    logAuth('warn', 'Registration validation failed: missing fields', res);

    res.status(400).json({
      message: 'Email, password, dan nama harus diisi.',
    });
    return;
  }

  if (
    Object.prototype.hasOwnProperty.call(body, 'schoolId') ||
    Object.prototype.hasOwnProperty.call(body, 'school_id')
  ) {
    logAuth('warn', 'Registration rejected: school assignment is restricted', res);

    res.status(400).json({
      message: 'Penempatan sekolah hanya dapat dilakukan pengelola.',
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  const validEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  if (
    !validEmail ||
    normalizedEmail.length > 254 ||
    normalizedName.length > 100 ||
    password.length < 8
  ) {
    logAuth('warn', 'Registration validation failed: invalid input', res, {
      validEmail,
      nameLength: normalizedName.length,
      passwordLengthValid: password.length >= 8,
    });

    res.status(400).json({
      message: 'Gunakan email valid, nama maksimal 100 karakter, dan password minimal 8 karakter.',
    });
    return;
  }

  if (role === 'teacher' || role === 'headmaster') {
    logAuth('warn', 'Registration rejected: privileged role', res, {
      requestedRole: role,
    });

    res.status(403).json({
      message: 'Akun guru dan kepala sekolah harus dibuat oleh administrator sekolah. Hubungi sekolah untuk mendapatkan akses.',
    });
    return;
  }

  if (
    role != null &&
    role !== 'student' &&
    role !== 'parent'
  ) {
    logAuth('warn', 'Registration validation failed: invalid role', res, {
      requestedRole: role,
    });

    res.status(400).json({
      message: 'Peran akun tidak valid.',
    });
    return;
  }

  if (
    avatar != null &&
    !STARTER_AVATARS.includes(
      avatar as typeof STARTER_AVATARS[number],
    )
  ) {
    logAuth('warn', 'Registration validation failed: invalid avatar', res);

    res.status(400).json({
      message: 'Pilih avatar awal yang tersedia.',
    });
    return;
  }

  const userRole: UserRole =
    role === 'parent' ? 'parent' : 'student';

  const numericGrade =
    grade == null || grade === ''
      ? null
      : Number(grade);

  const profileGrade =
    numericGrade !== null && Number.isFinite(numericGrade)
      ? numericGrade
      : null;

  if (
    numericGrade !== null &&
    (
      !Number.isInteger(numericGrade) ||
      numericGrade < 1 ||
      numericGrade > 12
    )
  ) {
    logAuth('warn', 'Registration validation failed: invalid grade', res, {
      grade,
    });

    res.status(400).json({
      message: 'Kelas harus berupa angka 1 sampai 12.',
    });
    return;
  }

  const selectedAvatar = avatar ?? '🦁';

  let createdUserId: string | null = null;

  try {
    logAuth('info', 'Registration validation successful', res, {
      email: maskEmail(normalizedEmail),
      role: userRole,
      grade: profileGrade,
    });

    logAuth('info', 'Creating Supabase Auth user', res);

    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: normalizedName,
          role: userRole,
          grade: profileGrade,
          avatar: selectedAvatar,
        },
      });

    if (error || !data.user) {
      logAuth('error', 'Supabase Auth user creation failed', res, {
        error: getSupabaseError(error),
      });

      res.status(400).json({
        message: error?.message ?? 'Gagal membuat akun.',
      });
      return;
    }

    createdUserId = data.user.id;

    logAuth('info', 'Supabase Auth user created successfully', res, {
      userId: createdUserId,
    });

    logAuth('info', 'Creating user profile', res, {
      userId: createdUserId,
    });

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: createdUserId,
          email: normalizedEmail,
          name: normalizedName,
          role: userRole,
          school_id: null,
          grade: profileGrade,
          avatar: selectedAvatar,
          is_blocked: false,
          strike_count: 0,
        },
        {
          onConflict: 'id',
        },
      );

    if (profileError) {
      logAuth('error', 'Profile creation failed', res, {
        userId: createdUserId,
        error: getSupabaseError(profileError),
      });

      logAuth('warn', 'Starting Supabase Auth rollback', res, {
        userId: createdUserId,
      });

      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);

      if (rollbackError) {
        logAuth('error', 'Supabase Auth rollback failed', res, {
          userId: createdUserId,
          error: getSupabaseError(rollbackError),
        });
      } else {
        logAuth('info', 'Supabase Auth rollback completed', res, {
          userId: createdUserId,
        });
      }

      res.status(500).json({
        message: 'Profile gagal dibuat. Silakan coba lagi.',
      });
      return;
    }

    logAuth('info', 'Profile created successfully', res, {
      userId: createdUserId,
      role: userRole,
    });

    logAuth('info', 'Registration completed successfully', res, {
      userId: createdUserId,
      email: maskEmail(normalizedEmail),
    });

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: {
        id: createdUserId,
        email: normalizedEmail,
        name: normalizedName,
        role: userRole,
        grade: profileGrade,
        avatar: selectedAvatar,
        schoolId: '',
      },
    });
  } catch (error) {
    logAuth('error', 'Unexpected registration error', res, {
      userId: createdUserId,
      error: getSupabaseError(error),
    });

    res.status(500).json({
      message: 'Terjadi kesalahan pada server.',
    });
  }
}

export async function loginUser(
  req: Request,
  res: Response,
): Promise<void> {
  const { email, password } = req.body ?? {};

  logAuth('info', 'Login request received', res, {
    email: typeof email === 'string'
      ? maskEmail(email.trim().toLowerCase())
      : undefined,
  });

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    logAuth('warn', 'Login validation failed: missing credentials', res);

    res.status(400).json({
      message: 'Email dan password harus diisi.',
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    logAuth('info', 'Authenticating user with Supabase', res, {
      email: maskEmail(normalizedEmail),
    });

    const loginClient = createLoginClient();

    const { data, error } =
      await loginClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

    if (error || !data.user || !data.session) {
      logAuth('warn', 'Supabase authentication failed', res, {
        error: getSupabaseError(error),
      });

      res.status(401).json({
        message: 'Email atau password salah.',
      });
      return;
    }

    logAuth('info', 'Supabase authentication successful', res, {
      userId: data.user.id,
    });

    logAuth('info', 'Searching user profile', res, {
      userId: data.user.id,
    });

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('profiles')
      .select(
        'id, email, name, role, school_id, grade, avatar, is_blocked, strike_count',
      )
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      logAuth('error', 'Profile database query failed', res, {
        userId: data.user.id,
        error: getSupabaseError(profileError),
      });

      res.status(503).json({
        message: 'Profil pengguna belum dapat diperiksa. Silakan coba lagi.',
      });
      return;
    }

    if (!profile) {
      logAuth('warn', 'Profile not found for authenticated user', res, {
        userId: data.user.id,
        email: maskEmail(normalizedEmail),
      });

      res.status(401).json({
        message: 'Profile tidak ditemukan. Silakan register terlebih dahulu.',
      });
      return;
    }

    logAuth('info', 'User profile found', res, {
      userId: profile.id,
      role: profile.role,
      schoolId: profile.school_id,
    });

    if (profile.is_blocked) {
      logAuth('warn', 'Login rejected: account is blocked', res, {
        userId: profile.id,
      });

      res.status(403).json({
        message: 'Akun kamu sedang diblokir.',
      });
      return;
    }

    let schoolName: string | undefined;

    if (
      profile.role === 'teacher' ||
      profile.role === 'headmaster'
    ) {
      logAuth('info', 'Validating school status', res, {
        userId: profile.id,
        schoolId: profile.school_id,
      });

      const {
        data: school,
        error: schoolError,
      } = await supabaseAdmin
        .from('schools')
        .select('id, name, is_active')
        .eq('id', profile.school_id || '')
        .maybeSingle();

      if (schoolError) {
        logAuth('error', 'School status query failed', res, {
          userId: profile.id,
          error: getSupabaseError(schoolError),
        });

        res.status(503).json({
          message: 'Status sekolah belum dapat diperiksa.',
        });
        return;
      }

      if (!school?.is_active) {
        logAuth('warn', 'Login rejected: school inactive or missing', res, {
          userId: profile.id,
          schoolId: profile.school_id,
        });

        res.status(403).json({
          message: 'Sekolah belum ditentukan atau sedang tidak aktif.',
        });
        return;
      }

      schoolName = school.name;

      logAuth('info', 'School validation successful', res, {
        userId: profile.id,
        schoolId: school.id,
      });
    }

    logAuth('info', 'Login completed successfully', res, {
      userId: profile.id,
      role: profile.role,
    });

    res.status(200).json({
      message: 'Login berhasil',
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        schoolId: profile.school_id,
        schoolName,
        grade: profile.grade,
        avatar: profile.avatar,
        isBlocked: profile.is_blocked,
        strikeCount: profile.strike_count,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    logAuth('error', 'Unexpected login error', res, {
      error: getSupabaseError(error),
    });

    res.status(500).json({
      message: 'Terjadi kesalahan pada server.',
    });
  }
}
