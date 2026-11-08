
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Eye, EyeOff, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  authenticateUser,
  saveSession,
  getDemoAccounts,
} from '../store/authStore';

import { roleDestination } from '../config/roles';
import { AnimatedBlobs } from '../components/AnimatedBlobs';

const roleConfig = {
  student: {
    title: 'Login Siswa',
    emoji: '🎒',
    color: 'bg-[#B9895F]',
    hover: 'hover:bg-[#A67950]',
    badgeBg: 'bg-[#B9895F]/15',
    badgeText: 'text-[#B9895F]',
    roleKey: 'student',
  },
  teacher: {
    title: 'Login Guru',
    emoji: '👩‍🏫',
    color: 'bg-[#776938]',
    hover: 'hover:bg-[#66592F]',
    badgeBg: 'bg-[#776938]/15',
    badgeText: 'text-[#776938]',
    roleKey: 'teacher',
  },
  admin: {
    title: 'Login Admin',
    emoji: '🛡️',
    color: 'bg-[#776938]',
    hover: 'hover:bg-[#66592F]',
    badgeBg: 'bg-[#776938]/15',
    badgeText: 'text-[#776938]',
    roleKey: 'admin',
  },
  parent: {
    title: 'Login Orang Tua',
    emoji: '👨‍👩‍👧',
    color: 'bg-[#B9895F]',
    hover: 'hover:bg-[#A67950]',
    badgeBg: 'bg-[#B9895F]/15',
    badgeText: 'text-[#B9895F]',
    roleKey: 'parent',
  },
} as const;

type RoleKey = keyof typeof roleConfig;

export default function Login() {
  const navigate = useNavigate();
  const { role } = useParams<{ role: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showDemoInfo, setShowDemoInfo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate role from URL.
  const isValidRole = role && role in roleConfig;

  const config = isValidRole
    ? roleConfig[role as RoleKey]
    : null;

  // Invalid roles, including headmaster, return to role selection.
  useEffect(() => {
    if (!isValidRole) {
      navigate('/role-selection', { replace: true });
    }
  }, [isValidRole, navigate]);

  // Filter demo accounts based on selected role.
  const demoAccounts = config
    ? getDemoAccounts().filter(
        (account) => account.role === config.roleKey
      )
    : [];

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!config) {
      setError('Peran akun tidak valid.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Email dan password harus diisi.');
      return;
    }

    if (!email.includes('@')) {
      setError('Format email tidak valid.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const result = await authenticateUser(
        email.trim(),
        password
      );

      if (!result.success) {
        setError(result.error || 'Login gagal. Silakan coba kembali.');
        return;
      }

      const user = result.user;

      if (!user) {
        setError('Data pengguna tidak ditemukan.');
        return;
      }

      // Ensure the selected login role matches the authenticated role.
      if (user.role !== config.roleKey) {
        setError(
          `Akun ini terdaftar sebagai ${user.role}, bukan ${config.roleKey}. Silakan pilih halaman login yang sesuai.`
        );
        return;
      }

      const schoolId = user.schoolId || '';
      const schoolName = user.schoolName || 'Belum ditentukan';

      // Save authenticated session.
      saveSession({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId,
        schoolName,
        avatar: user.avatar,
        grade: user.grade,
        gradeNumber: user.gradeNumber,
      });

      // Redirect based on authenticated role.
      navigate(roleDestination(user.role));

    } catch (err) {
      console.error('[LOGIN] Unexpected error:', err);
      setError('Terjadi kesalahan saat login. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (
    demoEmail: string,
    demoPassword: string
  ) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  // Prevent rendering an invalid role configuration.
  if (!config) {
    return (
      <div className="min-h-screen bg-[#FDF6EE] flex items-center justify-center">
        <p className="text-[#5D594C] font-medium">
          Mengarahkan ke halaman pilihan peran...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6EE] flex items-center justify-center p-4 relative overflow-hidden">
      <AnimatedBlobs />

      <div className="w-full max-w-md relative z-10">

        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/role-selection')}
          className="flex items-center gap-2 text-[#5D594C] hover:text-[#332F2D] mb-6 font-semibold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali ke Pilihan Peran
        </motion.button>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-[#BDB2A0]/30"
        >

          {/* Header */}
          <div className={`${config.color} p-8 text-center text-white`}>
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
              className="text-7xl mb-4 flex justify-center"
            >
              {config.emoji}
            </motion.div>

            <h1 className="text-3xl font-bold text-white mb-2">
              {config.title}
            </h1>

            <p className="text-white/90 text-sm">
              Masuk dengan email sekolah 🏫
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleLogin}>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-3 bg-[#FFE8E8] border border-[#FF4444] rounded-xl"
                    role="alert"
                  >
                    <p className="text-sm text-[#FF4444]">
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Input */}
              <div className="mb-5">
                <label
                  htmlFor="email"
                  className="block text-[#332F2D] mb-2 font-semibold text-sm"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#B9895F] focus:outline-none transition-colors"
                  placeholder="nama@sekolah.ac.id"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="mb-5">
                <label
                  htmlFor="password"
                  className="block text-[#332F2D] mb-2 font-semibold text-sm"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 focus:border-[#B9895F] focus:outline-none transition-colors"
                    placeholder="Masukkan password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword
                        ? 'Sembunyikan password'
                        : 'Tampilkan password'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5D594C] hover:text-[#332F2D]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              {role !== 'student' && (
                <div className="flex items-center justify-between mb-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded accent-[#B9895F]"
                    />
                    <span className="text-sm text-[#5D594C]">
                      Ingat saya
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-[#B9895F] hover:underline font-medium"
                  >
                    Lupa password?
                  </button>
                </div>
              )}

              {/* Forgot Password for Students */}
              {role === 'student' && (
                <div className="flex justify-end mb-5">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-[#B9895F] hover:underline font-medium"
                  >
                    Lupa password?
                  </button>
                </div>
              )}

              {/* Login Button */}
              <motion.button
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 ${config.color} ${config.hover} text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isSubmitting
                  ? 'Sedang masuk...'
                  : role === 'student'
                    ? 'Masuk & Mulai Belajar! 🚀'
                    : 'Masuk'}
              </motion.button>

              {/* Register Link */}
              {(role === 'student' || role === 'parent') && (
                <div className="text-center mt-5">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/register?role=${config.roleKey}`)
                    }
                    className="text-[#5D594C] hover:text-[#332F2D] text-sm transition-colors"
                  >
                    Belum punya akun?{' '}
                    <span className="font-semibold text-[#B9895F]">
                      Daftar sekarang!
                    </span>
                  </button>
                </div>
              )}

              {/* Teacher Information */}
              {role === 'teacher' && (
                <p className="mt-5 text-sm text-[#5D594C] text-center">
                  Akun guru dibuat melalui undangan admin sekolah.
                </p>
              )}

              {/* Admin Information */}
              {role === 'admin' && (
                <p className="mt-5 text-sm text-[#5D594C] text-center">
                  Masuk menggunakan akun administrator yang telah terdaftar.
                </p>
              )}

            </form>

            {/* Demo Account Information */}
            <div className="mt-5 border-t border-gray-100 pt-5">

              <button
                type="button"
                onClick={() => setShowDemoInfo(!showDemoInfo)}
                aria-expanded={showDemoInfo}
                className="w-full flex items-center justify-center gap-2 text-sm text-[#5D594C] hover:text-[#332F2D] transition-colors font-medium"
              >
                <Info className="w-4 h-4 text-[#B9895F]" />

                {showDemoInfo ? 'Sembunyikan' : 'Lihat'} akun demo
              </button>

              <AnimatePresence>
                {showDemoInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2 overflow-hidden"
                  >

                    {demoAccounts.length === 0 ? (
                      <p className="text-xs text-center text-[#5D594C]">
                        Tidak ada akun demo untuk role ini.
                      </p>
                    ) : (
                      demoAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() =>
                            fillDemoAccount(acc.email, acc.password)
                          }
                          className="w-full p-3 bg-[#FDF6EE] hover:bg-[#F3E8DB] rounded-xl text-left transition-colors group border border-[#BDB2A0]/25"
                        >
                          <div className="flex items-center gap-3">

                            <span className="text-2xl">
                              {acc.avatar}
                            </span>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#332F2D] truncate">
                                {acc.name}
                              </p>

                              <p className="text-xs text-[#5D594C] truncate">
                                {acc.email}
                              </p>

                              <p className="text-xs text-[#5D594C]/70">
                                {acc.schoolName}
                                {acc.grade
                                  ? ` • Kelas ${acc.grade}`
                                  : ''}
                              </p>
                            </div>

                            <span className="text-xs text-[#B9895F] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              Gunakan
                            </span>

                          </div>
                        </button>
                      ))
                    )}

                    <p className="text-[10px] text-[#5D594C] text-center mt-1">
                      Klik untuk mengisi otomatis.
                    </p>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
