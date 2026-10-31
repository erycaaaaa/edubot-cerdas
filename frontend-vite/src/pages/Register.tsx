import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader,
} from 'lucide-react';

import { AnimatedBlobs } from '../components/AnimatedBlobs';

const avatars = [
  {
    id: 1,
    emoji: '🦁',
    name: 'Lion',
    color: 'bg-[#FFE5B3]',
  },
  {
    id: 2,
    emoji: '🐼',
    name: 'Panda',
    color: 'bg-[#E8E8E8]',
  },
  {
    id: 3,
    emoji: '🦊',
    name: 'Fox',
    color: 'bg-[#FFB3D9]',
  },
  {
    id: 4,
    emoji: '🐸',
    name: 'Frog',
    color: 'bg-[#B8E8C6]',
  },
  {
    id: 5,
    emoji: '🦄',
    name: 'Unicorn',
    color: 'bg-[#D4B3FF]',
  },
  {
    id: 6,
    emoji: '🐨',
    name: 'Koala',
    color: 'bg-[#C4C4C4]',
  },
  {
    id: 7,
    emoji: '🦋',
    name: 'Butterfly',
    color: 'bg-[#A8DAFF]',
  },
  {
    id: 8,
    emoji: '🐢',
    name: 'Turtle',
    color: 'bg-[#B8E8C6]',
  },
];

const roleOptions = {
  student: {
    label: 'Siswa',
    title: 'Buat Akun Siswa',
    description: 'Isi data diri Anda untuk memulai perjalanan belajar',
    accent: 'bg-[#B9895F]',
  },
  parent: {
    label: 'Orang Tua',
    title: 'Buat Akun Orang Tua',
    description: 'Pantau aktivitas dan perkembangan anak Anda',
    accent: 'bg-[#B9895F]',
  },
} as const;

type RegisterRole = keyof typeof roleOptions;

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

interface RegisterFormData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  grade: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRoleFromUrl = searchParams.get('role');
  const selectedRole: RegisterRole =
    selectedRoleFromUrl === 'parent'
      ? selectedRoleFromUrl
      : 'student';

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    grade: '',
  });

  const handleRoleChange = (role: RegisterRole) => {
    setSearchParams({ role });
    setError('');
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError('');
  };

  const validateStep1 = (): boolean => {
    const email = formData.email.trim();
    const name = formData.name.trim();

    if (!email) {
      setError('📧 Email harus diisi');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('📧 Format email tidak valid');
      return false;
    }

    if (!name) {
      setError('👤 Nama harus diisi');
      return false;
    }

    if (name.length < 3) {
      setError('👤 Nama minimal 3 karakter');
      return false;
    }

    if (!formData.password) {
      setError('🔐 Password harus diisi');
      return false;
    }

    if (formData.password.length < 8) {
      setError('🔐 Password minimal 8 karakter');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('🔐 Password tidak cocok');
      return false;
    }

    if (selectedRole === 'student' && !formData.grade) {
      setError('📚 Silakan pilih kelas');
      return false;
    }

    return true;
  };

  const handleNextStep = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateStep1()) {
      return;
    }

    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    if (!selectedAvatar) {
      setError('🎨 Silakan pilih avatar terlebih dahulu');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const selectedAvatarData = avatars.find(
        (avatar) => avatar.id === selectedAvatar,
      );

      if (!selectedAvatarData) {
        throw new Error('Avatar tidak ditemukan');
      }

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          name: formData.name.trim(),
          password: formData.password,
          role: selectedRole,
          grade: formData.grade || null,
          avatar: selectedAvatarData.emoji,
        }),
      });

      let data: {
        message?: string;
        error?: string;
        user?: unknown;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Registrasi gagal (${response.status})`,
        );
      }

      setSuccessMessage(
        '🎉 Akun berhasil dibuat! Mengalihkan ke login...',
      );

      window.setTimeout(() => {
        navigate(`/login/${selectedRole}`, {
          replace: true,
        });
      }, 1500);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat registrasi';

      setError(errorMessage);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (loading) {
      return;
    }

    if (step === 1) {
      navigate(`/login/${selectedRole}`);
      return;
    }

    setError('');
    setStep(1);
  };

  if (selectedRoleFromUrl === 'teacher') return (
    <main className="min-h-screen bg-card-soft text-txt-main flex items-center justify-center p-6">
      <section className="max-w-md space-y-4 rounded-2xl bg-white p-6">
        <h1 className="text-2xl font-bold">Akses guru</h1>
        <p>Akun guru dibuat oleh administrator sekolah setelah identitas dan sekolah diverifikasi. Hubungi sekolah untuk mendapatkan akses.</p>
        <button onClick={() => navigate('/login/teacher')} className="rounded-xl bg-olive px-4 py-3 text-white">Login guru</button>
        <button onClick={() => handleRoleChange('student')} className="block underline">Daftar sebagai siswa</button>
      </section>
    </main>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FDF6EE] relative overflow-hidden">
      <AnimatedBlobs />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Back Button */}
        <motion.button
          type="button"
          whileHover={{ x: -5 }}
          onClick={handleBack}
          disabled={loading}
          className="flex items-center gap-2 text-[#5D594C] hover:text-[#332F2D] mb-6 font-semibold transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Kembali</span>
        </motion.button>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-[#BDB2A0]/30"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-[#332F2D] mb-2">
              {step === 1 ? roleOptions[selectedRole].title : '🎨 Pilih Avatar'}
            </h1>

            <p className="text-[#5D594C]">
              {step === 1
                ? roleOptions[selectedRole].description
                : 'Pilih avatar yang paling Anda sukai!'}
            </p>
          </motion.div>

          {step === 1 && (
            <div className="mb-6 grid grid-cols-3 gap-3">
              {(Object.entries(roleOptions) as Array<[RegisterRole, (typeof roleOptions)[RegisterRole]]>).map(
                ([roleKey, config]) => (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => handleRoleChange(roleKey)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-all ${
                      selectedRole === roleKey
                        ? `${config.accent} text-white shadow-md`
                        : 'bg-[#F8F4F0] text-[#332F2D] border-[#E6D8C9] hover:border-[#B9895F]'
                    }`}
                  >
                    {config.label}
                  </button>
                ),
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />

              <p className="text-red-700 text-sm">
                {error}
              </p>
            </motion.div>
          )}

          {/* Success */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />

              <p className="text-green-700 text-sm font-semibold">
                {successMessage}
              </p>
            </motion.div>
          )}

          <form
            onSubmit={
              step === 1
                ? handleNextStep
                : handleSubmit
            }
          >
            {/* STEP 1 */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-[#332F2D] mb-2">
                    📧 Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#B9895F] focus:outline-none transition-colors disabled:bg-gray-100"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-[#332F2D] mb-2">
                    👤 Nama Lengkap
                  </label>

                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Contoh: Chairunnisa"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#B9895F] focus:outline-none transition-colors disabled:bg-gray-100"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-[#332F2D] mb-2">
                    🔐 Password
                  </label>

                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#B9895F] focus:outline-none transition-colors disabled:bg-gray-100"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-[#332F2D] mb-2">
                    🔐 Konfirmasi Password
                  </label>

                  <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Ketik ulang password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#B9895F] focus:outline-none transition-colors disabled:bg-gray-100"
                  />
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-sm font-semibold text-[#332F2D] mb-2">
                    📚 Kelas
                  </label>

                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#B9895F] focus:outline-none transition-colors bg-white text-[#332F2D] disabled:bg-gray-100"
                  >
                    <option value="">Pilih Kelas</option>
                    <option value="1">Kelas 1 SD</option>
                    <option value="2">Kelas 2 SD</option>
                    <option value="3">Kelas 3 SD</option>
                    <option value="4">Kelas 4 SD</option>
                    <option value="5">Kelas 5 SD</option>
                    <option value="6">Kelas 6 SD</option>
                  </select>
                </div>

                {/* Next */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#B9895F] hover:bg-[#A67950] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all mt-8 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Lanjut → Pilih Avatar
                </motion.button>

                {/* Login */}
                <p className="text-center text-[#5D594C] text-sm">
                  Sudah punya akun?{' '}

                  <button
                    type="button"
                    onClick={() => navigate('/login/student')}
                    disabled={loading}
                    className="text-[#B9895F] font-semibold hover:underline disabled:opacity-50"
                  >
                    Login di sini
                  </button>
                </p>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-[#5D594C] text-center mb-6">
                  Pilih salah satu avatar di bawah ini untuk karakter Anda
                </p>

                <div className="grid grid-cols-4 gap-4 mb-8">
                  {avatars.map((avatar, index) => (
                    <motion.button
                      key={avatar.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: index * 0.05,
                      }}
                      whileHover={{ scale: 1.05 }}
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setSelectedAvatar(avatar.id)
                      }
                      className={`p-6 rounded-2xl transition-all ${
                        avatar.color
                      } ${
                        selectedAvatar === avatar.id
                          ? 'ring-4 ring-[#B9895F] scale-105 shadow-md'
                          : 'opacity-70 hover:opacity-100'
                      } disabled:cursor-not-allowed`}
                    >
                      <div className="text-5xl">
                        {avatar.emoji}
                      </div>

                      <p className="text-xs text-[#332F2D] mt-2 font-semibold">
                        {avatar.name}
                      </p>
                    </motion.button>
                  ))}
                </div>

                {/* Selected Avatar */}
                {selectedAvatar && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mb-6 p-4 bg-[#FDF6EE] border border-[#BDB2A0]/30 rounded-xl"
                  >
                    <p className="text-sm text-[#776938] font-medium">
                      ✨ Kamu memilih avatar{' '}

                      <span className="font-bold text-[#332F2D]">
                        {
                          avatars.find(
                            (avatar) =>
                              avatar.id === selectedAvatar,
                          )?.name
                        }
                      </span>
                    </p>
                  </motion.div>
                )}

                {/* Register */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={!selectedAvatar || loading}
                  className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-all ${
                    selectedAvatar && !loading
                      ? 'bg-[#B9895F] hover:bg-[#A67950] hover:shadow-xl'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      Mendaftar...
                    </div>
                  ) : (
                    '✨ Daftar Sekarang!'
                  )}
                </motion.button>
              </motion.div>
            )}
          </form>

          {/* Step Indicator */}
          <div className="flex gap-2 mt-8 justify-center">
            {[1, 2].map((num) => (
              <motion.div
                key={num}
                animate={{
                  width: step === num ? 24 : 8,
                  backgroundColor:
                    step >= num
                      ? '#B9895F'
                      : '#BDB2A0',
                }}
                className="h-2 rounded-full transition-all"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
