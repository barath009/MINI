import { Router } from 'express';
import { exportAttendanceReport } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.get('/export', authenticate, authorize('ADMIN', 'FACULTY'), exportAttendanceReport);

export default router;
