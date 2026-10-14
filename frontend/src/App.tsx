import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { BiometricKioskScanner } from './pages/public/BiometricKioskScanner';

// Admin Pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminStudents } from './pages/admin/Students';
import { AdminFaculty } from './pages/admin/Faculty';
import { FacultyByDepartment } from './pages/admin/FacultyByDepartment';
import { AdminAllocations } from './pages/admin/Allocations';
import { AdminDepartments } from './pages/admin/Departments';
import { AdminSections } from './pages/admin/Sections';
import { AdminSubjects } from './pages/admin/Subjects';
import { AdminTimetable } from './pages/admin/Timetable';
import { AdminClassrooms } from './pages/admin/Classrooms';
import { AdminDevices } from './pages/admin/Devices';
import { AdminSessions } from './pages/admin/Sessions';
import { AdminAttendance } from './pages/admin/Attendance';
import { AdminReports } from './pages/admin/Reports';
import { AdminBiometrics } from './pages/admin/Biometrics';
import { AdminAudit } from './pages/admin/Audit';
import { AdminSettings } from './pages/admin/Settings';
import { UserStatusControl } from './pages/admin/UserStatusControl';
import { BulkImport } from './pages/admin/BulkImport';

// Faculty Pages
import { FacultyDashboard } from './pages/faculty/Dashboard';
import { FacultyClasses } from './pages/faculty/Classes';
import { FacultyMyStudents } from './pages/faculty/MyStudents';
import { FacultySessionLiveAttendance } from './pages/faculty/SessionLiveAttendance';
import { FacultyDisputes } from './pages/faculty/Disputes';

// Student Pages
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentAttendanceHistory } from './pages/student/AttendanceHistory';
import { StudentAnalytics } from './pages/student/Analytics';
import { StudentBiometricStatus } from './pages/student/BiometricStatus';
import { StudentDisputes } from './pages/student/Disputes';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-xs text-slate-400">Verifying session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN' || user.role === 'MODERATOR') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'FACULTY') return <Navigate to="/faculty/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }
  return <>{children}</>;
};

import { DeviceLogin } from './pages/public/DeviceLogin';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/device-login" element={<DeviceLogin />} />
      <Route path="/biometric-scanner" element={<BiometricKioskScanner />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Admin Protected Routes (Accessible by Admin and Moderator) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="faculty" element={<AdminFaculty />} />
        <Route path="faculty-departments" element={<FacultyByDepartment />} />
        <Route path="allocations" element={<AdminAllocations />} />
        <Route path="departments" element={<AdminDepartments />} />
        <Route path="sections" element={<AdminSections />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="classrooms" element={<AdminClassrooms />} />
        <Route path="devices" element={<AdminDevices />} />
        <Route path="sessions" element={<AdminSessions />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="biometric" element={<AdminBiometrics />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="user-status-control" element={<UserStatusControl />} />
        <Route
          path="bulk-import"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MODERATOR']}>
              <BulkImport />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Faculty Protected Routes */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<FacultyDashboard />} />
        <Route path="classes" element={<FacultyClasses />} />
        <Route path="students" element={<FacultyMyStudents />} />
        <Route path="attendance/:sessionId" element={<FacultySessionLiveAttendance />} />
        <Route path="disputes" element={<FacultyDisputes />} />
      </Route>

      {/* Student Protected Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="history" element={<StudentAttendanceHistory />} />
        <Route path="analytics" element={<StudentAnalytics />} />
        <Route path="biometric-status" element={<StudentBiometricStatus />} />
        <Route path="disputes" element={<StudentDisputes />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

import { ThemeProvider } from './context/ThemeContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <AppRoutes />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};
