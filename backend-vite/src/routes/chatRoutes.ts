import { Router } from 'express';

import { requireAuth, requireRole } from '../middleware/auth';
import { handleChatMessage } from '../controllers/chatController';

const router = Router();

// CHAT

/**
 * POST /api/chat
 *
 * Requires:
 * Authorization: Bearer <Supabase access token>
 */
router.post(
  '/',
  requireAuth,
  requireRole('student'),
  handleChatMessage
);

export default router;
