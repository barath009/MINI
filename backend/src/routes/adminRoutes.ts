import { Router } from 'express';
import {
  getDashboardData,
  getAnalyticsData,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  updateUserCredentials,
  getAllUsers,
  getAllocations,
  createAllocation,
  deleteAllocation,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getSections,
  createSection,
  deleteSection,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  getSessions,
  createSession,
  deleteSession,
  startSession,
  endSession,
  enrollBiometrics,
  getAuditLogs,
  getSettings,
  updateSetting,
  getModerators,
  createModerator,
  createAdminUser,
  deleteModerator,
  updateUserStatus,
} from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// Protect all admin routes with authentication and ADMIN or MODERATOR RBAC
router.use(authenticate, authorize('ADMIN', 'MODERATOR'));

router.get('/dashboard', getDashboardData);
router.get('/analytics', getAnalyticsData);

// User Credentials Management
router.put('/users/:id/credentials', updateUserCredentials);

// Students
router.get('/students', getStudents);
router.post('/students', createStudent);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

// Faculty
router.get('/faculty', getFaculty);
router.post('/faculty', createFaculty);
router.put('/faculty/:id', updateFaculty);
router.delete('/faculty/:id', deleteFaculty);

// Allocations
router.get('/allocations', getAllocations);
router.post('/allocations', createAllocation);
router.delete('/allocations/:id', deleteAllocation);

// Departments & Sections
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);
router.get('/sections', getSections);
router.post('/sections', createSection);
router.delete('/sections/:id', deleteSection);

// Subjects
router.get('/subjects', getSubjects);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

// Classrooms
router.get('/classrooms', getClassrooms);
router.post('/classrooms', createClassroom);
router.put('/classrooms/:id', updateClassroom);
router.delete('/classrooms/:id', deleteClassroom);

// Devices
router.get('/devices', getDevices);
router.post('/devices', createDevice);
router.put('/devices/:id', updateDevice);
router.delete('/devices/:id', deleteDevice);

// User Username & Password Change
router.get('/users', getAllUsers);
router.put('/users/:userId/credentials', updateUserCredentials);
router.put('/users/:userId/status', updateUserStatus);

// Sessions
router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.delete('/sessions/:id', deleteSession);
router.post('/sessions/:id/start', startSession);
router.post('/sessions/:id/end', endSession);

// Biometrics, Audit, Settings
router.post('/biometrics/enroll', enrollBiometrics);
router.get('/audit', getAuditLogs);
router.get('/settings', getSettings);
router.put('/settings', updateSetting);

// Moderator Management (Admin Only)
router.get('/moderators', authorize('ADMIN'), getModerators);
router.post('/moderators', authorize('ADMIN'), createModerator);
router.post('/admins', authorize('ADMIN'), createAdminUser);
router.delete('/moderators/:id', authorize('ADMIN'), deleteModerator);

export default router;
