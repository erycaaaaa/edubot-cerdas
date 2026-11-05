import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useHomeAccount } from '../hooks/useHomeAccount';
import { useTheme } from '../hooks/useTheme';
import { clearSession } from '../store/authStore';
import { getMyGamification, type GamificationData } from '../services/apiClient';

export function AccountMenu() {
  const { account, destination } = useHomeAccount();
  const { darkMode, toggleDarkMode } = useTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<GamificationData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const signingOut = useRef(false);
  const accountId = account?.id;
  const accountRole = account?.role;

  function close() { dialog.current?.close(); setOpen(false); }
  useEffect(() => {
    if (!open || !accountId || accountRole !== 'student') return;
    let active = true;
    getMyGamification().then(data => { if (active) setProgress(data); })
      .catch(() => { if (active) setError('Poin belum dapat dimuat. Tutup dan buka menu untuk mencoba lagi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, accountId, accountRole]);

  async function logout() {
    if (signingOut.current) return;
    signingOut.current = true;
    setBusy(true); setError('');
    try { await clearSession(); close(); navigate('/', { replace: true }); }
    catch { setError('Belum berhasil keluar. Silakan coba lagi.'); }
    finally { signingOut.current = false; setBusy(false); }
  }

  if (!account) return null;
  const item = 'block w-full rounded-xl border border-txt-muted/30 px-4 py-3 text-left font-semibold hover:bg-card-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive';
  return <>
    <button type="button" aria-label="Buka menu profil dan akun" aria-haspopup="dialog" onClick={() => {
      setError(''); setProgress(null); setLoading(account.role === 'student'); setOpen(true); dialog.current?.showModal();
    }} className="rounded-xl border border-txt-muted/30 bg-white p-2 text-txt-main"><Menu size={22} /></button>
    <dialog ref={dialog} onClose={() => setOpen(false)} aria-labelledby="account-menu-title"
      onClick={event => { if (event.target === dialog.current) close(); }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-80 max-w-[90vw] border-l border-txt-muted/30 bg-white p-0 text-txt-main shadow-xl backdrop:bg-black/50">
      <div className="flex min-h-full flex-col gap-5 p-5">
        <div className="flex items-center justify-between"><h2 id="account-menu-title" className="text-xl font-bold">Akun saya</h2>
          <button type="button" autoFocus aria-label="Tutup menu akun" onClick={close} className="rounded-lg p-2"><X /></button></div>
        <section aria-label="Profil" className="rounded-2xl bg-card-soft p-4">
          {progress?.avatar && <span className="text-4xl" aria-hidden="true">{progress.avatar}</span>}
          <h3 className="mt-2 text-lg font-bold">{account.name}</h3>
          <p className="break-all text-sm text-txt-secondary">{account.email}</p>
          <p className="mt-1 text-sm text-txt-secondary">{account.role === 'student' ? 'Siswa' : account.role === 'teacher' ? 'Guru' : account.role === 'headmaster' ? 'Kepala sekolah' : account.role === 'parent' ? 'Orang tua' : account.role === 'admin' ? 'Admin' : 'Akun'}</p>
        </section>
        {account.role === 'student' && <section aria-label="Poin belajar" className="rounded-2xl border border-txt-muted/30 p-4">
          <h3 className="font-bold">Poin & level</h3>
          {loading ? <p role="status">Memuat poin...</p> : progress && <>
            <p className="mt-2 text-xl font-bold text-olive">{progress.expBalance} EXP</p>
            <p className="text-sm text-txt-secondary">{progress.xp} XP total · Level {progress.level.level}</p>
          </>}
        </section>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <nav aria-label="Menu akun" className="space-y-2">
          <Link to="/" onClick={close} className={item}>Beranda</Link>
          <Link to={destination} onClick={close} className={item}>{account.role === 'student' ? 'Chat & belajar' : 'Dashboard'}</Link>
          {account.role === 'student' && <>
            <Link to="/student/avatars" onClick={close} className={item}>Poin & riwayat EXP</Link>
            <Link to="/student/avatars/collection" onClick={close} className={item}>Koleksi avatar</Link>
          </>}
          <button type="button" onClick={toggleDarkMode} className={item}>{darkMode ? 'Gunakan tema terang' : 'Gunakan tema gelap'}</button>
        </nav>
        <button type="button" onClick={logout} disabled={busy} className={`${item} mt-auto flex items-center gap-2 disabled:opacity-50`}>
          <LogOut size={18} />{busy ? 'Keluar...' : 'Keluar akun'}
        </button>
      </div>
    </dialog>
  </>;
}
