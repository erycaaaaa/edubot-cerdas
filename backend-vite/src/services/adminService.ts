import { supabaseAdmin } from './supabaseService';

export class AdminError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function manage(actor: string, action: string, target: string | null, data: Record<string, unknown>) {
  const { data: result, error } = await supabaseAdmin.rpc('admin_manage', {
    p_actor: actor, p_action: action, p_target: target, p_data: data,
  });
  if (error) {
    const messages: Record<string, [number, string]> = {
      ADMIN_REQUIRED: [403, 'Akses admin diperlukan.'], SCHOOL_NOT_FOUND: [404, 'Sekolah tidak ditemukan.'],
      SCHOOL_UNAVAILABLE: [409, 'Sekolah tidak ditemukan atau tidak aktif.'], TEACHER_NOT_FOUND: [404, 'Guru tidak ditemukan.'],
      EMAIL_EXISTS: [409, 'Email sudah terdaftar.'], INVITATION_NOT_PENDING: [409, 'Undangan sudah diproses.'],
    };
    if (error.code === '23505') throw new AdminError(409, 'Kode sekolah atau email undangan sudah digunakan.');
    const mapped = messages[error.message];
    if (mapped) throw new AdminError(...mapped);
    throw new AdminError(503, 'Perubahan belum dapat disimpan. Muat ulang data sebelum mencoba lagi.');
  }
  return result;
}
async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await page(offset, offset + 999);
    if (error) throw new AdminError(503, 'Data administrasi belum dapat dimuat.');
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}
export async function listSchools() {
  const [schools, teachers] = await Promise.all([
    allRows((from, to) => supabaseAdmin.from('schools').select('id,name,code,is_active,created_at,updated_at').order('name').order('id').range(from, to)),
    allRows((from, to) => supabaseAdmin.from('profiles').select('school_id').eq('role', 'teacher').order('id').range(from, to)),
  ]);
  const counts = new Map<string, number>();
  for (const teacher of teachers) if (teacher.school_id) counts.set(teacher.school_id, (counts.get(teacher.school_id) ?? 0) + 1);
  return schools.map(school => ({ ...school, teacher_count: counts.get(school.id) ?? 0 }));
}
export async function listTeachers() {
  const [teachers, invitations] = await Promise.all([
    allRows((from, to) => supabaseAdmin.from('profiles').select('id,name,email,school_id,is_blocked').eq('role', 'teacher').order('name').order('id').range(from, to)),
    allRows((from, to) => supabaseAdmin.from('teacher_invitations').select('id,email,name,school_id,user_id,status,created_at,accepted_at').order('created_at', { ascending: false }).order('id').range(from, to)),
  ]);
  return { teachers, invitations };
}
export async function inviteTeacher(actor: string, email: string, name: string, schoolId: string) {
  const origin = process.env.APP_URL;
  let redirectTo: string;
  try {
    const url = new URL(origin ?? '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
    redirectTo = new URL('/accept-invite', url.origin).href;
  } catch { throw new AdminError(503, 'Alamat aktivasi undangan belum dikonfigurasi. Hubungi pengelola.'); }
  // Reserve a unique email before contacting Auth: concurrent/retried requests cannot send twice.
  const invitation = await manage(actor, 'invite_prepare', null, { email, name, school_id: schoolId });
  try {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { name } });
    if (error || !data.user) throw new AdminError(error?.status === 422 ? 409 : 502, 'Undangan belum berhasil dikirim. Email mungkin sudah terdaftar; periksa status sebelum mencoba kembali.');
    // Insert only: never promote/overwrite an existing profile or trust user_metadata for role.
    await manage(actor, 'invite_finish', invitation.id, { user_id: data.user.id });
    return { id: invitation.id, status: 'sent' };
  } catch (error) {
    // Auth/email and PostgreSQL cannot share a transaction. Retain a durable failed reservation
    // for reconciliation; never delete/promote a possibly pre-existing Auth account.
    try { await manage(actor, 'invite_failed', invitation.id, {}); } catch { /* pending remains visible for reconciliation */ }
    if (error instanceof AdminError) throw error;
    throw new AdminError(502, 'Status undangan belum dapat dipastikan. Periksa daftar undangan sebelum mencoba kembali.');
  }
}
