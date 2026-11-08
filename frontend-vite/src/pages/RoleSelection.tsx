
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { BookOpen, Users, Heart, ArrowLeft } from 'lucide-react';
import { AnimatedBlobs } from '../components/AnimatedBlobs';

const roles = [
  {
    id: 'student',
    title: 'Siswa',
    description: 'Aku ingin belajar dengan EduBot!',
    Icon: BookOpen,
    color: 'bg-[#B9895F]',
    emoji: '🎒',
  },
  {
    id: 'teacher',
    title: 'Guru',
    description: 'Saya ingin memantau murid',
    Icon: Users,
    color: 'bg-[#776938]',
    emoji: '👩‍🏫',
  },
  {
    id: 'parent',
    title: 'Orang Tua',
    description: 'Saya ingin memantau anak',
    Icon: Heart,
    color: 'bg-[#B9895F]',
    emoji: '👨‍👩‍👧',
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDF6EE] flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10 relative overflow-hidden">
      <AnimatedBlobs />

      <div className="w-full max-w-5xl relative z-10">

        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#5D594C] hover:text-[#332F2D] mb-8 sm:mb-10 font-semibold transition-colors text-sm sm:text-base"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Beranda</span>
        </motion.button>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#332F2D] mb-3 sm:mb-4 leading-tight">
            Aku masuk sebagai...
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#5D594C]">
            Pilih peran yang sesuai dengan kamu! ✨
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {roles.map((role, index) => (
            <motion.button
              key={role.id}
              type="button"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/login/${role.id}`)}
              className="w-full h-full text-left cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B9895F]/40 rounded-3xl"
            >
              <div className="bg-white rounded-3xl p-6 sm:p-7 lg:p-8 shadow-md hover:shadow-xl transition-all relative overflow-hidden border border-[#BDB2A0]/30 text-center h-full min-h-[300px] sm:min-h-[320px] flex flex-col items-center justify-center">

                {/* Emoji */}
                <motion.div
                  animate={{ rotate: [0, -8, 8, -8, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                  className="text-6xl sm:text-7xl mb-4 sm:mb-6"
                >
                  {role.emoji}
                </motion.div>

                {/* Title */}
                <h3 className="text-2xl sm:text-3xl font-bold text-[#332F2D] mb-2 sm:mb-3">
                  {role.title}
                </h3>

                {/* Description */}
                <p className="text-sm sm:text-base text-[#5D594C] mb-5 sm:mb-6 min-h-[24px]">
                  {role.description}
                </p>

                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${role.color} text-white shadow-sm mb-3 sm:mb-4`}
                >
                  <role.Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>

                {/* Hover Indicator */}
                <div className="mt-2 text-[#B9895F] font-bold text-xs sm:text-sm group-hover:translate-x-1 transition-transform">
                  klik untuk masuk →
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 sm:mt-12 text-xs sm:text-sm text-[#5D594C] px-2"
        >
          Butuh bantuan? Hubungi guru atau admin sekolahmu 💬
        </motion.div>

      </div>
    </div>
  );
}
