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
  deleteAllDepartments,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  deleteAllSubjects,
  getClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  deleteAllClassrooms,
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  getSessions,
  createSession,
  deleteSession,
  deleteAllSessions,
  startSession,
  endSession,
  enrollBiometrics,
  getAuditLogs,
  getSettings,
  updateSetting,
  getModerators,
  createModerator,
  getAdmins,
  createAdminUser,
  deleteAdminUser,
  deleteModerator,
  updateUserStatus,
} from '../controllers/adminController';
import {
  createParent,
  getParents,
  getParentById,
  updateParent,
  updateParentStatus,
  assignWard,
  removeWard,
  resetParentPassword,
} from '../controllers/adminParentController';
import {
  getAdminTimetable,
  assignTimetablePeriod,
  updateTimetablePeriod,
  deleteTimetablePeriod,
} from '../controllers/adminTimetableController';
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
router.delete('/departments/all', deleteAllDepartments);
router.delete('/departments', deleteAllDepartments);
router.delete('/departments/:id', deleteDepartment);
router.get('/sections', getSections);
router.post('/sections', createSection);
router.put('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);

// Subjects
router.get('/subjects', getSubjects);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/all', deleteAllSubjects);
router.delete('/subjects', deleteAllSubjects);
router.delete('/subjects/:id', deleteSubject);

// Classrooms
router.get('/classrooms', getClassrooms);
router.post('/classrooms', createClassroom);
router.put('/classrooms/:id', updateClassroom);
router.delete('/classrooms/all', deleteAllClassrooms);
router.delete('/classrooms', deleteAllClassrooms);
router.delete('/classrooms/:id', deleteClassroom);

// Timetable Schedule Management
router.get('/timetable', getAdminTimetable);
router.post('/timetable', assignTimetablePeriod);
router.put('/timetable/:id', updateTimetablePeriod);
router.delete('/timetable/:id', deleteTimetablePeriod);

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
router.delete('/sessions/all', deleteAllSessions);
router.delete('/sessions', deleteAllSessions);
router.delete('/sessions/:id', deleteSession);
router.post('/sessions/:id/start', startSession);
router.post('/sessions/:id/end', endSession);

// Biometrics, Audit, Settings
router.post('/biometrics/enroll', enrollBiometrics);
router.get('/audit', getAuditLogs);
router.get('/settings', getSettings);
router.put('/settings', updateSetting);

// System Time Control (Admin Only for modifications)
router.get('/system-time', getSystemTime);
router.put('/system-time/test-mode', authorize('ADMIN'), setTestMode);
router.put('/system-time/set', authorize('ADMIN'), setTestTime);
router.post('/system-time/advance', authorize('ADMIN'), advanceTestTime);
router.post('/system-time/playback', authorize('ADMIN'), setPlayback);
router.post('/system-time/reset', authorize('ADMIN'), resetSystemTime);

// Administrator Management (Admin Only)
router.get('/admins', authorize('ADMIN'), getAdmins);
router.post('/admins', authorize('ADMIN'), createAdminUser);
router.delete('/admins/:id', authorize('ADMIN'), deleteAdminUser);

// Moderator Management (Admin Only)
router.get('/moderators', authorize('ADMIN'), getModerators);
router.post('/moderators', authorize('ADMIN'), createModerator);
router.delete('/moderators/:id', authorize('ADMIN'), deleteModerator);

// Parent Management (Admin & Moderator)
router.post('/parents', createParent);
router.get('/parents', getParents);
router.get('/parents/:id', getParentById);
router.patch('/parents/:id', updateParent);
router.patch('/parents/:id/status', updateParentStatus);
router.post('/parents/:id/wards', assignWard);
router.delete('/parents/:id/wards/:studentId', removeWard);
router.post('/parents/:id/reset-password', resetParentPassword);

export default router;
