import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import {
  getSections,
  createSection,
  updateSection,
  deleteSection,
} from '../controllers/adminController';
import { exportSections } from '../controllers/importController';

const router = Router();

// Allow authenticated users to view sections (for cascading dropdowns across portals)
router.get('/', authenticate, getSections);
router.get('/export', authenticate, authorize('ADMIN', 'MODERATOR'), exportSections);

// Admin / Moderator restricted mutations
router.post('/', authenticate, authorize('ADMIN', 'MODERATOR'), createSection);
router.put('/:id', authenticate, authorize('ADMIN', 'MODERATOR'), updateSection);
router.delete('/:id', authenticate, authorize('ADMIN', 'MODERATOR'), deleteSection);

export default router;
