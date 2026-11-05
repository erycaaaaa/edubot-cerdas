import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

interface DashboardSummary {
  schoolId: string;
  counts: {
    classes: number;
    students: number;
    teachers: number;
    notifications: number;
  };
}

export default function HeadmasterDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const { data } = await apiClient.get<{ success: boolean; data: DashboardSummary }>('/api/headmaster/dashboard');
        if (active) {
          setSummary(data.data);
        }
      } catch {
        if (active) setError('Gagal memuat ringkasan sekolah.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  if (loading) return <div className="p-6">Memuat dashboard kepala sekolah...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard Kepala Sekolah</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Kelas" value={summary?.counts.classes ?? 0} />
        <StatCard label="Guru" value={summary?.counts.teachers ?? 0} />
        <StatCard label="Siswa" value={summary?.counts.students ?? 0} />
        <StatCard label="Notifikasi" value={summary?.counts.notifications ?? 0} />
      </div>
      <p className="mt-6 text-sm text-slate-600">Sekolah: {summary?.schoolId ?? 'Tidak diketahui'}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
    </div>
  );
}
