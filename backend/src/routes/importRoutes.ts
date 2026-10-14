import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import {
  getStudentTemplate,
  getFacultyTemplate,
  getAllocationTemplate,
  previewStudentImport,
  confirmStudentImport,
  previewFacultyImport,
  confirmFacultyImport,
  previewAllocationImport,
  confirmAllocationImport,
  exportStudents,
  exportFaculty,
  getImportHistory,
  getImportJobDetail,
  downloadErrorReport,
  cancelImportJob,
  updatePreviewRow,
} from '../controllers/importController';

const router = Router();

// Memory storage for file uploads (never write temporary files permanently to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .csv files are supported.'));
    }
  },
});

// ADMIN & MODERATOR RBAC (Moderators have full operational access)
router.use(authenticate, authorize('ADMIN', 'MODERATOR'));

// Template downloads
router.get('/templates/students', getStudentTemplate);
router.get('/templates/faculty', getFacultyTemplate);
router.get('/templates/allocations', getAllocationTemplate);

// Student Import
router.post('/students/preview', upload.single('file'), previewStudentImport);
router.post('/students/confirm/:jobId', confirmStudentImport);

// Faculty Import
router.post('/faculty/preview', upload.single('file'), previewFacultyImport);
router.post('/faculty/confirm/:jobId', confirmFacultyImport);

// Allocation Import
router.post('/allocations/preview', upload.single('file'), previewAllocationImport);
router.post('/allocations/confirm/:jobId', confirmAllocationImport);

// Exports
router.get('/export/students', exportStudents);
router.get('/export/faculty', exportFaculty);

// History, Details, Errors, and Cancel
router.get('/history', getImportHistory);
router.get('/history/:jobId', getImportJobDetail);
router.get('/history/:jobId/errors', downloadErrorReport);
router.post('/history/:jobId/cancel', cancelImportJob);
router.put('/preview/:jobId/row', updatePreviewRow);

export default router;
