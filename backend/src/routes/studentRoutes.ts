import { Router } from 'express';
import {
  getStudentDashboard,
  getAttendanceHistory,
  createDispute,
  getStudentDisputes,
} from '../controllers/studentController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// Protect all student routes with authentication and STUDENT RBAC
router.use(authenticate, authorize('STUDENT', 'ADMIN'));

router.get('/dashboard', getStudentDashboard);
router.get('/history', getAttendanceHistory);
router.post('/disputes', createDispute);
router.get('/disputes', getStudentDisputes);

export default router;
