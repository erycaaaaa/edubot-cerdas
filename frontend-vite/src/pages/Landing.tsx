import { useState } from 'react';
import { AccountMenu } from '../components/AccountMenu';
import { useTheme } from '../hooks/useTheme';
import { useHomeAccount } from '../hooks/useHomeAccount';
import { AnimatedBlobs } from '../components/AnimatedBlobs';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Shield, Star, Users, TrendingUp, MessageCircle, Award, Heart, Sun, Moon, BookOpen } from 'lucide-react';

import { BingoLogo } from '../components/BingoLogo';

export default function Landing() {
  const navigate = useNavigate();
  const { account, checking, destination } = useHomeAccount();
  const { darkMode, toggleDarkMode } = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  const features = [
    {
      Icon: MessageCircle,
      color: 'bg-[#B9895F]/15 text-[#B9895F]',
      title: 'Chat Interaktif',
      description: 'Ngobrol dengan AI yang ramah dan selalu siap menjawab pertanyaan belajar'
    },
    {
      Icon: Shield,
      color: 'bg-[#776938]/15 text-[#776938]',
      title: 'Aman & Sopan',
      description: 'Sistem pengawasan otomatis untuk menjaga percakapan tetap positif dan edukatif'
    },
    {
      Icon: TrendingUp,
      color: 'bg-[#B9895F]/15 text-[#B9895F]',
      title: 'Pantau Progres',
      description: 'Guru dan orang tua bisa memantau perkembangan belajar anak secara real-time'
    }
  ];

  const steps = [
    {
      step: '1',
      Icon: Users,
      title: 'Pilih Peran',
      description: 'Masuk sebagai Siswa, Guru, atau Orang Tua',
      color: 'bg-[#B9895F]',
      textColor: 'text-[#B9895F]'
    },
    {
      step: '2',
      Icon: BookOpen,
      title: 'Daftar/Login',
      description: 'Buat akun atau masuk dengan akun yang sudah ada',
      color: 'bg-[#776938]',
      textColor: 'text-[#776938]'
    },
    {
      step: '3',
      Icon: Award,
      title: 'Mulai Belajar!',
      description: 'Chat dengan EduBot dan raih prestasi belajarmu!',
      color: 'bg-[#B9895F]',
      textColor: 'text-[#B9895F]'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDF6EE] text-[#332F2D] relative overflow-x-hidden transition-colors duration-300">

      <AnimatedBlobs />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-[#BDB2A0]/25 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="transition-transform duration-300 group-hover:scale-110">
              <BingoLogo size={48} interactive={false} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#332F2D]">
              Edu<span className="text-[#B9895F]">Bot</span>
            </span>
          </div>

          <AccountMenu />
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-10">
            <div className="flex gap-8">
              {['Home', 'About', 'How It Works'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                  className="text-sm font-semibold text-[#5D594C] hover:text-[#B9895F] transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-[#B9895F] after:transition-all hover:after:w-full"
                >
                  {item}
                </a>
              ))}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[#FDF6EE] hover:bg-[#F3E8DB] transition-colors border border-[#BDB2A0]/30"
              aria-label={darkMode ? "Aktifkan tema terang" : "Aktifkan tema gelap"} aria-pressed={darkMode}
            >
              {darkMode
                ? <Sun className="w-5 h-5 text-[#B9895F]" />
                : <Moon className="w-5 h-5 text-[#5D594C]" />
              }
            </button>

            <button
              disabled={checking}
              onClick={() => navigate(destination)}
              className="px-7 py-2.5 bg-[#B9895F] hover:bg-[#A67950] text-white rounded-full font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              {checking ? 'Memuat akun...' : account ? `Halo, ${account.name}` : 'Login'}
            </button>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#FDF6EE] border border-[#BDB2A0]/30 transition-colors"
              aria-label={darkMode ? "Aktifkan tema terang" : "Aktifkan tema gelap"} aria-pressed={darkMode}
            >
              {darkMode
                ? <Sun className="w-4 h-4 text-[#B9895F]" />
                : <Moon className="w-4 h-4 text-[#5D594C]" />
              }
            </button>
            <button
              disabled={checking}
              onClick={() => navigate(destination)}
              className="px-4 py-2 bg-[#B9895F] hover:bg-[#A67950] text-white rounded-full font-bold shadow-sm"
            >
              {checking ? 'Memuat akun...' : account ? `Halo, ${account.name}` : 'Login'}
            </button>
          </div>

        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="max-w-7xl mx-auto px-6 py-16 md:py-24 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-2 bg-[#B9895F]/15 border border-[#B9895F]/20 rounded-full mb-6"
            >
              <span className="text-[#B9895F] font-semibold text-sm">✨ AI Learning Companion</span>
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-bold text-[#332F2D] mb-6 leading-tight">
              Belajar Jadi Seru Bersama EduBot!
            </h1>

            <p className="text-xl text-[#5D594C] mb-8 leading-relaxed">
              Teman AI ramah yang membantu anak-anak belajar dengan cara yang menyenangkan, aman, dan sopan!
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={checking}
              onClick={() => navigate(destination)}
                className="px-8 py-4 bg-[#B9895F] hover:bg-[#A67950] text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {account ? (account.role === 'student' ? 'Lanjut Belajar' : 'Buka Dashboard') : 'Mulai Belajar'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={checking}
              onClick={() => navigate(destination)}
                className="px-8 py-4 bg-white border-2 border-[#B9895F] text-[#B9895F] rounded-2xl font-semibold text-lg shadow-md hover:shadow-lg transition-all hover:bg-[#FDF6EE]"
              >
                {account ? 'Kembali ke akun saya' : 'Untuk Guru & Orang Tua'}
              </motion.button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6 mt-12">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#776938]" />
                <span className="text-sm text-[#5D594C] font-medium">100% Aman</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#B9895F]" />
                <span className="text-sm text-[#5D594C] font-medium">Ramah Anak</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#776938]" />
                <span className="text-sm text-[#5D594C] font-medium">Belajar dengan Hati</span>
              </div>
            </div>
          </motion.div>

          {/* Right - Mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative z-10"
            >
              <div className="flex justify-center items-center">
                <div className="relative group flex flex-col items-center">
                  {/* Tooltip */}
                  <div
                    className="
                    absolute -top-12 left-1/2 -translate-x-1/2
                    scale-0 group-hover:scale-100 group-focus-within:scale-100
                    transition-all duration-300
                    bg-[#332F2D] text-white text-xs font-semibold
                    px-4 py-2 rounded-lg shadow-xl whitespace-nowrap
                    pointer-events-none z-20
                    after:content-[''] after:absolute after:top-full
                    after:left-1/2 after:-translate-x-1/2
                    after:border-8 after:border-x-transparent
                    after:border-b-transparent after:border-t-[#332F2D]
                  "
                  >
                    Ayo mulai belajar! 🚀
                  </div>

                  {/* SVG  */}
                  <div className="w-[280px] h-[280px] md:w-[200px] md:h-[200px]">
                    <BingoLogo size="100%" interactive />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-10 right-10 w-16 h-16 bg-white border border-[#BDB2A0]/30 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
            >
              📚
            </motion.div>

            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute bottom-20 left-10 w-16 h-16 bg-white border border-[#BDB2A0]/30 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
            >
              ⭐
            </motion.div>

            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute top-1/2 left-0 w-12 h-12 bg-white border border-[#BDB2A0]/30 rounded-full flex items-center justify-center text-2xl shadow-lg"
            >
              🎨
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-white py-20 relative z-10 border-y border-[#BDB2A0]/20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-[#332F2D] mb-4">
              Kenapa Memilih EduBot? 🤔
            </h2>
            <p className="text-xl text-[#5D594C] max-w-2xl mx-auto">
              Platform pembelajaran yang dirancang khusus untuk anak-anak dengan pengawasan penuh untuk guru dan orang tua
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="bg-[#FDF6EE] rounded-3xl p-8 text-center hover:shadow-xl transition-all border border-[#BDB2A0]/30"
              >
                <div className={`${feature.color} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm`}>
                  <feature.Icon className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-[#332F2D] mb-3">{feature.title}</h3>
                <p className="text-[#5D594C] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="py-20 bg-[#FDF6EE] relative z-10 transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto px-6">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-[#332F2D] mb-4">
              Cara Kerjanya 📖
            </h2>

            <p className="text-xl text-[#5D594C] max-w-2xl mx-auto">
              Mulai belajar hanya dalam 3 langkah mudah!
            </p>
          </motion.div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-12 relative">

            {/* Connector */}
            <div
              className="
              hidden md:block
              absolute
              top-8
              left-[16.67%]
              right-[16.67%]
              h-10
              bg-[#BDB2A0]/35
              rounded-full
              z-0
            "
            />

            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="relative z-10"
              >
                <div className="text-center">

                  {/* Icon + Number */}
                  <div className="relative w-24 h-24 mx-auto mb-6">

                    {/* Number */}
                    <div
                      className={`
                        absolute
                        -top-2
                        -left-2
                        w-10
                        h-10
                        bg-white
                        border
                        border-[#BDB2A0]/30
                        rounded-full
                        flex
                        items-center
                        justify-center
                        text-lg
                        font-bold
                        ${step.textColor}
                        shadow-md
                        z-20
                      `}
                    >
                      {step.step}
                    </div>

                    {/* Main Icon */}
                    <div
                      className={`
                        ${step.color}
                        w-24
                        h-24
                        rounded-full
                        flex
                        items-center
                        justify-center
                        shadow-lg
                        text-white
                        relative
                        z-10
                      `}
                    >
                      <step.Icon className="w-10 h-10" />
                    </div>

                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-[#332F2D] mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#5D594C] max-w-xs mx-auto">
                    {step.description}
                  </p>

                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={checking}
              onClick={() => navigate(destination)}
              className="
                px-10
                py-5
                bg-[#B9895F]
                hover:bg-[#A67950]
                text-white
                rounded-2xl
                font-bold
                text-xl
                shadow-lg
                hover:shadow-xl
                transition-all
              "
            >
              Yuk, Mulai Sekarang!
            </motion.button>
          </motion.div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 relative z-10 border-t border-[#BDB2A0]/30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BingoLogo size={80} interactive={false} />
            <span className="text-2xl font-bold text-[#332F2D]">
              Edu<span className="text-[#B9895F]">Bot</span>
            </span>
          </div>
          <p className="text-sm text-[#5D594C]">© 2026 EduBot. Semua hak dilindungi.</p>
        </div>
      </footer>

      <style>{`
        @keyframes helpPopIn {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes helpPopOut {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
        }
      `}</style>

      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHelp((prev) => !prev)}
            aria-label="Bantuan"
            className="group flex h-14 w-14 items-center justify-center rounded-full border border-[#B9895F]/20 bg-[#B9895F] text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-7 w-7 transition-transform duration-300 ${showHelp ? 'rotate-12 scale-110' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" className="animate-pulse" />
              <path d="M9.09 9a3 3 0 1 1 5.82 1c-1.1 1.3-2.24 1.94-2.24 3.5" />
              <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
            </svg>
          </button>

          <div
            key={showHelp ? 'help-open' : 'help-closed'}
            style={{
              animation: showHelp ? 'helpPopIn 0.25s ease-out forwards' : 'helpPopOut 0.2s ease-in forwards',
              opacity: showHelp ? 1 : 0,
              visibility: showHelp ? 'visible' : 'hidden',
              pointerEvents: showHelp ? 'auto' : 'none',
              transform: showHelp ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
            }}
            className="absolute bottom-16 right-0 w-56 rounded-2xl bg-[#332F2D] px-4 py-3 text-sm text-white shadow-xl"
          >
            <p className="font-semibold text-[#F9D7B5]">Butuh bantuan?</p>
            <p className="mt-1 text-[#F4EDE6]">Klik tombol login untuk mulai belajar atau masuk ke akunmu.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
