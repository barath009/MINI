import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerStudentSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  registerNumber: z.string().min(3, 'Register number is required'),
  rollNumber: z.string().min(3, 'Roll number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required'),
  sectionId: z.string().min(1, 'Section is required'),
  year: z.number().min(1).max(5),
  semester: z.number().min(1).max(10),
  academicYear: z.string().min(4),
  password: z.string().min(6, 'Initial password must be at least 6 characters').optional(),
});

export const updateStudentSchema = z.object({
  name: z.string().min(2, 'Name is required').optional(),
  registerNumber: z.string().min(3, 'Register number is required').optional(),
  rollNumber: z.string().min(3, 'Roll number is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  sectionId: z.string().optional(),
  year: z.number().min(1).max(5).optional(),
  semester: z.number().min(1).max(10).optional(),
  biometricStatus: z.enum(['PENDING', 'ENROLLED', 'RE_ENROLL_REQUIRED']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'WITHDRAWN']).optional(),
});

export const registerFacultySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  employeeId: z.string().min(3, 'Employee ID is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required'),
  designation: z.string().min(2, 'Designation is required'),
  password: z.string().min(6, 'Initial password must be at least 6 characters').optional(),
});

export const createSubjectSchema = z.object({
  code: z.string().min(2, 'Subject code is required'),
  name: z.string().min(2, 'Subject name is required'),
  departmentId: z.string().min(1, 'Department is required'),
  semester: z.number().min(1).max(10),
  credits: z.number().min(1).max(10).default(3),
});

export const createClassroomSchema = z.object({
  building: z.string().min(2, 'Building is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  floor: z.number(),
  capacity: z.number().min(1),
  departmentId: z.string().optional(),
  sectionId: z.string().optional(),
});

export const createIoTDeviceSchema = z.object({
  deviceId: z.string().min(3, 'Unique Device ID must be at least 3 characters'),
  deviceName: z.string().min(3, 'Device Display Name must be at least 3 characters'),
  deviceType: z.enum(['RASPBERRY_PI', 'ESP32_CAM', 'CUSTOM_EDGE']),
  classroomId: z.string().min(1, 'Assigned Classroom is required'),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  apiKey: z.string().min(6, 'Device Password / Passcode must be at least 6 characters'),
});

export const createSessionSchema = z.object({
  subjectId: z.string().optional(),
  facultyId: z.string().min(1, 'Faculty is required'),
  sectionId: z.string().optional(),
  classroomId: z.string().min(1, 'Classroom is required'),
  date: z.string(), // ISO string or YYYY-MM-DD
  startTime: z.string().min(4), // HH:MM
  endTime: z.string().min(4),   // HH:MM
  gracePeriodMinutes: z.number().min(0).default(10),
  academicYear: z.string().min(4).default('2026-2027'),
  semester: z.number().min(1).default(5),
});

export const recognizeAttendanceSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  timestamp: z.string().optional(),
  image: z.string().optional(), // Base64 encoded image
  imagePath: z.string().optional(),
  mockStudentRegisterNumber: z.string().optional(), // Dev testing override
});

export const manualOverrideSchema = z.object({
  status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED']),
  reason: z.string().min(5, 'Reason for override is required'),
  remark: z.string().optional(),
});

export const createDisputeSchema = z.object({
  attendanceId: z.string().min(1, 'Attendance record ID is required'),
  reason: z.string().min(10, 'Detailed dispute reason is required'),
  evidenceReference: z.string().optional(),
});

export const reviewDisputeSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewRemark: z.string().min(3, 'Review remark is required'),
});

// Parent Management Schemas
export const createParentSchema = z.object({
  name: z.string().min(2, 'Parent name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(10, 'Valid phone number is required (at least 10 digits)'),
  relationship: z.string().optional().default('Guardian'),
  secondaryPhone: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  studentIds: z.array(z.string()).optional(),
});

export const updateParentSchema = z.object({
  name: z.string().min(2, 'Parent name is required').optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const assignWardSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  relationship: z.string().optional().default('Guardian'),
});

// Student Portal Schemas
export const reportAttendanceIssueSchema = z.object({
  attendanceId: z.string().optional().or(z.literal('')),
  subjectId: z.string().optional().or(z.literal('')),
  attendanceDate: z.string().optional().or(z.literal('')),
  issueCategory: z.enum([
    'Biometric attendance missing',
    'Incorrect attendance status',
    'Incorrect recorded time',
    'Other attendance issue',
  ]),
  description: z.string().min(10, 'Detailed description is required (at least 10 characters)'),
  evidenceReference: z.string().optional(),
});

export const updateStudentProfileSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

