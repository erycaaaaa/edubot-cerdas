import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getSchoolClasses,
  getSchoolStudents,
  getSchoolTeachers,
  getSchoolDashboard,
} from '../controllers/headmasterController';

const router = Router();
router.use(requireAuth, requireRole('headmaster'));

router.get('/classes', getSchoolClasses);
router.get('/students', getSchoolStudents);
router.get('/teachers', getSchoolTeachers);
router.get('/dashboard', getSchoolDashboard);

export default router;
