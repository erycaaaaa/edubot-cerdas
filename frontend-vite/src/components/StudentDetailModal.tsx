import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, MessageSquare, ShieldAlert, UserRound, RotateCcw, X, RefreshCw, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  getTeacherStudentChatHistory,
  getTeacherStudentStrikeHistory,
  updateTeacherStrikeResetNotes,
  type ChatHistoryItem,
  type TeacherStrikeHistory,
} from '../services/apiClient';

type Student = {
  studentId?: string;
  email: string;
  name: string;
  avatar: string;
  grade: string;
  warnings: number;
  sessionsThisWeek: number | null;
  topicsLearned: number | null;
  recentActivity: string;
  isBlocked?: boolean;
};

type Props = {
  student: Student;
  onClose: () => void;
  onReset: (studentId: string) => Promise<boolean>;
};

type Tab = 'profil' | 'chat' | 'strike';

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Waktu tidak tersedia';

export default function StudentDetailModal({ student, onClose, onReset }: Props) {
  const [tab, setTab] = useState<Tab>('profil');
  const [chat, setChat] = useState<ChatHistoryItem[]>([]);
  const [history, setHistory] = useState<TeacherStrikeHistory | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [notesBusy, setNotesBusy] = useState<string | null>(null);

  const studentId = student.studentId;

  const loadChat = async () => {
    if (!studentId) return;
    setLoadingChat(true);
    try {
      setChat(await getTeacherStudentChatHistory(studentId));
      setError('');
    } catch {
      setError('Riwayat Chat AI gagal dimuat. Periksa koneksi backend dan akses guru.');
    } finally {
      setLoadingChat(false);
    }
  };

  const loadHistory = async () => {
    if (!studentId) return;
    setLoadingHistory(true);
    try {
      setHistory(await getTeacherStudentStrikeHistory(studentId));
      setError('');
    } catch {
      setError('Catatan strike gagal dimuat. Periksa endpoint dan tabel Supabase.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (tab === 'chat' || tab === 'profil') void loadChat();
    if (tab === 'strike') void loadHistory();
    // Fetch only the active tab to avoid unnecessary requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, studentId]);

  const sessionsThisWeek = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = chat.filter(item => item.role === 'user' && item.created_at && new Date(item.created_at).getTime() >= since);
    const sessions = new Set(recent.map(item => item.session_id || (item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : item.id)));
    return sessions.size;
  }, [chat]);

  const lastActivity = useMemo(() => [...chat].reverse().find(item => item.role === 'user' || item.role === 'assistant'), [chat]);

  const handleReset = async () => {
    if (!studentId || student.warnings <= 0) return;
    if (!window.confirm(`Reset strike ${student.name}? Riwayat pelanggaran tidak akan dihapus.`)) return;
    setResetBusy(true);
    try {
      const succeeded = await onReset(studentId);
      if (!succeeded) return;
      await loadHistory();
      onClose();
    } finally {
      setResetBusy(false);
    }
  };

  const handleAddNote = async (resetId: string, current?: string | null) => {
    const note = window.prompt('Tambahkan atau perbarui catatan pembinaan:', current || '');
    if (note === null) return;
    setNotesBusy(resetId);
    try {
      await updateTeacherStrikeResetNotes(studentId!, resetId, note);
      await loadHistory();
    } catch {
      setError('Catatan pembinaan gagal disimpan.');
    } finally {
      setNotesBusy(null);
    }
  };

  const strikeColor = student.warnings === 0 ? '#65A765' : student.warnings === 1 ? '#E5B900' : student.warnings === 2 ? '#E58A32' : '#DC5555';
  const strikeBg = student.warnings === 0 ? '#EAF5E9' : student.warnings === 1 ? '#FFF8E7' : student.warnings === 2 ? '#FFF0E0' : '#FFE8E8';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-5" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: .96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-[#BDB2A0]/30 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-[#BDB2A0]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#FDF6EE] border border-[#BDB2A0]/30 flex items-center justify-center text-2xl">{student.avatar}</div>
              <div className="min-w-0">
                <h2 className="font-bold text-lg text-[#332F2D] truncate">{student.name}</h2>
                <p className="text-xs text-[#5D594C]">{student.grade} · {student.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#FDF6EE]" aria-label="Tutup"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 rounded-xl bg-[#FDF6EE] p-1">
            {([
              ['profil', 'Profil', UserRound],
              ['chat', 'Chat AI', MessageSquare],
              ['strike', 'Catatan Strike', ShieldAlert],
            ] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => { setTab(key); setError(''); }} className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs sm:text-sm font-semibold ${tab === key ? 'bg-white text-[#776938] shadow-sm' : 'text-[#5D594C]'}`}>
                <Icon className="w-4 h-4" />{label}
                {key === 'strike' && <span className="rounded-full bg-red-100 text-red-600 px-1.5 text-[10px]">{history?.violations.length ?? student.warnings}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto p-5 sm:p-7">
          {error && <div role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          {tab === 'profil' && <>
            <div className="text-center mb-5">
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-[#E8DCCF] bg-[#FDF6EE] text-4xl">{student.avatar}</div>
              <h3 className="text-2xl font-bold text-[#332F2D]">{student.name}</h3>
              <p className="font-semibold text-[#5D594C]">{student.grade}</p>
              <p className="mt-1 text-xs text-[#8B857A]">{student.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl border border-[#E8DCCF] bg-[#FDF6EE] p-4">
                <p className="text-xs font-semibold text-[#5D594C]">Sesi Minggu Ini</p>
                <p className="mt-1 text-xl font-bold text-[#332F2D]">{sessionsThisWeek || 'Belum ada data'}</p>
                <p className="text-[11px] text-[#8B857A]">Berdasarkan sesi chat 7 hari terakhir</p>
              </div>
              <div className="rounded-2xl border border-[#DAD6C8] bg-[#F1F0EA] p-4">
                <p className="text-xs font-semibold text-[#5D594C]">Topik Dipelajari</p>
                <p className="mt-1 text-xl font-bold text-[#776938]">Belum tersedia</p>
                <p className="text-[11px] text-[#8B857A]">Belum ada klasifikasi topik tersimpan</p>
              </div>
            </div>
            <div className="rounded-2xl border p-4 mb-4" style={{ backgroundColor: strikeBg, borderColor: strikeColor }}>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-semibold text-[#5D594C]">Status Strike / Peringatan</p><span className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: strikeColor }}>{student.warnings}/3 — {student.warnings === 0 ? 'Aman' : student.warnings === 1 ? 'Ringan' : student.warnings === 2 ? 'Sedang' : 'Berat'}</span></div>
                <div className="flex gap-2">{[1,2,3].map(n => <span key={n} className="flex h-6 w-6 items-center justify-center rounded-full text-[10px]" style={{ backgroundColor: n <= student.warnings ? strikeColor : '#E5E7EB', color: n <= student.warnings ? 'white' : '#9CA3AF' }}>{n}</span>)}</div>
              </div>
              {student.isBlocked && <p className="mt-3 text-xs font-semibold text-red-700">Akses chat siswa sedang diblokir.</p>}
            </div>
            <div className="rounded-2xl border border-[#E8DCCF] bg-[#FDF6EE] p-4">
              <p className="text-sm font-semibold text-[#5D594C]">Aktivitas Terakhir</p>
              <p className="mt-1 text-sm text-[#332F2D]">{lastActivity?.content || 'Belum ada percakapan yang tercatat.'}</p>
              {lastActivity?.created_at && <p className="mt-1 text-[11px] text-[#8B857A]">{formatDate(lastActivity.created_at)}</p>}
              <button onClick={() => setTab('chat')} className="mt-3 text-xs font-bold text-[#776938]">Lihat riwayat Chat AI →</button>
            </div>
          </>}

          {tab === 'chat' && <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-[#332F2D]">Riwayat Percakapan Siswa</h3><button onClick={() => void loadChat()} className="flex items-center gap-1 text-xs font-semibold text-[#776938]"><RefreshCw className="h-3.5 w-3.5" />Perbarui</button></div>
            {loadingChat ? <p className="py-10 text-center text-sm text-[#777]">Memuat riwayat chat...</p> : chat.length === 0 ? <p className="rounded-xl bg-[#FDF6EE] p-6 text-center text-sm text-[#777]">Belum ada riwayat percakapan.</p> :
              <div className="space-y-3">{chat.map(item => <div key={item.id} className={`max-w-[90%] rounded-2xl border p-3 ${item.role === 'user' ? 'ml-auto border-[#E8DCCF] bg-[#FDF6EE]' : 'mr-auto border-[#E4DFC9] bg-[#F5F3EB]'}`}>
                <div className="mb-1 flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#776938]">{item.role === 'user' ? student.name : 'EduBot'}</span><span className="text-[10px] text-[#8B857A]">{formatDate(item.created_at)}</span></div>
                <p className="whitespace-pre-wrap break-words text-sm text-[#332F2D]">{item.content}</p>
                {item.is_violation && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700"><AlertTriangle className="mr-1 inline h-3 w-3" />Pesan terkait pelanggaran aturan keamanan</p>}
              </div>)}</div>}
          </section>}

          {tab === 'strike' && <section>
            <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-[#332F2D]">Rekam Jejak Permanen Sistem</h3><button onClick={() => void loadHistory()} className="flex items-center gap-1 text-xs font-semibold text-[#776938]"><RefreshCw className="h-3.5 w-3.5" />Perbarui</button></div>
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Catatan pelanggaran dan reset disimpan di Supabase untuk pemantauan guru. Reset strike tidak menghapus riwayat pelanggaran.</div>
            {loadingHistory ? <p className="py-10 text-center text-sm text-[#777]">Memuat catatan strike...</p> : history && <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#E8DCCF] bg-[#FDF6EE] p-4"><p className="text-xs text-[#5D594C]">Total Pelanggaran</p><p className="text-2xl font-bold text-red-600">{history.violations.length} <span className="text-xs font-normal text-[#5D594C]">kali</span></p></div>
                <div className="rounded-2xl border border-[#E8DCCF] bg-[#FDF6EE] p-4"><p className="text-xs text-[#5D594C]">Riwayat Reset Strike</p><p className="text-2xl font-bold text-[#776938]">{history.resets.length} <span className="text-xs font-normal text-[#5D594C]">kali</span></p></div>
              </div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#5D594C]">Riwayat Pelanggaran Tercatat ({history.violations.length})</h4>
              <div className="mb-5 max-h-64 space-y-2 overflow-y-auto pr-1">{history.violations.length === 0 ? <p className="rounded-xl bg-[#FDF6EE] p-4 text-sm text-[#777]">Belum ada pelanggaran tercatat.</p> : history.violations.map(v => <article key={v.id} className="rounded-xl border border-red-200 bg-red-50/60 p-3"><div className="mb-1 flex justify-between gap-2"><span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Strike {v.strike_level}</span><time className="text-[10px] text-[#8B857A]">{formatDate(v.created_at)}</time></div><p className="text-sm text-[#332F2D]">{v.message}</p>{v.detected_words?.length > 0 && <p className="mt-1 text-[11px] text-red-700">Kata terdeteksi: {v.detected_words.join(', ')}</p>}</article>)}</div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#5D594C]">Riwayat Pembinaan / Reset Guru ({history.resets.length})</h4>
              <div className="space-y-2">{history.resets.length === 0 ? <p className="rounded-xl bg-[#FDF6EE] p-4 text-sm text-[#777]">Belum ada riwayat reset.</p> : history.resets.map(r => <article key={r.id} className="rounded-xl border border-[#E8DCCF] bg-white p-3"><div className="flex items-center justify-between gap-2 text-xs"><span className="font-bold text-[#776938]">↻ {r.teacher_name || 'Teacher'}</span><time className="text-[#8B857A]">{formatDate(r.reset_at)}</time></div><p className="mt-2 text-xs italic text-[#777]">{r.notes || 'Tanpa catatan tambahan'}</p><button disabled={notesBusy === r.id} onClick={() => void handleAddNote(r.id, r.notes)} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#776938] disabled:opacity-50"><PlusCircle className="h-3 w-3" />{notesBusy === r.id ? 'Menyimpan...' : 'Tambah Catatan Lanjutan'}</button></article>)}</div>
            </>}
          </section>}
        </div>

        <div className="flex gap-3 border-t border-[#BDB2A0]/20 bg-white p-4 sm:px-7">
          {student.warnings > 0 && <button disabled={resetBusy} onClick={() => void handleReset()} className="flex-1 rounded-2xl bg-[#776938] px-3 py-3 text-sm font-bold text-white disabled:opacity-50"><RotateCcw className="mr-1 inline h-4 w-4" />{resetBusy ? 'Memproses...' : `Reset Strike (${student.warnings}/3)`}</button>}
          <button onClick={onClose} className="flex-1 rounded-2xl bg-[#B9895F] px-3 py-3 text-sm font-bold text-white">Tutup</button>
        </div>
      </motion.div>
    </div>
  );
}
