"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInvitation = acceptInvitation;
const supabaseService_1 = require("../services/supabaseService");
async function acceptInvitation(req, res) {
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 8 || password.length > 128 || Object.keys(req.body).some(k => k !== 'password')) {
        res.status(400).json({ error: 'Password harus 8 sampai 128 karakter.' });
        return;
    }
    try {
        const { data: invitation, error } = await supabaseService_1.supabaseAdmin.from('teacher_invitations').select('id,status').eq('user_id', req.user.id).maybeSingle();
        if (error) {
            res.status(503).json({ error: 'Undangan belum dapat diperiksa.' });
            return;
        }
        if (!invitation || !['sent', 'accepted'].includes(invitation.status)) {
            res.status(409).json({ error: 'Undangan tidak tersedia untuk akun ini.' });
            return;
        }
        if (invitation.status === 'accepted') {
            res.json({ success: true, alreadyAccepted: true });
            return;
        }
        const { error: passwordError } = await supabaseService_1.supabaseAdmin.auth.admin.updateUserById(req.user.id, { password });
        if (passwordError) {
            res.status(400).json({ error: 'Password belum dapat disimpan. Gunakan password yang memenuhi kebijakan akun.' });
            return;
        }
        const { error: acceptanceError } = await supabaseService_1.supabaseAdmin.rpc('accept_teacher_invitation', { p_user: req.user.id });
        if (acceptanceError) {
            res.status(503).json({ error: 'Password tersimpan, tetapi status undangan belum diperbarui. Coba kembali.' });
            return;
        }
        res.json({ success: true });
    }
    catch {
        res.status(503).json({ error: 'Aktivasi belum dapat diselesaikan. Coba kembali.' });
    }
}
