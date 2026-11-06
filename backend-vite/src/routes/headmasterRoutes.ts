import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getSchoolClasses,
  getSchoolStudents,
  getSchoolTeachers,
  getSchoolDashboard,
  getSchoolStudentChatHistory,
  getSchoolStudentGamification,
} from '../controllers/headmasterController';

const router = Router();
router.use(requireAuth, requireRole('headmaster'));

router.get('/classes', getSchoolClasses);
router.get('/students', getSchoolStudents);
router.get('/teachers', getSchoolTeachers);
router.get('/dashboard', getSchoolDashboard);
router.get('/students/:studentId/chat-history', getSchoolStudentChatHistory);
router.get('/students/:studentId/gamification', getSchoolStudentGamification);

export default router;
