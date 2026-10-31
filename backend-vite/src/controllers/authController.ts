import { Request, Response } from 'express';
import { createLoginClient, supabaseAdmin } from '../services/supabaseService';
export { requireAuth, requireRole } from '../middleware/auth';
export type { AuthUser } from '../middleware/auth';

export async function registerUser(
  req: Request,
  res: Response,
): Promise<void> {
  const {
    email,
    password,
    name,
    role,
    grade,
    avatar,
  } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof name !== 'string' ||
    !email.trim() ||
    !password ||
    !name.trim()
  ) {
    res.status(400).json({
      message: 'Email, password, dan nama harus diisi.',
    });
    return;
  }

  if ('schoolId' in req.body || 'school_id' in req.body) {
    res.status(400).json({ message: 'Penempatan sekolah hanya dapat dilakukan pengelola.' }); return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254 || name.trim().length > 100 || password.length < 8) {
    res.status(400).json({ message: 'Gunakan email valid, nama maksimal 100 karakter, dan password minimal 8 karakter.' });
    return;
  }
  // Teacher access is provisioned by a trusted administrator, never self-approved.
  if (role === 'teacher') {
    res.status(403).json({ message: 'Akun guru harus dibuat oleh administrator sekolah. Hubungi sekolah untuk mendapatkan akses.' });
    return;
  }
  if (role != null && role !== 'student' && role !== 'parent') {
    res.status(400).json({ message: 'Peran akun tidak valid.' });
    return;
  }
  const starterAvatars = ['🦁', '🐼', '🦊', '🐸', '🦄', '🐨', '🦋', '🐢'];
  if (avatar != null && !starterAvatars.includes(avatar)) {
    res.status(400).json({ message: 'Pilih avatar awal yang tersedia.' });
    return;
  }
  const roles = ['student', 'teacher', 'parent'] as const;
  const userRole = roles.includes(role) ? role : 'student';
  const numericGrade = grade == null || grade === '' ? null : Number(grade);
  const profileGrade =
    numericGrade !== null && Number.isFinite(numericGrade)
      ? numericGrade
      : null;
  if (numericGrade !== null && (!Number.isInteger(numericGrade) || numericGrade < 1 || numericGrade > 12)) {
    res.status(400).json({ message: 'Kelas harus berupa angka 1 sampai 12.' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role: userRole,
        grade: profileGrade,
        avatar: avatar ?? '🦁',
      },
    });

    if (error || !data.user) {
      res.status(400).json({
        message: error?.message ?? 'Gagal membuat akun.',
      });
      return;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          email: normalizedEmail,
          name: name.trim(),
          role: userRole,
          school_id: null,
          grade: profileGrade,
          avatar: avatar ?? '🦁',
          is_blocked: false,
          strike_count: 0,
        },
        { onConflict: 'id' },
      );

    if (profileError) {
      console.error('Profile creation error:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      res.status(500).json({
        message: 'Profile gagal dibuat. Silakan coba lagi.',
      });
      return;
    }

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: {
        id: data.user.id,
        email: normalizedEmail,
        name: name.trim(),
        role: userRole,
        grade: profileGrade,
        avatar: avatar ?? '🦁',
        schoolId: '',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
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

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({
      message: 'Email dan password harus diisi.',
    });
    return;
  }

  try {
    // A fresh client prevents this user's session from changing the shared
    // service-role client's authorization for XP, strikes, and teacher queries.
    const loginClient = createLoginClient();
    const { data, error } = await loginClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user || !data.session) {
      res.status(401).json({
        message: 'Email atau password salah.',
      });
      return;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, role, school_id, grade, avatar, is_blocked, strike_count')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      res.status(401).json({
        message: 'Profile tidak ditemukan. Silakan register terlebih dahulu.',
      });
      return;
    }

    if (profile.is_blocked) {
      res.status(403).json({
        message: 'Akun kamu sedang diblokir.',
      });
      return;
    }

    let schoolName: string | undefined;
    if (profile.role === 'teacher') {
      const { data: school, error } = await supabaseAdmin.from('schools').select('id,name,is_active').eq('id', profile.school_id || '').maybeSingle();
      if (error) { res.status(503).json({ message: 'Status sekolah belum dapat diperiksa.' }); return; }
      if (!school?.is_active) { res.status(403).json({ message: 'Sekolah belum ditentukan atau sedang tidak aktif.' }); return; }
      schoolName = school.name;
    }
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
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Terjadi kesalahan pada server.',
    });
  }
}
