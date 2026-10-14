import { Router } from 'express';
import {
  getStudentDashboard,
  getAttendanceHistory,
  getStudentTimetable,
  getStudentAnalytics,
  getStudentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  reportAttendanceIssue,
  getStudentAttendanceIssues,
  getStudentProfile,
  updateStudentProfile,
} from '../controllers/studentController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

// Protect all student routes with authentication and STUDENT / ADMIN RBAC
router.use(authenticate, authorize('STUDENT', 'ADMIN'));

router.get('/dashboard', getStudentDashboard);
router.get('/attendance', getAttendanceHistory);
router.get('/history', getAttendanceHistory); // Compatibility alias
router.get('/timetable', getStudentTimetable);
router.get('/analytics', getStudentAnalytics);
router.get('/notifications', getStudentNotifications);
router.patch('/notifications/read-all', markAllNotificationsAsRead);
router.patch('/notifications/:id/read', markNotificationAsRead);
router.post('/attendance-issues', reportAttendanceIssue);
router.get('/attendance-issues', getStudentAttendanceIssues);
router.post('/disputes', reportAttendanceIssue); // Compatibility alias
router.get('/disputes', getStudentAttendanceIssues); // Compatibility alias
router.get('/profile', getStudentProfile);
router.patch('/profile', updateStudentProfile);

export default router;
