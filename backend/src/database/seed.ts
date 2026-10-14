import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../models/User';
import { Department } from '../models/Department';
import { Section } from '../models/Section';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { Subject } from '../models/Subject';
import { Classroom } from '../models/Classroom';
import { IoTDevice } from '../models/IoTDevice';
import { Timetable } from '../models/Timetable';
import { ClassAllocation } from '../models/ClassAllocation';
import { AttendanceSession } from '../models/AttendanceSession';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { BiometricProfile } from '../models/BiometricProfile';
import { SystemSetting } from '../models/SystemSetting';
import { Notification } from '../models/Notification';

export const seedDataInline = async () => {
  const existingUserCount = await User.countDocuments();
  if (existingUserCount > 0) return;

  console.log('[Seed Inline] Initializing clean institutional configuration (Zero Sample Data)...');
  const defaultPasswordHash = await bcrypt.hash('Admin@123', 10);
  const facultyPasswordHash = await bcrypt.hash('Faculty@123', 10);
  const deviceKeyHash = await bcrypt.hash(config.deviceApiSecret, 10);

  // System Settings
  await SystemSetting.create([
    { key: 'RECOGNITION_THRESHOLD', value: 0.75, description: 'Minimum confidence score for face recognition match' },
    { key: 'LIVENESS_THRESHOLD', value: 0.70, description: 'Minimum liveness score for anti-spoofing' },
    { key: 'ATTENDANCE_GRACE_PERIOD', value: 10, description: 'Minutes after session start to mark PRESENT before LATE' },
    { key: 'LOW_ATTENDANCE_THRESHOLD', value: 75, description: 'Percentage below which student triggers defaulter alert' },
    { key: 'WARNING_ATTENDANCE_THRESHOLD', value: 75, description: 'Warning threshold for attendance' },
    { key: 'CRITICAL_ATTENDANCE_THRESHOLD', value: 65, description: 'Critical threshold for attendance' },
  ]);

  // System Administrator Account
  const adminUser = await User.create({
    name: 'BIT System Administrator',
    email: 'admin@bit.edu',
    passwordHash: defaultPasswordHash,
    role: 'ADMIN',
    phone: '+91 9876543210',
    status: 'ACTIVE',
  });

  // Seed All 13 Engineering Departments
  const cseDept = await Department.create({ code: 'CSE', name: 'Computer Science and Engineering' });
  const eceDept = await Department.create({ code: 'ECE', name: 'Electronics and Communication Engineering' });
  const eeeDept = await Department.create({ code: 'EEE', name: 'Electrical and Electronics Engineering' });
  const mechDept = await Department.create({ code: 'MECH', name: 'Mechanical Engineering' });
  const civilDept = await Department.create({ code: 'CIVIL', name: 'Civil Engineering' });
  const itDept = await Department.create({ code: 'IT', name: 'Information Technology' });
  const aidsDept = await Department.create({ code: 'AIDS', name: 'Artificial Intelligence and Data Science' });
  const aimlDept = await Department.create({ code: 'AIML', name: 'Artificial Intelligence and Machine Learning' });
  const biotechDept = await Department.create({ code: 'BIOTECH', name: 'Biotechnology' });
  const bmeDept = await Department.create({ code: 'BME', name: 'Biomedical Engineering' });
  const agriDept = await Department.create({ code: 'AGRI', name: 'Agricultural Engineering' });
  const chemDept = await Department.create({ code: 'CHEM', name: 'Chemical Engineering' });
  const ftDept = await Department.create({ code: 'FT', name: 'Food Technology' });

  // Seed Default Academic Sections
  const cseA = await Section.create({ name: 'CSE-A', departmentId: cseDept._id, year: 3, semester: 5, academicYear: '2026-2027' });
  const eceA = await Section.create({ name: 'ECE-A', departmentId: eceDept._id, year: 3, semester: 5, academicYear: '2026-2027' });
  const eeeA = await Section.create({ name: 'EEE-A', departmentId: eeeDept._id, year: 3, semester: 5, academicYear: '2026-2027' });
  const itA = await Section.create({ name: 'IT-A', departmentId: itDept._id, year: 3, semester: 5, academicYear: '2026-2027' });
  const aidsA = await Section.create({ name: 'AIDS-A', departmentId: aidsDept._id, year: 3, semester: 5, academicYear: '2026-2027' });

  // Seed Default Faculty Account
  const faculty1User = await User.create({
    name: 'Dr. Anand Kumar',
    email: 'faculty1@bit.edu',
    passwordHash: facultyPasswordHash,
    role: 'FACULTY',
    phone: '+91 9876543211',
    status: 'ACTIVE',
  });
  await Faculty.create({
    userId: faculty1User._id,
    employeeId: 'EMP_CSE_001',
    departmentId: cseDept._id,
    designation: 'Associate Professor',
  });

  // Seed Classrooms & IoT Devices
  const roomA204 = await Classroom.create({ building: 'Main Academic Block', roomNumber: 'A204', floor: 2, capacity: 60 });
  const roomB102 = await Classroom.create({ building: 'CS Block', roomNumber: 'B102', floor: 1, capacity: 65 });

  await IoTDevice.create({
    deviceId: 'DEV_A204_01',
    deviceName: 'Cam Unit A204 - Pi 4',
    deviceType: 'RASPBERRY_PI',
    classroomId: roomA204._id,
    ipAddress: '192.168.1.101',
    macAddress: 'B8:27:EB:11:22:33',
    apiKeyHash: deviceKeyHash,
    status: 'ONLINE',
    cameraStatus: 'OK',
    lastHeartbeat: new Date(),
  });

  // Seed Core Subjects
  await Subject.create({ code: 'CS501', name: 'Database Management Systems', departmentId: cseDept._id, semester: 5, credits: 4 });
  await Subject.create({ code: 'CS502', name: 'Data Structures & Algorithms', departmentId: cseDept._id, semester: 5, credits: 4 });

  await Notification.create({
    userId: adminUser._id,
    title: 'Clean Environment Ready',
    message: 'Institutional configuration initialized without sample data.',
    type: 'SYSTEM_ALERT',
    priority: 'LOW',
  });

  console.log('[Seed Inline] Clean institutional environment initialized successfully.');
};

export const seedDatabase = async () => {
  console.log('[Seed] Purging all database records...');
  await mongoose.connect(config.mongoUri, { dbName: config.mongoDbName });
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Section.deleteMany({}),
    Student.deleteMany({}),
    Faculty.deleteMany({}),
    Subject.deleteMany({}),
    Classroom.deleteMany({}),
    IoTDevice.deleteMany({}),
    Timetable.deleteMany({}),
    ClassAllocation.deleteMany({}),
    AttendanceSession.deleteMany({}),
    AttendanceRecord.deleteMany({}),
    BiometricProfile.deleteMany({}),
    SystemSetting.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  await seedDataInline();
  await mongoose.disconnect();
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Failed:', err);
      process.exit(1);
    });
}
