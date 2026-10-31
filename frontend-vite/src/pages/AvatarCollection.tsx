import { AccountMenu } from '../components/AccountMenu';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { RewardGuide } from '../components/RewardGuide';
import { AvatarCard } from '../components/AvatarCard';
import { ExpHistory } from '../components/ExpHistory';
import { getMyAvatars, updateAvatar, type AvatarCollection as Collection } from '../services/apiClient';

export default function AvatarCollection({ fullCollection = false }: { fullCollection?: boolean }) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => { window.scrollTo(0, 0); }, [fullCollection]);

  function showError(cause: unknown) {
    setUnauthorized(isAxiosError(cause) && cause.response?.status === 401);
    setError(isAxiosError(cause) ? cause.response?.data?.error ?? 'Koneksi terganggu. Silakan coba lagi.' : 'Koleksi avatar belum dapat dimuat.');
  }

  async function load() {
    setLoading(true); setError(''); setUnauthorized(false);
    try { setCollection(await getMyAvatars()); }
    catch (cause) { showError(cause); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    getMyAvatars().then(data => { if (active) setCollection(data); })
      .catch(cause => { if (active) showError(cause); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function act(id: string, action: 'unlock' | 'equip') {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(id); setError(''); setMessage('');
    try {
      await updateAvatar(id, action);
      setCollection(await getMyAvatars());
      setMessage(action === 'unlock' ? 'Avatar berhasil dibuka. Pilih Pakai untuk memakainya.' : 'Avatar profil berhasil diperbarui.');
    } catch (cause) {
      showError(cause);
      // A timeout can happen after commit. Refresh authoritative state; replay
      // unlock is also safe because ownership is unique and checked in SQL.
      try { setCollection(await getMyAvatars()); } catch { /* Keep the actionable error. */ }
    } finally { inFlight.current = false; setBusy(null); }
  }

  const button = 'rounded-xl px-4 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <main className="min-h-screen bg-card-soft text-txt-main p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to={fullCollection ? '/student/avatars' : '/student/chat'} className="text-olive underline rounded focus-visible:outline">
          {fullCollection ? 'Kembali ke ringkasan' : 'Kembali ke chat'}
        </Link>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <AccountMenu />
          <div><h1 className="text-3xl font-bold">{fullCollection ? 'Semua Koleksi Avatar' : 'Avatar & XP'}</h1><p className="mt-2 text-txt-secondary">Gunakan EXP untuk avatar kosmetik. XP total dan level tidak berkurang.</p></div>
          {collection && <div className="bg-white border border-txt-muted/30 rounded-2xl p-4" aria-label="Saldo dan progres">
            <span className="text-3xl mr-3" role="img" aria-label="Avatar yang dipakai">{collection.avatar}</span>
            <strong>⭐ {collection.expBalance} EXP</strong><p className="text-sm text-txt-secondary mt-2">{collection.xp} XP total · Level {collection.level}</p>
          </div>}
        </header>
        {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4">
          <p>{error}</p>{unauthorized ? <Link className="underline" to="/login/student">Masuk kembali</Link> : <button onClick={load} disabled={loading || busy !== null} className={`${button} underline`}>Coba lagi</button>}
        </div>}
        {message && <p role="status" className="rounded-xl bg-olive-light p-4 text-olive">{message}</p>}
        {loading ? <p role="status">Memuat avatar...</p> : collection && <>
          {collection.avatars.length === 0 && <p>Belum ada avatar tersedia. Coba lagi nanti.</p>}
          <section aria-labelledby="collection-heading">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-olive">Album koleksimu</p>
                <h2 id="collection-heading" className="mt-1 text-2xl font-bold">{fullCollection ? 'Temukan teman belajarmu' : 'Preview koleksi avatar'}</h2>
                <p className="mt-2 text-sm text-txt-secondary">{fullCollection ? 'Kumpulkan kartu favorit dan pilih avatar untuk menemani belajarmu.' : 'Intip beberapa kartu. Buka koleksi lengkap untuk melihat semua avatar.'}</p>
              </div>
              <span className="rounded-full border border-olive/20 bg-olive-light px-4 py-2 text-sm font-semibold text-olive">
                {collection.avatars.filter(avatar => avatar.owned).length} / {collection.avatars.length} kartu dimiliki
              </span>
            </div>
            <div className={fullCollection ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'flex gap-4 overflow-x-auto snap-x snap-mandatory p-2 pb-4'}
              role={fullCollection ? undefined : 'region'} aria-label={fullCollection ? undefined : 'Preview kartu, geser untuk melihat lainnya'} tabIndex={fullCollection ? undefined : 0}>
              {(fullCollection ? collection.avatars : [...collection.avatars].sort((a, b) => Number(b.equipped) - Number(a.equipped)).slice(0, 3)).map(avatar =>
                <div key={avatar.id} className={fullCollection ? 'min-w-0' : 'w-64 shrink-0 snap-start'}>
                  <AvatarCard avatar={avatar} balance={collection.expBalance} busy={busy} onAction={act} />
                </div>)}
            </div>
            {!fullCollection && <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-txt-secondary">Menampilkan {Math.min(3, collection.avatars.length)} dari {collection.avatars.length} kartu</p>
              <Link to="/student/avatars/collection" className={`${button} bg-olive text-white hover:bg-olive-hover`}>Lihat semua koleksi →</Link>
            </div>}
          </section>
          {!fullCollection && <ExpHistory history={collection.history} />}
        </>}
        {!fullCollection && <RewardGuide />}
      </div>
    </main>
  );
}
