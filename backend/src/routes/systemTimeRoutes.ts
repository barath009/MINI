import { Router } from 'express';
import {
  getSystemTime,
  setTestMode,
  setTestTime,
  advanceTestTime,
  setPlayback,
  resetSystemTime,
} from '../controllers/clockController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// Any authenticated user can read system time
router.get('/', authenticate, getSystemTime);
router.get('/status', authenticate, getSystemTime);

// Admin-only operations
router.put('/test-mode', authenticate, authorize('ADMIN'), setTestMode);
router.post('/test-mode', authenticate, authorize('ADMIN'), setTestMode);

router.put('/set', authenticate, authorize('ADMIN'), setTestTime);
router.post('/set', authenticate, authorize('ADMIN'), setTestTime);
router.post('/set-time', authenticate, authorize('ADMIN'), setTestTime);
router.put('/set-time', authenticate, authorize('ADMIN'), setTestTime);

router.post('/advance', authenticate, authorize('ADMIN'), advanceTestTime);
router.post('/playback', authenticate, authorize('ADMIN'), setPlayback);
router.post('/reset', authenticate, authorize('ADMIN'), resetSystemTime);

export default router;
