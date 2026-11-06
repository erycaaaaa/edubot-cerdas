import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getClasses,
  getStudents,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  handleResetStudentStrikes,
  getStudentChatHistory,
  getStudentGamification,
} from '../controllers/teacherController';

const router = Router();

// All teacher routes require authentication and teacher role
router.use(requireAuth, requireRole('teacher'));

// GET /api/teacher/classes
router.get('/classes', getClasses);

// GET /api/teacher/students
router.get('/students', getStudents);

// GET /api/teacher/students/:studentId/chat-history
router.get('/students/:studentId/chat-history', getStudentChatHistory);

// GET /api/teacher/students/:studentId/gamification
router.get('/students/:studentId/gamification', getStudentGamification);

// GET /api/teacher/notifications
router.get('/notifications', getNotifications);

// PATCH /api/teacher/notifications/read-all
router.patch('/notifications/read-all', markAllNotificationsRead);

// PATCH /api/teacher/notifications/:id/read
router.patch('/notifications/:id/read', markNotificationRead);

// POST /api/teacher/students/:studentId/reset-strikes
router.post('/students/:studentId/reset-strikes', handleResetStudentStrikes);

export default router;
