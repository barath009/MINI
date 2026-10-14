import { Router } from 'express';
import {
  getParentDashboard,
  getParentWards,
  getWardAttendanceHistory,
  getWardAttendanceSummary,
} from '../controllers/parentController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { verifyParentWardAccess } from '../middleware/parentOwnership';

const router = Router();

// Protect all parent routes with authentication and PARENT / ADMIN RBAC
router.use(authenticate, authorize('PARENT', 'ADMIN'));

router.get('/dashboard', getParentDashboard);
router.get('/wards', getParentWards);
router.get('/wards/:studentId/attendance', verifyParentWardAccess, getWardAttendanceHistory);
router.get('/wards/:studentId/summary', verifyParentWardAccess, getWardAttendanceSummary);

export default router;
