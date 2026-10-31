import { Request, Response } from 'express';
import { AvatarError, changeAvatar, getAvatarCollection } from '../services/avatarService';

function fail(res: Response, error: unknown) {
  if (error instanceof AvatarError) { res.status(error.status).json({ success: false, error: error.message }); return; }
  console.error('Avatar service error:', error instanceof Error ? error.message : 'Unknown error');
  res.status(503).json({ success: false, error: 'Koleksi avatar belum dapat diakses. Silakan coba lagi.' });
}

export async function getMyAvatars(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  try { res.json({ success: true, data: await getAvatarCollection(req.user.id) }); }
  catch (error) { fail(res, error); }
}

export function avatarAction(action: 'unlock' | 'equip') {
  return async (req: Request, res: Response): Promise<void> => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    const avatarId = req.params.avatarId;
    if (typeof avatarId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(avatarId)) {
      res.status(400).json({ error: 'ID avatar tidak valid.' }); return;
    }
    // ID comes from the path; identity comes only from verified middleware.
    if (req.body != null && (typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length > 0)) {
      res.status(400).json({ error: 'Kirim ID avatar saja, tanpa saldo, harga, atau ID pengguna.' }); return;
    }
    try { res.json({ success: true, data: await changeAvatar(req.user.id, avatarId, action) }); }
    catch (error) { fail(res, error); }
  };
}
