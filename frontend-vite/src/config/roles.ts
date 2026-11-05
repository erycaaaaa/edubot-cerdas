export type UserRole = 'student' | 'teacher' | 'headmaster' | 'parent' | 'admin';
export function roleDestination(role: string | undefined): string {
  return role === 'admin' ? '/admin/dashboard'
    : role === 'headmaster' ? '/headmaster/dashboard'
    : role === 'teacher' ? '/teacher/dashboard'
    : role === 'student' ? '/student/chat'
    : role === 'parent' ? '/parent/dashboard'
    : '/role-selection';
}
