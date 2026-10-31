import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';

import {
  loginUser,
  registerUser,
} from '../controllers/authController';

import { acceptInvitation } from '../controllers/invitationController';
const router = Router();
router.post('/accept-invite', requireAuth, requireRole('teacher'), acceptInvitation);

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', requireAuth, (req, res) => { res.json({ user: req.user }); });

export default router;
