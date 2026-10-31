import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (failure) throw failure;
      setSent(true);
    } catch { setError('Tautan belum dapat dikirim. Tunggu sebentar lalu coba lagi.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <main className="min-h-screen bg-card-soft text-txt-main flex items-center justify-center p-4">
    <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm space-y-4">
      <Link to="/role-selection" className="text-olive underline">Kembali ke login</Link>
      <h1 className="text-2xl font-bold">Lupa password</h1>
      {sent ? <p role="status">Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk dan folder spam, lalu buka tautannya untuk mengatur password baru.</p>
        : <form onSubmit={submit} className="space-y-4">
          <label className="block">Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-txt-muted p-3" /></label>
          <button disabled={busy} className="w-full rounded-xl bg-brand p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Mengirim...' : 'Kirim tautan pemulihan'}</button>
        </form>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </section>
  </main>;
}
