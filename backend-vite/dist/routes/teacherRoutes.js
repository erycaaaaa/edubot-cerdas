"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const teacherController_1 = require("../controllers/teacherController");
const router = (0, express_1.Router)();
// All teacher routes require authentication and teacher role
router.use(auth_1.requireAuth, (0, auth_1.requireRole)('teacher'));
// GET /api/teacher/classes
router.get('/classes', teacherController_1.getClasses);
// GET /api/teacher/students
router.get('/students', teacherController_1.getStudents);
// GET /api/teacher/students/:studentId/chat-history
router.get('/students/:studentId/chat-history', teacherController_1.getStudentChatHistory);
// GET /api/teacher/students/:studentId/gamification
router.get('/students/:studentId/gamification', teacherController_1.getStudentGamification);
// GET /api/teacher/notifications
router.get('/notifications', teacherController_1.getNotifications);
// PATCH /api/teacher/notifications/read-all
router.patch('/notifications/read-all', teacherController_1.markAllNotificationsRead);
// PATCH /api/teacher/notifications/:id/read
router.patch('/notifications/:id/read', teacherController_1.markNotificationRead);
// POST /api/teacher/students/:studentId/reset-strikes
router.post('/students/:studentId/reset-strikes', teacherController_1.handleResetStudentStrikes);
exports.default = router;
