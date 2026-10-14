import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import {
  getStudentTemplate,
  getFacultyTemplate,
  getAllocationTemplate,
  getSubjectTemplate,
  previewStudentImport,
  confirmStudentImport,
  previewFacultyImport,
  confirmFacultyImport,
  previewAllocationImport,
  confirmAllocationImport,
  previewSubjectImport,
  confirmSubjectImport,
  getSectionTemplate,
  previewSectionImport,
  confirmSectionImport,
  exportSections,
  getSectionImportHistory,
  exportStudents,
  exportFaculty,
  exportSubjects,
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
router.get('/templates/subjects', getSubjectTemplate);
router.get('/templates/sections', getSectionTemplate);
router.get('/sections/template', getSectionTemplate);

// Student Import
router.post('/students/preview', upload.single('file'), previewStudentImport);
router.post('/students/confirm/:jobId', confirmStudentImport);

// Faculty Import
router.post('/faculty/preview', upload.single('file'), previewFacultyImport);
router.post('/faculty/confirm/:jobId', confirmFacultyImport);

// Allocation Import
router.post('/allocations/preview', upload.single('file'), previewAllocationImport);
router.post('/allocations/confirm/:jobId', confirmAllocationImport);

// Subject Import
router.post('/subjects/preview', upload.single('file'), previewSubjectImport);
router.post('/subjects/confirm/:jobId', confirmSubjectImport);

// Section Import
router.post('/sections/preview', upload.single('file'), previewSectionImport);
router.post('/sections/confirm/:jobId', confirmSectionImport);
router.post('/sections/confirm', confirmSectionImport);
router.get('/sections/history', getSectionImportHistory);
router.get('/sections/:jobId/errors', downloadErrorReport);

// Exports
router.get('/export/students', exportStudents);
router.get('/export/faculty', exportFaculty);
router.get('/export/subjects', exportSubjects);
router.get('/export/sections', exportSections);
router.get('/sections/export', exportSections);

// History, Details, Errors, and Cancel
router.get('/history', getImportHistory);
router.get('/history/:jobId', getImportJobDetail);
router.get('/history/:jobId/errors', downloadErrorReport);
router.post('/history/:jobId/cancel', cancelImportJob);
router.put('/preview/:jobId/row', updatePreviewRow);

export default router;
