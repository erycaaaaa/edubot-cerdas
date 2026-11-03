from pathlib import Path
p=Path('frontend-vite/src/pages/TeacherDashboard.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect, useCallback, useRef } from 'react';")
s=s.replace("import {\n  getStrikeRecords,\n} from '../store/strikeStore';\n",'')
s=s.replace('  getStudentsBySchool,\n','').replace('  type UserSession,\n','')
s=s.replace('sessionsThisWeek: number;', 'sessionsThisWeek: null;').replace('topicsLearned: number;', 'topicsLearned: null;')
s=s.replace('const [session, setSession] = useState<UserSession | null>(null);', 'const [session] = useState(() => getSession());\n  const [dataError, setDataError] = useState(\'\');\n  const [loading, setLoading] = useState(true);\n  const refreshInFlight = useRef(false);\n  const mounted = useRef(false);')
start=s.index('  // Load session');end=s.index('  const handleMarkAllRead',start)
s=s[:start]+'''  useEffect(() => {
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

'''+s[end:]
s=s.replace("console.warn('Mark all read error:', err);", "console.warn('Mark all read error:', err);\n      setDataError('Notifikasi belum berhasil ditandai. Silakan coba lagi.');\n      return;")
s=s.replace("console.warn('Mark read error:', err);", "console.warn('Mark read error:', err);\n      setDataError('Notifikasi belum berhasil ditandai. Silakan coba lagi.');\n      return;")
s=s.replace("console.warn('Backend reset strikes error:', err);", "console.warn('Backend reset strikes error:', err);\n      setDataError('Strike belum berhasil direset. Silakan coba lagi.');\n      return;")
s=s.replace("  const handleLogout = () => {\n    clearSession();\n    navigate('/');\n  };", "  const handleLogout = async () => {\n    try { await clearSession(); navigate('/'); }\n    catch { setDataError('Belum berhasil keluar. Silakan coba lagi.'); }\n  };")
s=s.replace('if (!session) return null;', "if (!session || session.role !== 'teacher') return null;")
s=s.replace('{students.reduce((a, s) => a + s.sessionsThisWeek, 0)}','—').replace('{students.reduce((a, s) => a + s.topicsLearned, 0)}','—')
for x in ['student','selectedStudent']:
    for field in ['sessionsThisWeek','topicsLearned']: s=s.replace('{'+x+'.'+field+'}',"{"+x+"."+field+" ?? 'Belum tersedia'}")
s=s.replace('      {/* Main Content */}', '''      {/* Main Content */}''')
s=s.replace('      <div className="flex-1 flex flex-col overflow-hidden relative z-10">', '''      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {loading && <p role="status" className="bg-white px-6 py-3">Memuat data sekolah...</p>}
        {dataError && <div role="alert" className="bg-red-50 px-6 py-3 text-red-800">
          <p>{dataError}</p><button type="button" onClick={() => void refreshData()} className="mt-2 underline">Coba lagi</button>
        </div>}''')
# Local browser strike history is not authoritative; notifications are server-backed.
start=s.index('                      {/* Strike History */}');end=s.index('                      <div className="bg-[#FDF6EE]',s.index('                      })()}',start))
s=s[:start]+'''                      <p className="text-sm text-[#5D594C]">Tinjau notifikasi sekolah untuk detail pelanggaran yang tercatat di server.</p>

'''+s[end:]
p.write_text(s,encoding='utf-8')
p=Path('frontend-vite/src/store/authStore.ts');s=p.read_text(encoding='utf-8');s=s.replace('/* eslint-disable @typescript-eslint/no-explicit-any */\n','');p.write_text(s,encoding='utf-8')
