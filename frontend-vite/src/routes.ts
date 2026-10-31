import { createBrowserRouter } from 'react-router';
import { StudentArea, TeacherArea, ParentArea, AdminArea } from './components/ProtectedRoute';

// Lazy pages avoid loading unrelated dashboards at startup.
export const router = createBrowserRouter([
  { path: '/', lazy: async () => ({ Component: (await import('./pages/Landing')).default }) },
  { path: '/role-selection', lazy: async () => ({ Component: (await import('./pages/RoleSelection')).default }) },
  { path: '/login/:role', lazy: async () => ({ Component: (await import('./pages/Login')).default }) },
  { path: '/register', lazy: async () => ({ Component: (await import('./pages/Register')).default }) },
  { path: '/forgot-password', lazy: async () => ({ Component: (await import('./pages/ForgotPassword')).default }) },
  { path: '/accept-invite', lazy: async () => ({ Component: (await import('./pages/AcceptInvite')).default }) },
  { Component: AdminArea, children: [{ path: '/admin/dashboard', lazy: async () => ({ Component: (await import('./pages/AdminDashboard')).default }) }] },
  { path: '/reset-password', lazy: async () => ({ Component: (await import('./pages/ResetPassword')).default }) },
  { Component: StudentArea, children: [
    { path: '/student/chat', lazy: async () => ({ Component: (await import('./pages/StudentChat')).default }) },
    { path: '/student/avatars', lazy: async () => ({ Component: (await import('./pages/AvatarCollection')).default }) },
    { path: '/student/avatars/collection', lazy: async () => ({ Component: (await import('./pages/FullAvatarCollection')).default }) },
  ] },
  { Component: TeacherArea, children: [
    { path: '/teacher/dashboard', lazy: async () => ({ Component: (await import('./pages/TeacherDashboard')).default }) },
  ] },
  { Component: ParentArea, children: [
    { path: '/parent/dashboard', lazy: async () => ({ Component: (await import('./pages/ParentDashboard')).default }) },
  ] },
  { path: '*', lazy: async () => ({ Component: (await import('./pages/NotFound')).default }) },
]);
