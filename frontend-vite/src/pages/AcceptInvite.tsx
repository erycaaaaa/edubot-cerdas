import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { apiClient } from '../services/apiClient';
import { clearSession } from '../store/authStore';
import { isAxiosError } from 'axios';

export default function AcceptInvite() {
  const [email, setEmail] = useState<string | null>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(() => supabase.auth.getUser()).then(({ data, error }) => {
      if (active) setEmail(error ? null : data.user?.email ?? null);
    }).catch(() => { if (active) setEmail(null); });
    return () => { active = false; };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (password !== confirmation) { setError('Password tidak cocok.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      const response = await apiClient.post<{ alreadyAccepted?: boolean }>('/api/auth/accept-invite', { password });
      setAlreadyAccepted(response.data.alreadyAccepted === true);
      setPassword(''); setConfirmation(''); setDone(true);
      try { await clearSession(); } catch { setError('Akun berhasil diaktifkan, tetapi sesi belum berhasil ditutup. Coba keluar melalui menu akun.'); }
    } catch (error) { setError(isAxiosError(error) ? error.response?.data?.error || 'Aktivasi belum berhasil. Periksa koneksi lalu coba lagi.' : 'Aktivasi belum berhasil.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <main className="min-h-screen bg-card-soft p-4 flex items-center justify-center text-txt-main">
    <section className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4 shadow-sm">
      <h1 className="text-2xl font-bold">Aktifkan akun guru</h1>
      {done ? <><p role="status">{alreadyAccepted ? 'Undangan sudah diterima sebelumnya. Silakan login dengan password akun Anda.' : 'Password berhasil disimpan. Silakan login sebagai guru.'}</p><Link to="/login/teacher" className="underline">Login Guru</Link></>
        : email === undefined ? <p role="status">Memeriksa undangan...</p>
        : !email ? <p role="alert">Tautan tidak valid atau kedaluwarsa. Hubungi admin untuk memeriksa undangan.</p>
        : <form onSubmit={submit} className="space-y-4">
          <p className="break-all">Akun: {email}</p>
          <label className="block">Password baru<input className="mt-1 block w-full rounded-xl border p-3" type="password" minLength={8} maxLength={128} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label className="block">Ulangi password<input className="mt-1 block w-full rounded-xl border p-3" type="password" minLength={8} maxLength={128} required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
          <button disabled={busy} className="w-full rounded-xl bg-brand p-3 text-white disabled:opacity-50">{busy ? 'Menyimpan...' : 'Aktifkan akun'}</button>
        </form>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </section>
  </main>;
}
