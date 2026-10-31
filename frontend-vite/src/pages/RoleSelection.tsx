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
    textColor: 'text-[#B9895F]',
    emoji: '🎒'
  },
  {
    id: 'teacher',
    title: 'Guru',
    description: 'Saya ingin memantau murid',
    Icon: Users,
    color: 'bg-[#776938]',
    textColor: 'text-[#776938]',
    emoji: '👩‍🏫'
  },
  {
    id: 'parent',
    title: 'Orang Tua',
    description: 'Saya ingin memantau anak',
    Icon: Heart,
    color: 'bg-[#B9895F]',
    textColor: 'text-[#B9895F]',
    emoji: '👨‍👩‍👧'
  }
];

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDF6EE] flex items-center justify-center p-6 relative overflow-hidden">
      <AnimatedBlobs />

      <div className="w-full max-w-5xl relative z-10">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#5D594C] hover:text-[#332F2D] mb-8 font-semibold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Beranda</span>
        </motion.button>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-[#332F2D] mb-4">
            Aku masuk sebagai...
          </h1>
          <p className="text-xl text-[#5D594C]">
            Pilih peran yang sesuai dengan kamu! ✨
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/login/${role.id}`)}
              className="cursor-pointer group"
            >
              <div className="bg-white rounded-3xl p-8 shadow-md hover:shadow-xl transition-all relative overflow-hidden border border-[#BDB2A0]/30 text-center">
                {/* Emoji */}
                <motion.div
                  animate={{
                    rotate: [0, -8, 8, -8, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="text-7xl mb-6 flex justify-center"
                >
                  {role.emoji}
                </motion.div>

                {/* Title */}
                <h3 className="text-3xl font-bold text-[#332F2D] mb-3">
                  {role.title}
                </h3>

                {/* Description */}
                <p className="text-[#5D594C] mb-6 min-h-[48px]">
                  {role.description}
                </p>

                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${role.color} text-white shadow-sm mb-4`}>
                  <role.Icon className="w-8 h-8" />
                </div>

                {/* Hover Indicator */}
                <div className="mt-4 text-[#B9895F] font-bold text-sm group-hover:translate-x-1 transition-transform">
                  klik untuk masuk
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-sm text-[#5D594C]"
        >
          Butuh bantuan? Hubungi guru atau admin sekolahmu 💬
        </motion.div>
      </div>
    </div>
  );
}