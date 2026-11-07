import { Request, Response } from 'express';
import { AdminError, inviteTeacher, listSchools, listTeachers, manage } from '../services/adminService';

function body(req: Request, allowed: string[]) {
  const value = req.body;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new AdminError(400, 'Data tidak valid atau berisi field yang tidak diizinkan.');
  return value as Record<string, unknown>;
}
function string(value: unknown, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new AdminError(400, 'Lengkapi data dengan format dan panjang yang benar.');
  return value.trim();
}
function teacherId(req: Request) {
  const id = string(req.params.teacherId, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new AdminError(400, 'ID guru tidak valid.');
  return id;
}
function code(value: unknown) {
  const result = string(value, 64).toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(result)) throw new AdminError(400, 'Kode sekolah hanya boleh memakai huruf, angka, dan tanda hubung.');
  return result;
}
function boolean(value: unknown) {
  if (typeof value !== 'boolean') throw new AdminError(400, 'Status harus berupa boolean.');
  return value;
}
export function adminHandler(action: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const actor = req.user!.id;
      let result: unknown;
      if (action === 'schools') result = await listSchools();
      else if (action === 'teachers') result = await listTeachers();
      else if (action === 'school_create') {
        const data = body(req, ['name', 'code']);
        result = await manage(actor, action, null, { name: string(data.name), code: code(data.code) });
      } else if (action === 'school_update') {
        const data = body(req, ['name', 'code', 'is_active']);
        if (!Object.keys(data).length) throw new AdminError(400, 'Tidak ada perubahan.');
        const patch: Record<string, unknown> = {};
        if ('name' in data) patch.name = string(data.name);
        if ('code' in data) patch.code = code(data.code);
        if ('is_active' in data) patch.is_active = boolean(data.is_active);
        result = await manage(actor, action, string(req.params.schoolId, 254), patch);
      } else if (action === 'invite') {
        const data = body(req, ['email', 'name', 'schoolId']);
        const email = string(data.email, 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AdminError(400, 'Email guru tidak valid.');
        result = await inviteTeacher(actor, email, string(data.name), string(data.schoolId, 254));
      } else if (action === 'teacher_school') {
        const data = body(req, ['schoolId']);
        result = await manage(actor, action, teacherId(req), { school_id: string(data.schoolId, 254) });
      } else if (action === 'teacher_status') {
        const data = body(req, ['isBlocked']);
        result = await manage(actor, action, teacherId(req), { is_blocked: boolean(data.isBlocked) });
      }
      res.status(action === 'invite' || action === 'school_create' ? 201 : 200).json({ success: true, data: result });
    } catch (error) {
      res.status(error instanceof AdminError ? error.status : 503).json({ error: error instanceof AdminError ? error.message : 'Layanan administrasi belum tersedia. Silakan coba lagi.' });
    }
  };
}
