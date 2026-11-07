
import { Router } from 'express';

import { requireAuth, requireRole } from '../middleware/auth';

import {
  loginUser,
  registerUser,
} from '../controllers/authController';

import { acceptInvitation } from '../controllers/invitationController';

const router = Router();

// Invitation routes
router.post(
  '/accept-invite',
  requireAuth,
  requireRole('teacher'),
  acceptInvitation
);

// Authentication routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Current authenticated user
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
  });
});

export default router;
