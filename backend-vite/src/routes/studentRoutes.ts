import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';

import {
    getMyStrikes,
    getMyGamification,
    submitGamificationFeedback,
} from '../controllers/studentController';

const router = Router();
router.use(requireAuth, requireRole('student'));

import { getMyAvatars, avatarAction } from '../controllers/avatarController';
router.get('/avatars', getMyAvatars);
router.post('/avatars/:avatarId/unlock', avatarAction('unlock'));
router.post('/avatars/:avatarId/equip', avatarAction('equip'));

// GET /api/me/strikes
router.get('/strikes', getMyStrikes);

// GET /api/me/gamification
router.get('/gamification', getMyGamification);

// POST /api/me/gamification/feedback
router.post('/gamification/feedback', submitGamificationFeedback);

export default router;
