"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvatarError = void 0;
exports.getAvatarCollection = getAvatarCollection;
exports.changeAvatar = changeAvatar;
const supabaseService_1 = require("./supabaseService");
const gamificationService_1 = require("./gamificationService");
class AvatarError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.AvatarError = AvatarError;
async function getAvatarCollection(userId) {
    const [progress, catalog, ownership, profile, history] = await Promise.all([
        (0, gamificationService_1.getGamification)(userId),
        supabaseService_1.supabaseAdmin.from('avatar_catalog').select('id,name,description,emoji,cost_exp,is_active').order('cost_exp').order('id'),
        supabaseService_1.supabaseAdmin.from('user_avatars').select('avatar_id,unlocked_at').eq('user_id', userId),
        supabaseService_1.supabaseAdmin.from('profiles').select('avatar,equipped_avatar_id').eq('id', userId).single(),
        supabaseService_1.supabaseAdmin.from('gamification_events').select('id,event_type,reward_delta,xp_after,exp_after,reason,created_at').eq('student_id', userId).order('created_at', { ascending: false }).order('id').limit(30),
    ]);
    if (catalog.error || ownership.error || profile.error || history.error)
        throw new Error('Avatar collection query failed');
    const owned = new Set((ownership.data ?? []).map(item => item.avatar_id));
    return { xp: progress.xp, level: progress.level, expBalance: progress.expBalance,
        avatar: profile.data.avatar, equippedAvatarId: profile.data.equipped_avatar_id,
        avatars: (catalog.data ?? []).filter(item => item.is_active || owned.has(item.id))
            .map(item => ({ ...item, owned: owned.has(item.id), equipped: item.id === profile.data.equipped_avatar_id })),
        history: history.data ?? [] };
}
async function changeAvatar(userId, avatarId, action) {
    const { data, error } = await supabaseService_1.supabaseAdmin.rpc(action === 'unlock' ? 'unlock_avatar' : 'equip_avatar', {
        p_user_id: userId, p_avatar_id: avatarId,
    });
    if (error) {
        const known = {
            INSUFFICIENT_EXP: [409, 'EXP belum cukup untuk membuka avatar ini.'],
            AVATAR_NOT_AVAILABLE: [404, 'Avatar tidak tersedia.'],
            AVATAR_NOT_OWNED: [403, 'Buka avatar terlebih dahulu sebelum memakainya.'],
            PROFILE_NOT_FOUND: [404, 'Profil tidak ditemukan.'],
        };
        const mapped = known[error.message];
        if (mapped)
            throw new AvatarError(...mapped);
        throw new Error('Avatar transaction failed');
    }
    return data;
}
