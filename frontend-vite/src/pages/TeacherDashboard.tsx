


import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, AlertCircle, TrendingUp, Users, BookOpen, Home, BarChart3, Bell, X, Menu, AlertTriangle, ShieldAlert, CheckCheck, RotateCcw, School, Search, ChevronRight, Eye, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getTeacherStudents,
  getTeacherNotifications,
  markTeacherNotificationRead,
  markAllTeacherNotificationsRead,
  resetStudentStrikes,
} from '../services/apiClient';
import {
  getSession,
  clearSession,
} from '../store/authStore';
import { AnimatedBlobs } from '../components/AnimatedBlobs';
import { BingoLogo } from '../components/BingoLogo';
import { AccountMenu } from '../components/AccountMenu';
import { useDesktopNavigation } from '../hooks/useDesktopNavigation';

// ─── Strike Dot Component ──────────────────
function StrikeDot({ index, active, total }: { index: number; active: boolean; total: number }) {
  const bgColor = !active
    ? '#E5E7EB'
    : total === 1 ? '#FFD700' : total === 2 ? '#FF8C00' : '#FF4444';

  return (
    <motion.div
      animate={active ? { scale: [1, 1.2, 1] } : {}}
      transition={active ? { duration: 1.2, repeat: Infinity } : {}}
      className="w-5 h-5 rounded-full flex items-center justify-center"
      style={{ backgroundColor: bgColor }}
    >
      {active ? (
        <span className="text-[8px]">🚫</span>
      ) : (
        <span className="text-[8px] text-gray-400">{index}</span>
      )}
    </motion.div>
  );
}

interface StudentRow {
  id: number;
  studentId?: string;
  email: string;
  name: string;
  avatar: string;
  grade: string;
  warnings: number;
  sessionsThisWeek: null;
  topicsLearned: null;
  recentActivity: string;
}

interface TeacherNotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  studentName: string;
  studentAvatar: string;
  schoolId: string;
  level: 1 | 2 | 3;
  timestamp: string;
  read: boolean;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const desktopNavigation = useDesktopNavigation();
  const [session] = useState(() => getSession());
  const [dataError, setDataError] = useState('');
  const [loading, setLoading] = useState(true);
  const refreshInFlight = useRef(false);
  const mounted = useRef(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<TeacherNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [activeNav, setActiveNav] = useState<'dashboard' | 'siswa' | 'laporan' | 'notifikasi'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!session || session.role !== 'teacher') navigate('/login/teacher', { replace: true });
  }, [session, navigate]);

  const refreshData = useCallback(async () => {
    if (!session || session.role !== 'teacher' || refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const [fetchedStudents, fetchedNotifs] = await Promise.all([
        getTeacherStudents(), getTeacherNotifications(),
      ]);
      if (!mounted.current) return;
      const mappedNotifs: TeacherNotificationItem[] = fetchedNotifs.map(n => ({
        id: n.id, type: n.type, title: n.title, description: n.description,
        studentName: n.student_name, studentAvatar: n.student_avatar || '🦁',
        schoolId: n.school_id, level: n.strike_level, timestamp: n.created_at,
        read: Boolean(n.is_read),
      }));
      setNotifications(mappedNotifs);
      setUnreadCount(mappedNotifs.filter(n => !n.read).length);
      const mapped = fetchedStudents.map((student, i): StudentRow => ({
        id: i + 1, studentId: student.id, email: student.email, name: student.name,
        avatar: student.avatar || '🦁', grade: student.grade ? `Kelas ${student.grade}` : 'Kelas -',
        warnings: student.strike_count, sessionsThisWeek: null, topicsLearned: null,
        recentActivity: 'Statistik aktivitas belajar belum tersedia.',
      }));
      setStudents(mapped);
      setSelectedStudent(previous => previous ? mapped.find(student => student.studentId === previous.studentId) ?? null : null);
      setDataError('');
    } catch {
      if (mounted.current) setDataError('Data sekolah belum dapat diperbarui. Data yang masih terlihat mungkin belum terbaru. Silakan coba lagi.');
    } finally {
      refreshInFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    mounted.current = true;
    void refreshData();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshData();
    }, 10000);
    return () => { mounted.current = false; clearInterval(interval); };
  }, [refreshData]);

  const handleMarkAllRead = async () => {
    try {
      await markAllTeacherNotificationsRead();
    } catch (err) {
      console.warn('Mark all read error:', err);
      setDataError('Notifikasi belum berhasil ditandai. Silakan coba lagi.');
      return;
    }
    await refreshData();
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markTeacherNotificationRead(id);
    } catch (err) {
      console.warn('Mark read error:', err);
      setDataError('Notifikasi belum berhasil ditandai. Silakan coba lagi.');
      return;
    }
    await refreshData();
  };

  const handleResetStrikes = async (studentIdOrEmail: string) => {
    const target = students.find((s) => s.email === studentIdOrEmail || s.studentId === studentIdOrEmail);
    const id = target?.studentId || studentIdOrEmail;
    try {
      await resetStudentStrikes(id);
    } catch (err) {
      console.warn('Backend reset strikes error:', err);
      setDataError('Strike belum berhasil direset. Silakan coba lagi.');
      return;
    }
    await refreshData();
  };

  const handleLogout = async () => {
    try { await clearSession(); navigate('/'); }
    catch { setDataError('Belum berhasil keluar. Silakan coba lagi.'); }
  };

  const totalWarnings = students.reduce((acc, s) => acc + s.warnings, 0);
  const criticalStudents = students.filter(s => s.warnings >= 3);

  const getWarningBadge = (count: number) => {
    if (count === 0) return { label: 'Aman', bg: '#E8F5E9', color: '#4CAF50' };
    if (count === 1) return { label: 'Ringan', bg: '#FFF8E7', color: '#FFD700' };
    if (count === 2) return { label: 'Sedang', bg: '#FFF0E0', color: '#FF8C00' };
    return { label: 'Berat', bg: '#FFE8E8', color: '#FF4444' };
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  if (!session || session.role !== 'teacher') return null;

  return (
    <div className="h-screen flex bg-[#FDF6EE] relative overflow-hidden text-[#332F2D]">
      <AnimatedBlobs />

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || desktopNavigation) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} className="fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white shadow-xl border-r border-[#BDB2A0]/25 flex flex-col">
              <div className="p-6 border-b border-[#BDB2A0]/25">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <BingoLogo size={38} interactive={false} />
                    <span className="font-bold text-xl text-[#332F2D]">
                      Edu<span className="text-[#B9895F]">Bot</span>
                    </span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-[#FDF6EE] rounded-xl transition-colors text-[#5D594C]"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-3.5 bg-[#776938]/10 border border-[#776938]/25 rounded-2xl">
                  <p className="font-bold text-[#332F2D]">{session.name}</p>
                  <p className="text-xs font-semibold text-[#776938]">Guru Pembimbing 👩‍🏫</p>
                  <p className="text-xs text-[#5D594C] mt-0.5 truncate">{session.email}</p>
                </div>
                {/* School Badge */}
                <div className="mt-2.5 p-2.5 bg-[#B9895F]/10 border border-[#B9895F]/20 rounded-xl flex items-center gap-2">
                  <School className="w-4 h-4 text-[#B9895F]" />
                  <span className="text-xs text-[#332F2D] font-semibold truncate">{session.schoolName}</span>
                </div>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                <button
                  onClick={() => { setActiveNav('dashboard'); setNotifPanelOpen(false); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold mb-2 transition-all ${activeNav === 'dashboard' ? 'bg-[#776938] text-white shadow-sm font-bold' : 'text-[#5D594C] hover:bg-[#FDF6EE] hover:text-[#332F2D]'}`}
                >
                  <Home className="w-5 h-5" />Dashboard
                </button>
                <button
                  onClick={() => { setActiveNav('siswa'); setNotifPanelOpen(false); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold mb-2 transition-all ${activeNav === 'siswa' ? 'bg-[#B9895F] text-white shadow-sm font-bold' : 'text-[#5D594C] hover:bg-[#FDF6EE] hover:text-[#332F2D]'}`}
                >
                  <Users className="w-5 h-5" />Siswa ({students.length})
                </button>
                <button
                  onClick={() => { setActiveNav('laporan'); setNotifPanelOpen(false); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold mb-2 transition-all ${activeNav === 'laporan' ? 'bg-[#776938] text-white shadow-sm font-bold' : 'text-[#5D594C] hover:bg-[#FDF6EE] hover:text-[#332F2D]'}`}
                >
                  <BarChart3 className="w-5 h-5" />Laporan
                </button>
                <button
                  onClick={() => { setActiveNav('notifikasi'); setNotifPanelOpen(true); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all relative ${activeNav === 'notifikasi' ? 'bg-[#B9895F] text-white shadow-sm font-bold' : 'text-[#5D594C] hover:bg-[#FDF6EE] hover:text-[#332F2D]'}`}
                >
                  <Bell className="w-5 h-5" />
                  Notifikasi
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-[#FF4444] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{unreadCount}</span>
                  )}
                </button>
              </nav>
              <div className="p-4 border-t border-[#BDB2A0]/25">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[#5D594C] hover:bg-[#FDF6EE] hover:text-[#332F2D] rounded-2xl font-semibold transition-colors">
                  <LogOut className="w-5 h-5" />Keluar
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {loading && <p role="status" className="bg-white px-6 py-3">Memuat data sekolah...</p>}
        {dataError && <div role="alert" className="bg-red-50 px-6 py-3 text-red-800">
          <p>{dataError}</p><button type="button" onClick={() => void refreshData()} className="mt-2 underline">Coba lagi</button>
        </div>}
        <header className="bg-white/90 backdrop-blur-md border-b border-[#BDB2A0]/25 px-6 py-4 flex items-center justify-between shadow-sm">
          <AccountMenu />
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-[#FDF6EE] rounded-xl transition-colors lg:hidden text-[#5D594C]">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-xl text-[#332F2D]">
                  {activeNav === 'dashboard' && 'Dashboard Guru'}
                  {activeNav === 'siswa' && 'Daftar Siswa'}
                  {activeNav === 'laporan' && 'Laporan'}
                  {activeNav === 'notifikasi' && 'Notifikasi'}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#5D594C]">
                <School className="w-3.5 h-3.5 text-[#B9895F]" />
                <span className="font-medium">{session.schoolName}</span>
                <span className="text-[#BDB2A0]">•</span>
                <span>{session.name}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setNotifPanelOpen(!notifPanelOpen); setActiveNav(notifPanelOpen ? 'dashboard' : 'notifikasi'); }}
            className="relative p-2.5 hover:bg-[#FDF6EE] rounded-xl transition-colors text-[#5D594C] hover:text-[#332F2D]"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 bg-[#FF4444] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>
        </header>

        {/* Critical Alert Banner */}
        <AnimatePresence>
          {criticalStudents.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#FFE8E8] border-b-2 border-[#FF4444] px-6 py-3 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-[#FF4444] flex-shrink-0" />
              <p className="text-sm text-[#332F2D]">
                <span className="font-bold text-[#FF4444]">Perhatian!</span> {criticalStudents.map(s => s.name).join(', ')} telah mendapat 3 strike.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">

            {/* Notification Panel */}
            <AnimatePresence>
              {notifPanelOpen && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
                  <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-[#BDB2A0]/30">
                    <div className="p-5 border-b border-[#BDB2A0]/25 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-[#B9895F]" />
                        <h3 className="font-bold text-lg text-[#332F2D]">Notifikasi Strike</h3>
                        {unreadCount > 0 && <span className="bg-[#FF4444] text-white text-xs px-2.5 py-0.5 rounded-full font-bold">{unreadCount} baru</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-sm text-[#776938] hover:text-[#66592F] transition-colors font-medium">
                            <CheckCheck className="w-4 h-4" />Tandai semua dibaca
                          </button>
                        )}
                        <button onClick={() => { setNotifPanelOpen(false); setActiveNav('dashboard'); }} className="p-1 hover:bg-[#FDF6EE] rounded-lg text-[#5D594C]">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-[#BDB2A0] mx-auto mb-3" />
                        <p className="text-[#5D594C] font-semibold">Belum ada notifikasi strike</p>
                        <p className="text-sm text-[#5D594C]/70 mt-1">Notifikasi akan muncul ketika siswa di {session.schoolName} mendapat peringatan</p>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto divide-y divide-[#BDB2A0]/20">
                        {notifications.map((notif) => (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`p-4 flex gap-4 cursor-pointer hover:bg-[#FDF6EE]/60 transition-colors ${!notif.read ? 'bg-[#FDF6EE]' : ''}`}
                            onClick={() => handleMarkRead(notif.id)}
                          >
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl relative border border-[#BDB2A0]/25" style={{ backgroundColor: notif.level === 1 ? '#FFF3D6' : notif.level === 2 ? '#FFE0C0' : '#FFD6D6' }}>
                                {notif.studentAvatar}
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center" style={{ backgroundColor: notif.level === 1 ? '#FFD700' : notif.level === 2 ? '#FF8C00' : '#FF4444' }}>
                                  <span className="text-white text-[8px] font-bold">{notif.level}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm text-[#332F2D] ${!notif.read ? 'font-bold' : ''}`}>{notif.title}</p>
                                {!notif.read && <div className="w-2 h-2 rounded-full bg-[#B9895F] flex-shrink-0 mt-1.5" />}
                              </div>
                              <p className="text-xs text-[#5D594C] mt-1 line-clamp-2">{notif.description}</p>
                              <p className="text-xs text-[#5D594C]/60 mt-1">{formatTime(notif.timestamp)}</p>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs text-white font-semibold" style={{ backgroundColor: notif.level === 1 ? '#FFD700' : notif.level === 2 ? '#FF8C00' : '#FF4444' }}>
                                {notif.level === 1 ? 'Ringan' : notif.level === 2 ? 'Sedang' : 'Berat'}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ══════════ DASHBOARD VIEW ══════════ */}
            {activeNav === 'dashboard' && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30 cursor-pointer" onClick={() => setActiveNav('siswa')}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#B9895F]/15 flex items-center justify-center">
                        <Users className="w-6 h-6 text-[#B9895F]" />
                      </div>
                      <span className="text-3xl font-bold text-[#332F2D]">{students.length}</span>
                    </div>
                    <p className="text-[#5D594C] font-medium">Siswa di Sekolah</p>
                    <p className="text-xs text-[#B9895F] font-bold mt-1 flex items-center gap-1">Lihat semua <ChevronRight className="w-3 h-3" /></p>
                  </motion.div>
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#776938]/15 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-[#776938]" />
                      </div>
                      <span className="text-3xl font-bold text-[#332F2D]">—</span>
                    </div>
                    <p className="text-[#5D594C] font-medium">Sesi Minggu Ini</p>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#BDB2A0]/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#B9895F]/15 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-[#B9895F]" />
                      </div>
                      <span className="text-3xl font-bold text-[#332F2D]">—</span>
                    </div>
                    <p className="text-[#5D594C] font-medium">Topik Dipelajari</p>
                  </div>
                  <div className={`bg-white rounded-3xl p-6 shadow-sm border ${totalWarnings > 0 ? (totalWarnings >= 3 ? 'border-[#FF4444]' : 'border-[#FF8C00]') : 'border-[#BDB2A0]/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#FF8C00]/15 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" style={{ color: totalWarnings >= 3 ? '#FF4444' : '#FF8C00' }} />
                      </div>
                      <span className="text-3xl font-bold text-[#332F2D]">{totalWarnings}</span>
                    </div>
                    <p className="text-[#5D594C] font-medium">Total Strike</p>
                  </div>
                </div>

                {/* Critical Students Alert */}
                <AnimatePresence>
                  {criticalStudents.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
                      <div className="bg-[#FFE8E8] rounded-3xl p-5 border border-[#FF4444]">
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldAlert className="w-6 h-6 text-[#FF4444]" />
                          <h3 className="font-bold text-[#332F2D]">Siswa dengan 3 Strike — Perlu Perhatian!</h3>
                        </div>
                        <div className="space-y-3">
                          {criticalStudents.map((student) => (
                            <div key={student.id} className="bg-white rounded-2xl p-4 flex items-center justify-between gap-4 border border-[#FF4444]/20 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#FFE8E8] rounded-full flex items-center justify-center text-xl shadow-sm">{student.avatar}</div>
                                <div>
                                  <p className="font-bold text-[#332F2D]">{student.name}</p>
                                  <p className="text-xs text-[#5D594C]">{student.grade} • {student.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex gap-1">
                                  {[1, 2, 3].map((s) => (
                                    <StrikeDot key={s} index={s} active={true} total={3} />
                                  ))}
                                </div>
                                <button
                                  onClick={() => handleResetStrikes(student.email)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-[#776938] hover:bg-[#66592F] text-white rounded-xl text-sm font-semibold hover:shadow-md transition-all"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />Reset
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick Student Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-[#BDB2A0]/30 overflow-hidden">
                  <div className="p-6 border-b border-[#BDB2A0]/25 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-[#332F2D]">Siswa — {session.schoolName}</h3>
                    <button onClick={() => setActiveNav('siswa')} className="flex items-center gap-1 text-sm text-[#B9895F] hover:text-[#A67950] font-bold">
                      Lihat semua <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {students.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="w-16 h-16 text-[#BDB2A0] mx-auto mb-4" />
                      <p className="text-[#5D594C] font-semibold">Belum ada siswa terdaftar di sekolah ini</p>
                      <p className="text-sm text-[#5D594C]/70 mt-1">Siswa akan muncul setelah mendaftar dengan email @{session.schoolId}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#FDF6EE] border-b border-[#BDB2A0]/25">
                          <tr>
                            <th className="px-6 py-3.5 text-left text-sm font-bold text-[#332F2D]">Siswa</th>
                            <th className="px-6 py-3.5 text-left text-sm font-bold text-[#332F2D]">Kelas</th>
                            <th className="px-6 py-3.5 text-left text-sm font-bold text-[#332F2D]">Strike</th>
                            <th className="px-6 py-3.5 text-left text-sm font-bold text-[#332F2D]">Status</th>
                            <th className="px-6 py-3.5 text-left text-sm font-bold text-[#332F2D]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#BDB2A0]/20">
                          {students.slice(0, 5).map((student) => {
                            const badge = getWarningBadge(student.warnings);
                            return (
                              <tr key={student.id} className="hover:bg-[#FDF6EE]/50 transition-colors">
                                <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#FDF6EE] border border-[#BDB2A0]/30 rounded-full flex items-center justify-center text-xl shadow-sm">{student.avatar}</div>
                                    <div>
                                      <span className="font-bold text-[#332F2D]">{student.name}</span>
                                      <p className="text-xs text-[#5D594C]">{student.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-[#5D594C] font-medium">{student.grade}</td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-1">
                                    {[1, 2, 3].map((s) => (
                                      <StrikeDot key={s} index={s} active={s <= student.warnings} total={student.warnings} />
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: badge.bg, color: badge.color }}>
                                    {badge.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <button onClick={() => setSelectedStudent(student)} className="px-3 py-1.5 bg-[#B9895F]/15 hover:bg-[#B9895F]/25 text-[#B9895F] font-bold rounded-xl text-sm transition-all shadow-sm">
                                    Detail
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {students.length > 5 && (
                        <div className="p-4 text-center border-t border-[#BDB2A0]/25">
                          <button onClick={() => setActiveNav('siswa')} className="text-sm text-[#B9895F] font-bold hover:underline">
                            Lihat {students.length - 5} siswa lainnya →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══════════ SISWA VIEW ══════════ */}
            {activeNav === 'siswa' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* Back Button */}
                <button
                  onClick={() => setActiveNav('dashboard')}
                  className="flex items-center gap-2 text-[#5D594C] hover:text-[#332F2D] mb-4 font-semibold transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Kembali ke Dashboard</span>
                </button>

                {/* Search & Filter Bar */}
                <div className="bg-white rounded-3xl shadow-sm p-5 mb-6 border border-[#BDB2A0]/30">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#BDB2A0]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari siswa berdasarkan nama atau email..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#776938] focus:outline-none transition-colors text-[#332F2D]"
                      />
                    </div>
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="px-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#776938] focus:outline-none text-[#332F2D] bg-white font-medium"
                    >
                      <option value="all">Semua Kelas</option>
                      {[1,2,3,4,5,6].map(g => (
                        <option key={g} value={`Kelas ${g}`}>Kelas {g}</option>
                      ))}
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2.5 rounded-2xl border-2 border-gray-200 focus:border-[#776938] focus:outline-none text-[#332F2D] bg-white font-medium"
                    >
                      <option value="all">Semua Status</option>
                      <option value="aman">Aman (0 Strike)</option>
                      <option value="ringan">Ringan (1 Strike)</option>
                      <option value="sedang">Sedang (2 Strike)</option>
                      <option value="berat">Berat (3 Strike)</option>
                    </select>
                  </div>
                </div>

                {/* Student Cards */}
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const filtered = students.filter(s => {
                    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
                    const matchGrade = filterGrade === 'all' || s.grade === filterGrade;
                    const matchStatus =
                      filterStatus === 'all' ||
                      (filterStatus === 'aman' && s.warnings === 0) ||
                      (filterStatus === 'ringan' && s.warnings === 1) ||
                      (filterStatus === 'sedang' && s.warnings === 2) ||
                      (filterStatus === 'berat' && s.warnings >= 3);
                    return matchSearch && matchGrade && matchStatus;
                  });

                  if (students.length === 0) return (
                    <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-[#BDB2A0]/30">
                      <Users className="w-16 h-16 text-[#BDB2A0] mx-auto mb-4" />
                      <p className="text-[#5D594C] font-semibold">Belum ada siswa terdaftar di sekolah ini</p>
                      <p className="text-sm text-[#5D594C]/70 mt-1">Siswa akan muncul setelah mendaftar dengan email @{session.schoolId}</p>
                    </div>
                  );

                  if (filtered.length === 0) return (
                    <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-[#BDB2A0]/30">
                      <Search className="w-12 h-12 text-[#BDB2A0] mx-auto mb-3" />
                      <p className="text-[#5D594C] font-semibold">Tidak ada siswa yang cocok</p>
                      <p className="text-sm text-[#5D594C]/70 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                    </div>
                  );

                  return (
                    <>
                      <p className="text-sm text-[#5D594C] mb-4 font-medium">Menampilkan {filtered.length} dari {students.length} siswa</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((student) => {
                          const badge = getWarningBadge(student.warnings);
                          return (
                            <motion.div
                              key={student.id}
                              whileHover={{ scale: 1.02, y: -2 }}
                              className="bg-white rounded-3xl shadow-sm p-5 cursor-pointer border border-[#BDB2A0]/30 hover:border-[#776938] transition-all"
                              onClick={() => setSelectedStudent(student)}
                            >
                              <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-[#FDF6EE] border border-[#BDB2A0]/30 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm">
                                  {student.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="font-bold text-[#332F2D] truncate">{student.name}</h4>
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: badge.bg, color: badge.color }}>
                                      {badge.label}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#5D594C] truncate mt-0.5">{student.email}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className="text-xs text-[#776938] bg-[#776938]/10 font-semibold px-2 py-0.5 rounded-full">{student.grade}</span>
                                    <div className="flex gap-1">
                                      {[1, 2, 3].map((s) => (
                                        <StrikeDot key={s} index={s} active={s <= student.warnings} total={student.warnings} />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-[#BDB2A0]/20 flex items-center justify-between">
                                <div className="flex gap-4">
                                  <div className="text-center">
                                    <p className="text-xs text-[#5D594C]">Sesi</p>
                                    <p className="font-bold text-[#332F2D]">{student.sessionsThisWeek ?? 'Belum tersedia'}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-[#5D594C]">Topik</p>
                                    <p className="font-bold text-[#332F2D]">{student.topicsLearned ?? 'Belum tersedia'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {student.warnings > 0 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleResetStrikes(student.email); }}
                                      className="p-2 hover:bg-[#FDF6EE] rounded-xl transition-colors text-[#5D594C] hover:text-[#332F2D]"
                                      title="Reset Strike"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}
                                    className="flex items-center gap-1 px-3.5 py-1.5 bg-[#776938]/15 hover:bg-[#776938]/25 text-[#776938] rounded-xl text-xs font-bold transition-all shadow-sm"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Detail
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}

            {/* ══════════ LAPORAN VIEW ══════════ */}
            {activeNav === 'laporan' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <button
                  onClick={() => setActiveNav('dashboard')}
                  className="flex items-center gap-2 text-[#5D594C] hover:text-[#332F2D] mb-4 font-semibold transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Kembali ke Dashboard</span>
                </button>
                <div className="bg-white rounded-3xl shadow-sm p-12 text-center border border-[#BDB2A0]/30">
                  <BarChart3 className="w-16 h-16 text-[#BDB2A0] mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-[#332F2D] mb-2">Laporan Pembelajaran</h3>
                  <p className="text-[#5D594C]">Fitur grafik analitik dan laporan perkembangan siswa sedang disiapkan.</p>
                  <p className="text-sm text-[#5D594C]/70 mt-1">Laporan aktivitas dan perilaku siswa akan tampil di sini.</p>
                </div>
              </motion.div>
            )}

            {/* Student Detail Modal */}
            <AnimatePresence>
              {selectedStudent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                  onClick={() => setSelectedStudent(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#BDB2A0]/30 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-[#FDF6EE] border border-[#BDB2A0]/30 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-sm">{selectedStudent.avatar}</div>
                      <h3 className="font-bold text-2xl text-[#332F2D] mb-1">{selectedStudent.name}</h3>
                      <p className="text-[#5D594C] font-semibold">{selectedStudent.grade}</p>
                      <p className="text-xs text-[#5D594C]/70 mt-1">{selectedStudent.email}</p>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-[#FDF6EE] border border-[#BDB2A0]/30 rounded-2xl p-4">
                        <p className="text-sm text-[#5D594C] mb-1 font-medium">Sesi Minggu Ini</p>
                        <p className="text-2xl font-bold text-[#332F2D]">{selectedStudent.sessionsThisWeek ?? 'Belum tersedia'}</p>
                      </div>
                      <div className="bg-[#776938]/10 border border-[#776938]/20 rounded-2xl p-4">
                        <p className="text-sm text-[#5D594C] mb-1 font-medium">Topik Dipelajari</p>
                        <p className="text-2xl font-bold text-[#776938]">{selectedStudent.topicsLearned ?? 'Belum tersedia'}</p>
                      </div>

                      {/* Strike Status Card */}
                      {(() => {
                        const badge = getWarningBadge(selectedStudent.warnings);
                        return (
                          <div className="rounded-2xl p-4 border" style={{ backgroundColor: badge.bg, borderColor: badge.color }}>
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm text-[#5D594C] mb-1 font-medium">Status Strike</p>
                                <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: badge.color }}>
                                  {selectedStudent.warnings}/3 — {badge.label}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {[1, 2, 3].map((s) => (
                                  <StrikeDot key={s} index={s} active={s <= selectedStudent.warnings} total={selectedStudent.warnings} />
                                ))}
                              </div>
                            </div>
                            {selectedStudent.warnings >= 3 && (
                              <div className="flex items-center gap-2 mt-2 p-2 bg-white rounded-xl border border-[#FF4444]/30">
                                <AlertTriangle className="w-4 h-4 text-[#FF4444]" />
                                <p className="text-xs text-[#332F2D] font-medium">Chat siswa telah dinonaktifkan.</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <p className="text-sm text-[#5D594C]">Tinjau notifikasi sekolah untuk detail pelanggaran yang tercatat di server.</p>

                      <div className="bg-[#FDF6EE] border border-[#BDB2A0]/25 rounded-2xl p-4">
                        <p className="text-sm text-[#5D594C] mb-1 font-medium">Aktivitas Terakhir</p>
                        <p className="text-[#332F2D] font-semibold">{selectedStudent.recentActivity}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      {selectedStudent.warnings > 0 && (
                        <button
                          onClick={() => { handleResetStrikes(selectedStudent.email); setSelectedStudent(null); }}
                          className="flex-1 py-3.5 bg-[#776938] hover:bg-[#66592F] text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />Reset Strike
                        </button>
                      )}
                      <button onClick={() => setSelectedStudent(null)} className="flex-1 py-3.5 bg-[#B9895F] hover:bg-[#A67950] text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all">
                        Tutup
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
