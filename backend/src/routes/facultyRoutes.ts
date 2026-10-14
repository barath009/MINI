import { Router } from 'express';
import {
  getFacultyDashboard,
  getMyStudents,
  getSessionAttendance,
  manualAttendanceOverride,
  getFacultyDisputes,
  reviewDispute,
} from '../controllers/facultyController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// Protect all faculty routes with authentication and FACULTY / ADMIN RBAC
router.use(authenticate, authorize('FACULTY', 'ADMIN'));

router.get('/dashboard', getFacultyDashboard);
router.get('/students', getMyStudents);
router.get('/attendance/:sessionId', getSessionAttendance);
router.put('/attendance/:id/override', manualAttendanceOverride);
router.get('/disputes', getFacultyDisputes);
router.put('/disputes/:id', reviewDispute);

export default router;
