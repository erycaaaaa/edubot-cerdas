import { apiClient } from './apiClient';
export type School = { id: string; name: string; code: string; is_active: boolean; teacher_count: number };
export type Teacher = { id: string; name: string; email: string; school_id: string | null; is_blocked: boolean };
export type Invitation = { id: string; email: string; name: string; school_id: string; user_id: string | null; status: 'pending' | 'sent' | 'failed' | 'accepted' };
export const adminApi = {
  schools: async () => (await apiClient.get<{ data: School[] }>('/api/admin/schools')).data.data,
  teachers: async () => (await apiClient.get<{ data: { teachers: Teacher[]; invitations: Invitation[] } }>('/api/admin/teachers')).data.data,
  createSchool: (data: { name: string; code: string }) => apiClient.post('/api/admin/schools', data),
  updateSchool: (id: string, data: { name?: string; code?: string; is_active?: boolean }) => apiClient.patch(`/api/admin/schools/${encodeURIComponent(id)}`, data),
  invite: (data: { name: string; email: string; schoolId: string }) => apiClient.post('/api/admin/teachers/invite', data, { timeout: 60000 }),
  moveTeacher: (id: string, schoolId: string) => apiClient.patch(`/api/admin/teachers/${id}/school`, { schoolId }),
  blockTeacher: (id: string, isBlocked: boolean) => apiClient.patch(`/api/admin/teachers/${id}/status`, { isBlocked }),
};
