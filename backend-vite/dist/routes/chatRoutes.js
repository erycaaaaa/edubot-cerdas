"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const chatController_1 = require("../controllers/chatController");
const router = (0, express_1.Router)();
// CHAT
/**
 * POST /api/chat
 *
 * Requires:
 * Authorization: Bearer <Supabase access token>
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('student'), chatController_1.handleChatMessage);
exports.default = router;
