"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminHandler = adminHandler;
const adminService_1 = require("../services/adminService");
function body(req, allowed) {
    const value = req.body;
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k)))
        throw new adminService_1.AdminError(400, 'Data tidak valid atau berisi field yang tidak diizinkan.');
    return value;
}
function string(value, max = 120) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
        throw new adminService_1.AdminError(400, 'Lengkapi data dengan format dan panjang yang benar.');
    return value.trim();
}
function teacherId(req) {
    const id = string(req.params.teacherId, 36);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        throw new adminService_1.AdminError(400, 'ID guru tidak valid.');
    return id;
}
function code(value) {
    const result = string(value, 64).toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(result))
        throw new adminService_1.AdminError(400, 'Kode sekolah hanya boleh memakai huruf, angka, dan tanda hubung.');
    return result;
}
function boolean(value) {
    if (typeof value !== 'boolean')
        throw new adminService_1.AdminError(400, 'Status harus berupa boolean.');
    return value;
}
function adminHandler(action) {
    return async (req, res) => {
        try {
            const actor = req.user.id;
            let result;
            if (action === 'schools')
                result = await (0, adminService_1.listSchools)();
            else if (action === 'teachers')
                result = await (0, adminService_1.listTeachers)();
            else if (action === 'school_create') {
                const data = body(req, ['name', 'code']);
                result = await (0, adminService_1.manage)(actor, action, null, { name: string(data.name), code: code(data.code) });
            }
            else if (action === 'school_update') {
                const data = body(req, ['name', 'code', 'is_active']);
                if (!Object.keys(data).length)
                    throw new adminService_1.AdminError(400, 'Tidak ada perubahan.');
                const patch = {};
                if ('name' in data)
                    patch.name = string(data.name);
                if ('code' in data)
                    patch.code = code(data.code);
                if ('is_active' in data)
                    patch.is_active = boolean(data.is_active);
                result = await (0, adminService_1.manage)(actor, action, string(req.params.schoolId, 254), patch);
            }
            else if (action === 'invite') {
                const data = body(req, ['email', 'name', 'schoolId']);
                const email = string(data.email, 254).toLowerCase();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                    throw new adminService_1.AdminError(400, 'Email guru tidak valid.');
                result = await (0, adminService_1.inviteTeacher)(actor, email, string(data.name), string(data.schoolId, 254));
            }
            else if (action === 'teacher_school') {
                const data = body(req, ['schoolId']);
                result = await (0, adminService_1.manage)(actor, action, teacherId(req), { school_id: string(data.schoolId, 254) });
            }
            else if (action === 'teacher_status') {
                const data = body(req, ['isBlocked']);
                result = await (0, adminService_1.manage)(actor, action, teacherId(req), { is_blocked: boolean(data.isBlocked) });
            }
            res.status(action === 'invite' || action === 'school_create' ? 201 : 200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(error instanceof adminService_1.AdminError ? error.status : 503).json({ error: error instanceof adminService_1.AdminError ? error.message : 'Layanan administrasi belum tersedia. Silakan coba lagi.' });
        }
    };
}
