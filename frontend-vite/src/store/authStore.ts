
import { supabase } from '../lib/supabase';

// ============================================================
// TYPES
// ============================================================

export interface UserData {
  id?: string;

  email: string;
  name: string;

  password?: string;

  role:
    | 'student'
    | 'teacher'
    | 'parent'
    | 'admin';

  schoolId: string;
  schoolName: string;

  avatar: string;

  grade?: string;
  gradeNumber?: number;

  registeredAt?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserData;
}

export type UserSession = Omit<UserData, 'password'>;

// ============================================================
// DEMO ACCOUNTS
// ============================================================
//
// Demo account TIDAK lagi digunakan sebagai bypass login.
//
// Jika ingin akun demo benar-benar bisa:
// - login
// - mendapatkan Supabase JWT
// - membuka /api/chat
//
// maka akun tersebut harus benar-benar dibuat di
// Supabase Auth dan mempunyai row pada profiles.
//
// Daftar ini hanya untuk:
// - menampilkan akun demo
// - forgot password / UI
// - dashboard lokal
//
// ============================================================

const DEMO_ACCOUNTS: (
  UserData & { password: string }
)[] = [
  {
    email: 'bonibot@stu.untar.ac.id',
    name: 'BoniBot',
    password: 'demo123',
    role: 'student',
    schoolId: 'stu.untar.ac.id',
    schoolName: 'Universitas Tarumanagara',
    avatar: '🦁',
    grade: '3',
    gradeNumber: 3,
  },

  {
    email: 'ani@stu.untar.ac.id',
    name: 'Ani',
    password: 'demo123',
    role: 'student',
    schoolId: 'stu.untar.ac.id',
    schoolName: 'Universitas Tarumanagara',
    avatar: '🦋',
    grade: '6',
    gradeNumber: 6,
  },

  {
    email: 'guru@stu.untar.ac.id',
    name: 'Ibu Sari',
    password: 'demo123',
    role: 'teacher',
    schoolId: 'stu.untar.ac.id',
    schoolName: 'Universitas Tarumanagara',
    avatar: '👩‍🏫',
  },

  {
    email: 'ortu@gmail.com',
    name: 'Pak Joko',
    password: 'demo123',
    role: 'parent',
    schoolId: 'gmail.com',
    schoolName: 'Orang Tua',
    avatar: '👨‍👩‍👧',
  },
];

// ============================================================
// SCHOOL MAPPING
// ============================================================

// ============================================================
// DEMO ACCOUNTS
// ============================================================

export function getDemoAccounts() {
  return DEMO_ACCOUNTS.map(
    (account) => ({
      ...account,
    })
  );
}

// ============================================================
// LOCAL STORAGE
// ============================================================

function getLocalUsers(): UserData[] {
  try {
    const data =
      localStorage.getItem(
        'edubot_users'
      );

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.warn(
      '⚠️ Failed to read local users:',
      error
    );

    return [];
  }
}

// ============================================================
// SAVE LOCAL USER
// ============================================================
//
// Password TIDAK disimpan.
//
// Tidak menggunakan:
//
// const { password: _password, ...safeUser } = user
//
// karena ESLint menganggap _password sebagai unused variable.
//
// ============================================================

function saveLocalUser(
  user: UserData
): void {
  try {
    const users =
      getLocalUsers();

    const safeUser: UserData = {
      id: user.id,

      email: user.email,
      name: user.name,

      role: user.role,

      schoolId:
        user.schoolId,

      schoolName:
        user.schoolName,

      avatar:
        user.avatar,

      grade:
        user.grade,

      gradeNumber:
        user.gradeNumber,

      registeredAt:
        user.registeredAt,
    };

    const existingIndex =
      users.findIndex(
        (existing) =>
          existing.email.toLowerCase() ===
          user.email.toLowerCase()
      );

    if (existingIndex >= 0) {
      users[existingIndex] =
        safeUser;
    } else {
      users.push(safeUser);
    }

    localStorage.setItem(
      'edubot_users',
      JSON.stringify(users)
    );
  } catch (error) {
    console.warn(
      '⚠️ Failed to save local user:',
      error
    );
  }
}

// ============================================================
// SESSION
// ============================================================

export function saveSession(
  user: UserSession
): void {
  try {
    // UserSession sudah tidak memiliki password,
    // jadi tidak perlu destructuring _password.

    const safeUser: UserSession = {
      id: user.id,

      email: user.email,
      name: user.name,

      role: user.role,

      schoolId:
        user.schoolId,

      schoolName:
        user.schoolName,

      avatar:
        user.avatar,

      grade:
        user.grade,

      gradeNumber:
        user.gradeNumber,

      registeredAt:
        user.registeredAt,
    };

    localStorage.setItem(
      'edubot_session',
      JSON.stringify(safeUser)
    );

    if (
      user.role === 'student'
    ) {
      localStorage.setItem(
        'edubot_student',
        JSON.stringify({
          id:
            user.id ||
            user.email,

          name:
            user.name,

          username:
            user.email.split('@')[0],

          grade:
            user.grade || '3',

          gradeNumber:
            user.gradeNumber || 3,

          avatar:
            user.avatar,

          schoolId:
            user.schoolId,

          schoolName:
            user.schoolName,
        })
      );
    }
  } catch (error) {
    console.warn(
      '⚠️ Failed to save session:',
      error
    );
  }
}

// ============================================================
// GET SESSION
// ============================================================

export function getSession():
  | UserSession
  | null {
  try {
    const data =
      localStorage.getItem(
        'edubot_session'
      );

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.warn(
      '⚠️ Failed to read session:',
      error
    );

    return null;
  }
}

// ============================================================
// CLEAR SESSION
// ============================================================

export async function clearSession(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  } catch (error) {
    console.warn(
      '⚠️ Supabase signOut failed:',
      error
    );
    throw error;
  }

  localStorage.removeItem(
    'edubot_session'
  );

  localStorage.removeItem(
    'edubot_student'
  );
}

// ============================================================
// REGISTER
// ============================================================

const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }

  return 'http://localhost:5000';
};

export async function registerUser(userData: UserData & { password: string }): Promise<AuthResult> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userData.email, name: userData.name, password: userData.password,
        role: userData.role, grade: userData.gradeNumber, avatar: userData.avatar }),
    });
    const data = await response.json();
    return response.ok ? { success: true } : { success: false, error: data.message || 'Registrasi gagal.' };
  } catch { return { success: false, error: 'Registrasi belum dapat diproses.' }; }
}

// ============================================================
// LOGIN VIA BACKEND
// ============================================================

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const emailLower =
    email
      .trim()
      .toLowerCase();

  if (!emailLower) {
    return {
      success: false,
      error: 'Email wajib diisi.',
    };
  }

  if (!password) {
    return {
      success: false,
      error:
        'Password wajib diisi.',
    };
  }

  try {
    const API_URL = getApiBaseUrl();

    console.log(
      '🔐 Login via backend:',
      emailLower
    );

    // ========================================================
    // BACKEND LOGIN
    // ========================================================

    const response =
      await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            email:
              emailLower,

            password,
          }),
        }
      );

    const data =
      await response.json();

    // ========================================================
    // BACKEND ERROR
    // ========================================================

    if (!response.ok) {
      console.error(
        '❌ Backend login failed:',
        data
      );

      return {
        success: false,
        error:
          data.message ||
          data.error ||
          'Email atau password salah.',
      };
    }

    // ========================================================
    // VALIDATE USER + SESSION
    // ========================================================

    if (
      !data.user ||
      !data.session?.access_token ||
      !data.session?.refresh_token
    ) {
      console.error(
        '❌ Backend login tidak mengembalikan session:',
        data
      );

      return {
        success: false,
        error:
          'Backend tidak mengembalikan session login yang valid.',
      };
    }

    // ========================================================
    // STORE SUPABASE SESSION
    // ========================================================

    const {
      error: sessionError,
    } =
      await supabase.auth.setSession(
        {
          access_token:
            data.session
              .access_token,

          refresh_token:
            data.session
              .refresh_token,
        }
      );

    if (sessionError) {
      console.error(
        '❌ setSession error:',
        sessionError.message
      );

      return {
        success: false,
        error:
          'Gagal menyimpan session login.',
      };
    }

    // ========================================================
    // VERIFY SESSION
    // ========================================================

    const {
      data: sessionData,
    } =
      await supabase.auth.getSession();

    if (
      !sessionData.session
        ?.access_token
    ) {
      console.error(
        '❌ Supabase access token tidak tersedia.'
      );

      return {
        success: false,
        error:
          'Session Supabase tidak aktif.',
      };
    }

    console.log(
      '✅ Supabase session stored.'
    );

    // ========================================================
    // USER DATA
    // ========================================================

    const backendUser =
      data.user;

    const schoolId =
      backendUser.schoolId || '';

    const grade =
      backendUser.grade;

    const userData: UserData = {
      id:
        backendUser.id,

      email:
        backendUser.email ||
        emailLower,

      name:
        backendUser.name ||
        'User',

      role:
        backendUser.role,

      schoolId,

      schoolName:
        backendUser.schoolName || (schoolId ? 'Sekolah terdaftar' : 'Belum ditentukan'),

      avatar:
        backendUser.avatar ||
        '🦁',

      grade:
        grade == null
          ? undefined
          : String(grade),

      gradeNumber:
        grade == null
          ? undefined
          : Number(grade),
    };

    // ========================================================
    // SAVE CACHE
    // ========================================================

    saveLocalUser(
      userData
    );

    saveSession(
      userData
    );

    console.log(
      '✅ Login successful:',
      userData.email
    );

    return {
      success: true,
      user: userData,
    };
  } catch (error) {
    console.error(
      '❌ Backend login exception:',
      error
    );

    return {
      success: false,
      error:
        'Koneksi ke server gagal. Silakan coba lagi.',
    };
  }
}

// ============================================================
// SUPABASE DIRECT LOGIN
// ============================================================
//
// Dipertahankan jika ada komponen yang masih memanggil
// authenticateUserWithSupabase().
//
// Tidak ada local/demo bypass.
// Login harus menghasilkan Supabase session.
// ============================================================

export async function authenticateUserWithSupabase(
  email: string,
  password: string
): Promise<AuthResult> {
  const emailLower =
    email
      .trim()
      .toLowerCase();

  if (!emailLower) {
    return {
      success: false,
      error: 'Email wajib diisi.',
    };
  }

  if (!password) {
    return {
      success: false,
      error:
        'Password wajib diisi.',
    };
  }

  try {
    console.log(
      '🔐 Direct Supabase login:',
      emailLower
    );

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email:
            emailLower,

          password,
        }
      );

    // ========================================================
    // AUTH ERROR
    // ========================================================

    if (error) {
      console.error(
        '❌ Supabase login error:',
        error.message
      );

      return {
        success: false,
        error:
          'Email atau password salah.',
      };
    }

    // ========================================================
    // SESSION CHECK
    // ========================================================

    if (
      !data.user ||
      !data.session?.access_token
    ) {
      return {
        success: false,
        error:
          'Session login tidak tersedia.',
      };
    }

    console.log(
      '✅ Supabase access token available.'
    );

    // ========================================================
    // GET PROFILE
    // ========================================================

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from('profiles')
        .select(`
          id,
          email,
          name,
          role,
          school_id,
          grade,
          avatar,
          is_blocked,
          strike_count
        `)
        .eq(
          'id',
          data.user.id
        )
        .single();

    if (
      profileError ||
      !profile
    ) {
      console.error(
        '❌ Profile lookup failed:',
        profileError?.message
      );

      await supabase.auth.signOut();

      return {
        success: false,
        error:
          'Profile tidak ditemukan.',
      };
    }

    // ========================================================
    // BLOCK CHECK
    // ========================================================

    if (
      profile.is_blocked
    ) {
      await supabase.auth.signOut();

      return {
        success: false,
        error:
          'Akun diblokir. Hubungi guru!',
      };
    }

    // ========================================================
    // USER DATA
    // ========================================================

    const schoolId =
      profile.school_id || '';

    const userData: UserData = {
      id:
        profile.id,

      email:
        profile.email ||
        emailLower,

      name:
        profile.name ||
        'User',

      role:
        profile.role,

      schoolId,

      schoolName:
        schoolId ? 'Sekolah terdaftar' : 'Belum ditentukan',

      avatar:
        profile.avatar ||
        '👦',

      grade:
        profile.grade == null
          ? undefined
          : String(
              profile.grade
            ),

      gradeNumber:
        profile.grade == null
          ? undefined
          : Number(
              profile.grade
            ),
    };

    // ========================================================
    // SAVE
    // ========================================================

    saveLocalUser(
      userData
    );

    saveSession(
      userData
    );

    console.log(
      '✅ Direct Supabase login success.'
    );

    return {
      success: true,
      user: userData,
    };
  } catch (error) {
    console.error(
      '❌ Supabase login exception:',
      error
    );

    return {
      success: false,
      error:
        'Koneksi ke Supabase gagal.',
    };
  }
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

export function findUserByEmail(
  email: string
): UserData | null {
  const emailLower =
    email
      .trim()
      .toLowerCase();

  const demoUser =
    DEMO_ACCOUNTS.find(
      (account) =>
        account.email.toLowerCase() ===
        emailLower
    );

  if (demoUser) {
    return {
      ...demoUser,
    };
  }

  const localUsers =
    getLocalUsers();

  return (
    localUsers.find(
      (user) =>
        user.email.toLowerCase() ===
        emailLower
    ) || null
  );
}

// ============================================================
// GENERATE OTP
// ============================================================

export function generateOTP(): string {
  return Math.floor(
    100000 +
      Math.random() * 900000
  ).toString();
}

// ============================================================
// UPDATE PASSWORD
// ============================================================
//
// Catatan:
// Fungsi ini membutuhkan Supabase session aktif.
// Jangan menganggap localStorage sebagai password database.
// ============================================================

export async function updateUserPassword(
  email: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const emailLower =
    email
      .trim()
      .toLowerCase();

  if (
    newPassword.length < 6
  ) {
    return {
      success: false,
      error:
        'Password minimal 6 karakter.',
    };
  }

  try {
    const {
      data: sessionData,
    } =
      await supabase.auth.getSession();

    if (
      !sessionData.session
    ) {
      return {
        success: false,
        error:
          'Session tidak aktif. Silakan login kembali.',
      };
    }

    const {
      error,
    } =
      await supabase.auth.updateUser(
        {
          password:
            newPassword,
        }
      );

    if (error) {
      console.error(
        '❌ Supabase password update:',
        error.message
      );

      return {
        success: false,
        error:
          error.message,
      };
    }

    console.log(
      '✅ Supabase password updated:',
      emailLower
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      '❌ Password update exception:',
      error
    );

    return {
      success: false,
      error:
        'Gagal mengubah password.',
    };
  }
}

// ============================================================
// TEACHER DASHBOARD
// ============================================================

export function getStudentsBySchool(
  schoolId: string
): UserData[] {
  const results: UserData[] = [];

  // ==========================================================
  // DEMO STUDENTS
  // ==========================================================

  DEMO_ACCOUNTS
    .filter(
      (user) =>
        user.role === 'student' &&
        user.schoolId === schoolId
    )
    .forEach(
      (user) => {
        results.push({
          ...user,
        });
      }
    );

  // ==========================================================
  // LOCAL CACHED USERS
  // ==========================================================

  getLocalUsers()
    .filter(
      (user) =>
        user.role === 'student' &&
        user.schoolId === schoolId
    )
    .forEach(
      (user) => {
        const exists =
          results.some(
            (existing) =>
              existing.email ===
              user.email
          );

        if (!exists) {
          results.push(user);
        }
      }
    );

  return results;
}
