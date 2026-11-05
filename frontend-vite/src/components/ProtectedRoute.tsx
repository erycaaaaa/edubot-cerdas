import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { supabase } from '../lib/supabase';
import { apiClient } from '../services/apiClient';
import { saveSession } from '../store/authStore';

import { roleDestination, type UserRole as Role } from '../config/roles';
type VerifiedUser = { id: string; email: string; name: string; role: Role; schoolId: string; schoolName?: string; avatar: string; grade?: number };
function ProtectedRoute({ role }: { role: Role }) {
  const [token, setToken] = useState<string | null>();
  const [attempt, setAttempt] = useState(0);
  const [verified, setVerified] = useState<{ token: string; role?: Role; status?: number }>();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    apiClient.get<{ user: VerifiedUser }>('/api/auth/me')
      .then(({ data: { user } }) => {
        if (!active) return;
        saveSession({ ...user, grade: user.grade == null ? undefined : String(user.grade),
          gradeNumber: user.grade, schoolName: user.schoolName || (user.schoolId ? 'Sekolah terdaftar' : 'Belum ditentukan') });
        setVerified({ token, role: user.role });
      })
      .catch(error => { if (active) setVerified({ token, status: isAxiosError(error) ? error.response?.status ?? 503 : 503 }); });
    return () => { active = false; };
  }, [token, attempt]);
  if (token === null || (token && verified?.token === token && verified.status === 401)) return <Navigate to={`/login/${role}`} replace />;
  if (!token || verified?.token !== token) return <p role="status" className="p-6">Memeriksa sesi...</p>;
  if (verified.status) return <main className="p-6 space-y-3">
    <p role="alert">{verified.status === 403 ? 'Akses akun dibatasi. Hubungi guru untuk memeriksa status akun.' : 'Sesi belum dapat diperiksa. Silakan coba lagi.'}</p>
    <button onClick={() => setAttempt(value => value + 1)} className="underline">Coba lagi</button>{' '}<Link to="/">Beranda</Link>
  </main>;
  if (verified.role !== role) return <Navigate to={roleDestination(verified.role)} replace />;
  return <Outlet />;
}
export function StudentArea() { return <ProtectedRoute role="student" />; }
export function TeacherArea() { return <ProtectedRoute role="teacher" />; }
export function HeadmasterArea() { return <ProtectedRoute role="headmaster" />; }
export function ParentArea() { return <ProtectedRoute role="parent" />; }

export function AdminArea() { return <ProtectedRoute role="admin" />; }
