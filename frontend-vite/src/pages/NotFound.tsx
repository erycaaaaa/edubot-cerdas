import { useNavigate } from 'react-router';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedBlobs } from '../components/AnimatedBlobs';
import { BingoLogo } from '../components/BingoLogo';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FDF6EE] text-[#332F2D] relative overflow-hidden font-sans">
      {/* Animated Gradient Blobs */}
      <AnimatedBlobs />

      <div className="text-center relative z-10 max-w-md mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <div className="p-5 bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-[#BDB2A0]/30 inline-block">
            <BingoLogo size={100} interactive={true} />
          </div>
        </motion.div>

        <h1 className="text-3xl sm:text-4xl font-bold text-[#332F2D] mb-4">
          Oops! Halaman Tidak Ditemukan
        </h1>
        <p className="text-[#5D594C] mb-8 leading-relaxed">
          Sepertinya halaman yang kamu cari tidak ada atau sudah dipindahkan. Yuk, kembali ke beranda bersama Bingo!
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#B9895F] hover:bg-[#A67950] text-white font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all"
        >
          <Home className="w-5 h-5" />
          Kembali ke Beranda
        </motion.button>
      </div>
    </div>
  );
}