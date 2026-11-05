"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const studentController_1 = require("../controllers/studentController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, (0, auth_1.requireRole)('student'));
const avatarController_1 = require("../controllers/avatarController");
router.get('/avatars', avatarController_1.getMyAvatars);
router.post('/avatars/:avatarId/unlock', (0, avatarController_1.avatarAction)('unlock'));
router.post('/avatars/:avatarId/equip', (0, avatarController_1.avatarAction)('equip'));
// GET /api/me/strikes
router.get('/strikes', studentController_1.getMyStrikes);
// GET /api/me/gamification
router.get('/gamification', studentController_1.getMyGamification);
// POST /api/me/gamification/feedback
router.post('/gamification/feedback', studentController_1.submitGamificationFeedback);
// GET /api/me/chat-history
router.get('/chat-history', studentController_1.getMyChatHistory);
exports.default = router;
