"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authController_1 = require("../controllers/authController");
const invitationController_1 = require("../controllers/invitationController");
const router = (0, express_1.Router)();
// Invitation routes
router.post('/accept-invite', auth_1.requireAuth, (0, auth_1.requireRole)('teacher'), invitationController_1.acceptInvitation);
// Authentication routes
router.post('/register', authController_1.registerUser);
router.post('/login', authController_1.loginUser);
// Current authenticated user
router.get('/me', auth_1.requireAuth, (req, res) => {
    res.json({
        user: req.user,
    });
});
exports.default = router;
