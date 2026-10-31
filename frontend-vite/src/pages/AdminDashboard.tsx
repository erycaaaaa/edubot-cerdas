import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { AccountMenu } from '../components/AccountMenu';
import { adminApi, type School, type Teacher, type Invitation } from '../services/adminApi';

const input = 'mt-1 block w-full rounded-xl border border-txt-muted bg-white p-3 text-txt-main';
const button = 'rounded-xl bg-olive px-4 py-2 font-semibold text-white disabled:opacity-50';
const action = 'rounded-lg border border-txt-muted px-3 py-2 text-sm disabled:opacity-50';
const inviteLabels = { pending: 'Sedang diproses', sent: 'Terkirim, belum diaktifkan', failed: 'Perlu pemeriksaan admin', accepted: 'Diterima' };
export default function AdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [schoolForm, setSchoolForm] = useState<{ id?: string; name: string; code: string }>({ name: '', code: '' });
  const [invite, setInvite] = useState({ name: '', email: '', schoolId: '' });
  const [filter, setFilter] = useState('');
  const [moving, setMoving] = useState<{ id: string; schoolId: string } | null>(null);
  const load = useCallback(async () => {
    const [schoolList, teacherList] = await Promise.all([adminApi.schools(), adminApi.teachers()]);
    setSchools(schoolList); setTeachers(teacherList.teachers); setInvitations(teacherList.invitations); setLoaded(true);
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([adminApi.schools(), adminApi.teachers()]).then(([s, t]) => {
      if (active) { setSchools(s); setTeachers(t.teachers); setInvitations(t.invitations); setLoaded(true); }
    }).catch(() => { if (active) setError('Data admin belum dapat dimuat. Periksa koneksi lalu coba lagi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function run(operation: () => Promise<unknown>, message: string, onSuccess?: () => void) {
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await operation(); onSuccess?.(); setNotice(message);
      await load();
    } catch (error) { setError(isAxiosError(error) ? error.response?.data?.error || 'Hasil operasi belum dapat dipastikan. Muat ulang sebelum mencoba lagi.' : 'Data belum dapat diperbarui. Muat ulang sebelum mencoba lagi.'); }
    finally { working.current = false; setBusy(false); }
  }
  const schoolName = (id: string | null) => schools.find(s => s.id === id)?.name || 'Belum ditentukan';
  const activeSchools = schools.filter(s => s.is_active);
  const displayed = teachers.filter(t => !filter || t.school_id === filter);
  return <main className="min-h-screen bg-card-soft text-txt-main">
    <header className="border-b border-txt-muted/30 bg-white px-4 py-4"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
      <div><Link to="/" className="text-sm text-olive underline">EduBuz</Link><h1 className="text-2xl font-bold">Administrasi pusat</h1></div><AccountMenu />
    </div></header>
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-white p-4 text-red-700">{error}</div>}
      {notice && <p role="status" className="rounded-xl bg-white p-4 text-olive">{notice}</p>}
      <button disabled={busy || loading} className={action} onClick={() => void run(load, 'Data dimuat ulang.')}>Muat ulang</button>
      {loading ? <p role="status">Memuat data administrasi...</p> : !loaded ? <p>Data belum tersedia. Gunakan Muat ulang untuk mencoba lagi.</p> : <>
        <section aria-label="Ringkasan" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[['Sekolah', schools.length], ['Guru', teachers.length], ['Guru dengan akses aktif', teachers.filter(t => !t.is_blocked && schools.some(s => s.id === t.school_id && s.is_active)).length]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-5"><p className="text-txt-secondary">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
        </section>
        <section className="rounded-2xl bg-white p-4 md:p-6 space-y-4" aria-labelledby="schools-title">
          <h2 id="schools-title" className="text-xl font-bold">Sekolah</h2>
          <form onSubmit={event => { event.preventDefault(); void run(() => schoolForm.id ? adminApi.updateSchool(schoolForm.id, { name: schoolForm.name, code: schoolForm.code }) : adminApi.createSchool({ name: schoolForm.name, code: schoolForm.code }), 'Sekolah berhasil disimpan.', () => setSchoolForm({ name: '', code: '' })); }} className="grid gap-3 md:grid-cols-3 items-end">
            <label>Nama sekolah<input required maxLength={120} className={input} value={schoolForm.name} onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })} /></label>
            <label>Kode sekolah<input required maxLength={64} pattern="[A-Za-z0-9-]+" className={input} value={schoolForm.code} onChange={e => setSchoolForm({ ...schoolForm, code: e.target.value })} /></label>
            <div className="flex flex-wrap gap-2"><button disabled={busy} className={button}>{schoolForm.id ? 'Simpan perubahan' : 'Tambah sekolah'}</button>{schoolForm.id && <button type="button" className={action} onClick={() => setSchoolForm({ name: '', code: '' })}>Batal</button>}</div>
          </form>
          <p className="text-sm text-txt-secondary">Sekolah nonaktif menutup akses guru di sekolah tersebut. Riwayat dan penempatan akun tetap tersimpan.</p>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Daftar sekolah</caption><thead><tr>{['Nama', 'Kode', 'Status', 'Guru', 'Aksi'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{schools.map(s => <tr key={s.id} className="border-t border-txt-muted/30"><td className="p-3">{s.name}</td><td className="p-3">{s.code}</td><td className="p-3">{s.is_active ? 'Aktif' : 'Nonaktif'}</td><td className="p-3"><button className="underline" onClick={() => setFilter(s.id)}>{s.teacher_count} guru</button></td><td className="p-3"><div className="flex flex-wrap gap-2"><button disabled={busy} className={action} onClick={() => setSchoolForm({ id: s.id, name: s.name, code: s.code })}>Edit</button><button disabled={busy} className={action} onClick={() => void run(() => adminApi.updateSchool(s.id, { is_active: !s.is_active }), 'Status sekolah diperbarui.')}>{s.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></div></td></tr>)}</tbody>
          </table></div>{schools.length === 0 && <p>Belum ada sekolah. Tambahkan sekolah sebelum mengundang guru.</p>}
        </section>
        <section className="rounded-2xl bg-white p-4 md:p-6 space-y-4" aria-labelledby="teachers-title">
          <h2 id="teachers-title" className="text-xl font-bold">Guru</h2>
          <form onSubmit={event => { event.preventDefault(); void run(() => adminApi.invite(invite), 'Undangan dikirim. Guru perlu membuka email dan mengatur password.', () => setInvite({ name: '', email: '', schoolId: '' })); }} className="grid gap-3 md:grid-cols-2 items-end">
            <label>Nama guru<input required maxLength={120} className={input} value={invite.name} onChange={e => setInvite({ ...invite, name: e.target.value })} /></label>
            <label>Email guru<input required type="email" maxLength={254} className={input} value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} /></label>
            <label>Sekolah<select required className={input} value={invite.schoolId} onChange={e => setInvite({ ...invite, schoolId: e.target.value })}><option value="">Pilih sekolah aktif</option>{activeSchools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></label>
            <button disabled={busy || activeSchools.length === 0} className={button}>{busy ? 'Memproses...' : 'Undang guru'}</button>
          </form>
          <label className="block max-w-sm">Filter sekolah<select className={input} value={filter} onChange={e => setFilter(e.target.value)}><option value="">Semua sekolah</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          {moving && <form className="rounded-xl border p-4 space-y-3" onSubmit={e => { e.preventDefault(); void run(() => adminApi.moveTeacher(moving.id, moving.schoolId), 'Penempatan guru diperbarui.', () => setMoving(null)); }}>
            <label>Sekolah baru untuk {teachers.find(t => t.id === moving.id)?.name}<select required className={input} value={moving.schoolId} onChange={e => setMoving({ ...moving, schoolId: e.target.value })}><option value="">Pilih sekolah aktif</option>{activeSchools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <button disabled={busy} className={button}>Simpan penempatan</button> <button type="button" className={action} onClick={() => setMoving(null)}>Batal</button>
          </form>}
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Daftar guru</caption><thead><tr>{['Nama / email', 'Sekolah', 'Akses', 'Undangan', 'Aksi'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>
            {displayed.map(t => { const invitation = invitations.find(i => i.user_id === t.id); return <tr key={t.id} className="border-t border-txt-muted/30"><td className="p-3"><p className="font-semibold">{t.name}</p><p>{t.email}</p></td><td className="p-3">{schoolName(t.school_id)}</td><td className="p-3">{t.is_blocked ? 'Nonaktif' : !schools.some(s => s.id === t.school_id && s.is_active) ? 'Sekolah nonaktif / belum ditentukan' : 'Aktif'}</td><td className="p-3">{invitation ? inviteLabels[invitation.status] : 'Akun sebelumnya'}</td><td className="p-3"><div className="flex flex-wrap gap-2"><button disabled={busy} className={action} onClick={() => setMoving({ id: t.id, schoolId: activeSchools.some(s => s.id === t.school_id) ? t.school_id! : '' })}>Pindah sekolah</button><button disabled={busy} className={action} onClick={() => void run(() => adminApi.blockTeacher(t.id, !t.is_blocked), 'Status akses guru diperbarui.')}>{t.is_blocked ? 'Aktifkan' : 'Nonaktifkan'}</button></div></td></tr>; })}
          </tbody></table></div>{displayed.length === 0 && <p>Belum ada guru untuk pilihan sekolah ini.</p>}
        </section>
        {invitations.some(i => !i.user_id) && <section className="rounded-2xl bg-white p-5 space-y-3"><h2 className="text-xl font-bold">Undangan belum selesai</h2><p className="text-sm">Undangan gagal atau masih diproses perlu diperiksa sebelum dikirim kembali. Akun guru belum dianggap siap.</p><ul className="space-y-2">{invitations.filter(i => !i.user_id).map(i => <li key={i.id} className="break-words">{i.email} &middot; {schoolName(i.school_id)} &middot; {inviteLabels[i.status]}</li>)}</ul></section>}
      </>}
    </div>
  </main>;
}
