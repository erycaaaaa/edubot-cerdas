import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Star, TrendingUp, Clock, Award, Calendar, Home, BarChart3, Bell, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBlobs } from '../components/AnimatedBlobs';
import { BingoLogo } from '../components/BingoLogo';
import { AccountMenu } from '../components/AccountMenu';
import { clearSession } from '../store/authStore';
import { useDesktopNavigation } from '../hooks/useDesktopNavigation';

type TabType = 'overview' | 'activity' | 'achievements';

const achievements = [
  { id: 1, title: 'Master Matematika', icon: '🏆', date: 'Kemarin', description: 'Menyelesaikan 10 soal matematika!' },
  { id: 2, title: 'Bintang Membaca', icon: '⭐', date: '2 hari lalu', description: 'Membaca 3 cerita minggu ini' },
  { id: 3, title: 'Pembelajar Ingin Tahu', icon: '🌟', date: '3 hari lalu', description: 'Bertanya 20 pertanyaan bagus' },
];

const recentSessions = [
  { date: 'Hari ini', topic: 'Pecahan', duration: '25 menit', questions: 8 },
  { date: 'Kemarin', topic: 'Tata Surya', duration: '30 menit', questions: 12 },
  { date: '2 hari lalu', topic: 'Perkalian', duration: '20 menit', questions: 15 },
  { date: '3 hari lalu', topic: 'Pemahaman Membaca', duration: '35 menit', questions: 6 },
  { date: '4 hari lalu', topic: 'Geografi', duration: '28 menit', questions: 10 },
];

export default function ParentDashboard() {
  const navigate = useNavigate();
  const desktopNavigation = useDesktopNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  async function logout() {
    try { await clearSession(); navigate('/'); }
    catch { setLogoutError('Belum berhasil keluar. Silakan coba lagi.'); }
  }

  return (
    <div className="h-screen flex bg-[#FDF6EE] relative overflow-hidden text-[#332F2D]">
      <AnimatedBlobs />

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || desktopNavigation) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white shadow-xl border-r border-[#BDB2A0]/25 flex flex-col"
            >
              <div className="p-6 border-b border-[#BDB2A0]/25">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <BingoLogo size={38} interactive={false} />
                    <span className="font-bold text-xl text-[#332F2D]">
                      Edu<span className="text-[#B9895F]">Bot</span>
                    </span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-[#FDF6EE] rounded-xl transition-colors text-[#5D594C]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-3.5 bg-[#B9895F]/15 border border-[#B9895F]/25 rounded-2xl">
                  <p className="font-bold text-[#332F2D]">Orang Tua Emma</p>
                  <p className="text-xs font-semibold text-[#B9895F]">Akun Orang Tua 👨‍👩‍👧</p>
                </div>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#B9895F] text-white rounded-2xl font-bold shadow-sm mb-2 transition-all">
                  <Home className="w-5 h-5" />Dashboard
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-[#5D594C] hover:bg-[#FDF6EE] hover:text-[#332F2D] rounded-2xl font-semibold mb-2 transition-colors">
                  <BarChart3 className="w-5 h-5 text-[#776938]" />Aktivitas
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-[#5D594C] hover:bg-[#FDF6EE] hover:text-[#332F2D] rounded-2xl font-semibold transition-colors">
                  <Bell className="w-5 h-5 text-[#B9895F]" />Notifikasi
                </button>
              </nav>
              <div className="p-4 border-t border-[#BDB2A0]/25">
                <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[#5D594C] hover:bg-[#FDF6EE] hover:text-[#332F2D] rounded-2xl font-semibold transition-colors">
                  <LogOut className="w-5 h-5" />Keluar
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div role="status" className="bg-olive-light px-6 py-3 text-txt-main">Pratinjau dashboard: semua data anak dan aktivitas di halaman ini adalah contoh, belum terhubung dengan akun anak.</div>
        {logoutError && <p role="alert" className="px-6 py-3 text-red-700">{logoutError}</p>}
        <header className="bg-white/90 backdrop-blur-md border-b border-[#BDB2A0]/25 px-6 py-4 flex items-center justify-between shadow-sm">
          <AccountMenu />
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-[#FDF6EE] rounded-xl transition-colors lg:hidden text-[#5D594C]">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-bold text-xl text-[#332F2D]">Dashboard Orang Tua</h1>
              <p className="text-sm text-[#5D594C]">Progres dan pemantauan belajar anak</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Child Profile Card */}
            <div className="bg-[#B9895F] rounded-3xl p-8 mb-6 text-white shadow-md relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-24 h-24 bg-white border border-[#BDB2A0]/30 rounded-full flex items-center justify-center text-5xl shadow-sm flex-shrink-0">🦁</div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-bold mb-2">Emma Johnson</h2>
                  <p className="text-lg text-white/90 mb-4">Kelas 3 • Usia 8 tahun</p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <span className="px-4 py-2 bg-white/20 rounded-full text-sm backdrop-blur-sm font-medium">📚 53 Topik Dipelajari</span>
                    <span className="px-4 py-2 bg-white/20 rounded-full text-sm backdrop-blur-sm font-medium">⏱️ 171 Menit Minggu Ini</span>
                    <span className="px-4 py-2 bg-white/20 rounded-full text-sm backdrop-blur-sm font-medium">🏆 12 Penghargaan</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#B9895F]/15 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#B9895F]" />
                  </div>
                  <span className="text-3xl font-bold text-[#332F2D]">171</span>
                </div>
                <p className="text-[#5D594C] font-medium">Menit Minggu Ini</p>
                <p className="text-sm text-[#776938] font-bold mt-1">↑ 15% dari minggu lalu</p>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#776938]/15 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#776938]" />
                  </div>
                  <span className="text-3xl font-bold text-[#332F2D]">12</span>
                </div>
                <p className="text-[#5D594C] font-medium">Topik Minggu Ini</p>
                <p className="text-sm text-[#776938] font-bold mt-1">Progres sangat bagus! ✨</p>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#B9895F]/15 flex items-center justify-center">
                    <Award className="w-6 h-6 text-[#B9895F]" />
                  </div>
                  <span className="text-3xl font-bold text-[#332F2D]">3</span>
                </div>
                <p className="text-[#5D594C] font-medium">Penghargaan Baru</p>
                <p className="text-sm text-[#B9895F] font-bold mt-1">Diraih minggu ini 🏅</p>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#776938]/15 flex items-center justify-center">
                    <Star className="w-6 h-6 text-[#776938]" />
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((star) => (
                      <Star key={star} className={`w-5 h-5 ${star <= 1 ? 'fill-[#776938] text-[#776938]' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-[#5D594C] font-medium">Status Peringatan</p>
                <p className="text-sm text-[#776938] font-bold mt-1">Aman & Terkendali ✨</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-[#BDB2A0]/30">
              {(['overview', 'activity', 'achievements'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all capitalize ${activeTab === tab ? 'bg-[#B9895F] text-white shadow-sm' : 'text-[#5D594C] hover:bg-[#FDF6EE]'}`}
                >
                  {tab === 'overview' ? 'Ringkasan' : tab === 'activity' ? 'Aktivitas Belajar' : 'Penghargaan'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30"
                >
                  <h3 className="font-bold text-lg mb-4 text-[#332F2D]">Notifikasi Aktivitas Terbaru</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl border border-[#776938]/20 bg-[#776938]/10">
                      <p className="text-[#332F2D] font-medium mb-1">Emma menerima pengingat ramah tentang kata-kata sopan saat belajar</p>
                      <p className="text-xs text-[#5D594C]">2 jam yang lalu</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-[#B9895F]/20 bg-[#B9895F]/10">
                      <p className="text-[#332F2D] font-medium mb-1">Emma berhasil meraih lencana Master Matematika! 🎉</p>
                      <p className="text-xs text-[#5D594C]">Kemarin</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-[#BDB2A0]/30 bg-[#FDF6EE]">
                      <p className="text-[#332F2D] font-medium mb-1">Emma menyelesaikan 5 sesi belajar dengan lancar minggu ini</p>
                      <p className="text-xs text-[#5D594C]">2 hari lalu</p>
                    </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30"
                >
                  <h3 className="font-bold text-lg mb-4 text-[#332F2D]">Sesi Belajar Terbaru</h3>
                  <div className="space-y-3">
                    {recentSessions.map((session, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-[#FDF6EE] border border-[#BDB2A0]/25 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white border border-[#BDB2A0]/30 rounded-2xl flex items-center justify-center shadow-sm">
                            <Calendar className="w-6 h-6 text-[#B9895F]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[#332F2D]">{session.topic}</h4>
                            <p className="text-xs text-[#5D594C]">{session.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#332F2D]">{session.duration}</p>
                          <p className="text-xs text-[#5D594C]">{session.questions} pertanyaan</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              {activeTab === 'achievements' && (
                <motion.div
                  key="achievements"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30 text-center hover:shadow-md transition-all">
                      <div className="text-6xl mb-4">{achievement.icon}</div>
                      <h4 className="font-bold text-lg text-[#332F2D] mb-2">{achievement.title}</h4>
                      <p className="text-[#5D594C] text-sm mb-2">{achievement.description}</p>
                      <p className="text-xs text-[#776938] font-bold">Diperoleh {achievement.date}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
