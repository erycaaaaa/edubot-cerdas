import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { clearSession } from '../store/authStore';

export default function ResetPassword() {
  const [email, setEmail] = useState<string | null>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    // Wait for recovery URL processing, then verify the user with Supabase.
    supabase.auth.getSession().then(() => supabase.auth.getUser()).then(({ data, error: failure }) => {
      if (active) setEmail(failure ? null : data.user?.email ?? null);
    }).catch(() => { if (active) setEmail(null); });
    return () => { active = false; };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || !email) return;
    if (password !== confirmation) { setError('Password tidak cocok.'); return; }
    inFlight.current = true; setBusy(true); setError('');
    try {
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) throw failure;
      setPassword(''); setConfirmation(''); setDone(true);
      try { await clearSession(); }
      catch { setError('Password sudah diperbarui, tetapi sesi belum berhasil ditutup. Keluar melalui menu akun setelah koneksi pulih.'); }
    } catch { setError('Password belum dapat diperbarui. Periksa persyaratan password atau minta tautan pemulihan baru.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <main className="min-h-screen bg-card-soft text-txt-main flex items-center justify-center p-4">
    <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm space-y-4">
      <h1 className="text-2xl font-bold">Password baru</h1>
      {done ? <><p role="status">Password berhasil diperbarui.</p><Link to="/role-selection" className="underline">Masuk kembali</Link></>
        : email === undefined ? <p role="status">Memeriksa tautan pemulihan...</p>
        : !email ? <><p role="alert">Tautan tidak valid atau sudah kedaluwarsa.</p><Link to="/forgot-password" className="underline">Minta tautan baru</Link></>
        : <form onSubmit={submit} className="space-y-4">
          <p className="break-all">Akun: {email}</p>
          <label className="block">Password baru<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-txt-muted p-3" /></label>
          <p className="text-sm text-txt-secondary">Gunakan minimal 8 karakter.</p>
          <label className="block">Ulangi password<input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-2 w-full rounded-xl border border-txt-muted p-3" /></label>
          <button disabled={busy} className="w-full rounded-xl bg-brand p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Menyimpan...' : 'Simpan password'}</button>
        </form>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </section>
  </main>;
}
