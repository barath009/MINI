export type UserRole = 'ADMIN' | 'FACULTY' | 'STUDENT' | 'MODERATOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  status: UserStatus;
  profile?: any;
}

export interface Student {
  id: string;
  userId: User | string;
  rollNumber: string;
  registerNumber: string;
  departmentId: any;
  sectionId: any;
  year: number;
  semester: number;
  academicYear: string;
  biometricStatus: 'PENDING' | 'ENROLLED' | 'RE_ENROLL_REQUIRED';
  status: string;
}

export interface Faculty {
  id: string;
  userId: User | string;
  employeeId: string;
  departmentId: any;
  designation: string;
  status: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: any;
  sessionId: any;
  subjectId: any;
  facultyId: any;
  classroomId: any;
  date: string;
  timestamp: string;
  status: AttendanceStatus;
  markedBy: string;
  recognitionMethod: string;
  confidenceScore?: number;
  overrideReason?: string;
  overrideRemark?: string;

  // Formatted display fields
  subjectName?: string;
  subjectCode?: string;
  facultyName?: string;
  classroom?: string;
  time?: string;
}

export interface AttendanceSession {
  id: string;
  sessionId: string;
  subjectId: any;
  facultyId: any;
  sectionId: any;
  classroomId: any;
  date: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  gracePeriodMinutes: number;
}

export interface IoTDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'RASPBERRY_PI' | 'ESP32_CAM' | 'CUSTOM_EDGE';
  classroomId: any;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';
  cameraStatus: 'OK' | 'ERROR' | 'OFFLINE';
  firmwareVersion: string;
  lastHeartbeat?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  readStatus: boolean;
  createdAt: string;
}

export interface AttendanceDisputeItem {
  id: string;
  studentId: any;
  attendanceId: any;
  reason: string;
  evidenceReference?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedBy?: any;
  reviewRemark?: string;
}
