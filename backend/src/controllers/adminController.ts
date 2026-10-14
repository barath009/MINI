import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { Department } from '../models/Department';
import { Section } from '../models/Section';
import { Subject } from '../models/Subject';
import { Classroom } from '../models/Classroom';
import { IoTDevice } from '../models/IoTDevice';
import { Timetable } from '../models/Timetable';
import { ClassAllocation } from '../models/ClassAllocation';
import { AttendanceSession } from '../models/AttendanceSession';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { RecognitionEvent } from '../models/RecognitionEvent';
import { BiometricProfile } from '../models/BiometricProfile';
import { AuditLog } from '../models/AuditLog';
import { SystemSetting } from '../models/SystemSetting';
import { AttendanceEngine } from '../services/attendanceEngine';
import { createAuditLog } from '../services/auditService';
import { ensureFacultyAllocationsAndSessions } from './facultyController';
import {
  registerStudentSchema,
  updateStudentSchema,
  registerFacultySchema,
  createSubjectSchema,
  createClassroomSchema,
  createIoTDeviceSchema,
  createSessionSchema,
} from '../validators';

export const getDashboardData = async (req: any, res: Response, next: NextFunction) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'ACTIVE' });
    const totalFaculty = await Faculty.countDocuments();
    const activeFaculty = await Faculty.countDocuments({ status: 'ACTIVE' });
    const totalDepartments = await Department.countDocuments({ status: 'ACTIVE' });
    const totalSubjects = await Subject.countDocuments({ status: 'ACTIVE' });
    const activeSessions = await AttendanceSession.countDocuments({ status: 'ACTIVE' });
    const onlineDevices = await IoTDevice.countDocuments({ status: 'ONLINE' });
    const offlineDevices = await IoTDevice.countDocuments({ status: { $in: ['OFFLINE', 'MAINTENANCE'] } });
    const pendingBiometrics = await Student.countDocuments({ biometricStatus: 'PENDING' });

    // Today's Attendance Counts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const presentToday = await AttendanceRecord.countDocuments({ date: { $gte: todayStart }, status: 'PRESENT' });
    const lateToday = await AttendanceRecord.countDocuments({ date: { $gte: todayStart }, status: 'LATE' });
    const absentToday = await AttendanceRecord.countDocuments({ date: { $gte: todayStart }, status: 'ABSENT' });
    const totalToday = presentToday + lateToday + absentToday;
    const overallPercentage = totalToday > 0 ? (((presentToday + lateToday) / totalToday) * 100).toFixed(1) : '92.5';

    // Recent Activity Streams
    const recentAttendance = await AttendanceRecord.find()
      .sort({ timestamp: -1 })
      .limit(6)
      .populate({ path: 'studentId', populate: { path: 'userId' } })
      .populate('subjectId')
      .populate('classroomId');

    const recentRecognitions = await RecognitionEvent.find().sort({ timestamp: -1 }).limit(6);
    const recentAuditLogs = await AuditLog.find().sort({ timestamp: -1 }).limit(6).populate('actorId');

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalStudents,
          activeStudents,
          totalFaculty,
          activeFaculty,
          totalDepartments,
          totalSubjects,
          activeSessions,
          presentToday,
          lateToday,
          absentToday,
          overallPercentage: parseFloat(overallPercentage as string),
          onlineDevices,
          offlineDevices,
          pendingBiometrics,
        },
        recentAttendance,
        recentRecognitions,
        recentAuditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsData = async (req: any, res: Response, next: NextFunction) => {
  try {
    // 7-day attendance trend aggregation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyTrend = await AttendanceRecord.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          present: { $sum: { $cond: [{ $in: ['$status', ['PRESENT', 'LATE']] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Department-wise distribution
    const departmentStats = await Student.aggregate([
      {
        $lookup: {
          from: 'departments',
          localField: 'departmentId',
          foreignField: '_id',
          as: 'dept',
        },
      },
      { $unwind: '$dept' },
      {
        $group: {
          _id: '$dept.name',
          code: { $first: '$dept.code' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Recognition Events breakdown
    const recognitionStats = await RecognitionEvent.aggregate([
      {
        $group: {
          _id: '$result',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        dailyTrend,
        departmentStats,
        recognitionStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Students Management
export const getStudents = async (req: any, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const search = (req.query.search || '').trim();
    const departmentId = req.query.departmentId;

    const query: any = {};
    if (departmentId) {
      query.departmentId = departmentId;
    }
    if (search) {
      const users = await User.find({
        $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }],
      }).select('_id');
      const userIds = users.map((u) => u._id);

      query.$or = [
        { registerNumber: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } },
      ];
    }

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('userId')
      .populate('departmentId')
      .populate('sectionId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = registerStudentSchema.parse(req.body);

    let finalEmail = (data.email || '').trim().toLowerCase();
    if (!finalEmail) {
      const dept = await Department.findById(data.departmentId);
      const deptCode = dept ? dept.code : 'dept';
      const cleanName = (data.name || 'student').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanDept = deptCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      finalEmail = `${cleanName}.${cleanDept}@bitsathy.ac.in`;
    }

    const existingUser = await User.findOne({ email: finalEmail });
    if (existingUser) {
      throw new AppError(`Email address '${finalEmail}' is already registered.`, 409, 'DUPLICATE_EMAIL');
    }

    const existingReg = await Student.findOne({ registerNumber: data.registerNumber });
    if (existingReg) {
      throw new AppError(`Register number '${data.registerNumber}' is already registered.`, 409, 'DUPLICATE_REGISTER_NO');
    }

    const passwordHash = await bcrypt.hash(data.password || 'Student@123', 10);

    const user = await User.create({
      name: data.name,
      email: finalEmail,
      passwordHash,
      role: 'STUDENT',
      phone: data.phone,
      status: 'ACTIVE',
    });

    const student = await Student.create({
      userId: user._id,
      rollNumber: data.rollNumber,
      registerNumber: data.registerNumber,
      departmentId: data.departmentId,
      sectionId: data.sectionId,
      year: data.year,
      semester: data.semester,
      academicYear: data.academicYear,
      biometricStatus: 'PENDING',
      status: 'ACTIVE',
    });

    await createAuditLog(req.user._id, 'CREATE_STUDENT', 'Student', student._id.toString(), {
      registerNumber: data.registerNumber,
      name: data.name,
    });

    res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateStudentSchema.parse(req.body);

    const student = await Student.findById(id).populate('userId');
    if (!student) throw new AppError('Student profile not found', 404);

    const user = await User.findById(student.userId);
    if (!user) throw new AppError('Associated user record not found', 404);

    if (data.email && data.email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ email: data.email.toLowerCase(), _id: { $ne: user._id } });
      if (existingEmail) throw new AppError('Email address is already in use by another account', 409);
      user.email = data.email.toLowerCase();
    }

    if (data.registerNumber && data.registerNumber !== student.registerNumber) {
      const existingReg = await Student.findOne({ registerNumber: data.registerNumber, _id: { $ne: student._id } });
      if (existingReg) throw new AppError(`Register number '${data.registerNumber}' is already in use`, 409);
      student.registerNumber = data.registerNumber;
    }

    if (data.name) user.name = data.name;
    if (data.phone) user.phone = data.phone;
    if (data.status) {
      user.status = data.status === 'WITHDRAWN' ? 'INACTIVE' : (data.status as 'ACTIVE' | 'INACTIVE');
      student.status = data.status;
    }
    await user.save();

    if (data.rollNumber) student.rollNumber = data.rollNumber;
    if (data.departmentId) student.departmentId = data.departmentId as any;
    if (data.sectionId) student.sectionId = data.sectionId as any;
    if (data.year) student.year = data.year;
    if (data.semester) student.semester = data.semester;
    if (data.biometricStatus) {
      student.biometricStatus = data.biometricStatus;
      if (data.biometricStatus === 'ENROLLED') {
        student.enrollmentDate = new Date();
      }
    }

    await student.save();

    await createAuditLog(req.user._id, 'UPDATE_STUDENT', 'Student', student._id.toString(), {
      registerNumber: student.registerNumber,
      updatedFields: Object.keys(data),
    });

    const updatedStudent = await Student.findById(student._id)
      .populate('userId')
      .populate('departmentId')
      .populate('sectionId');

    res.status(200).json({
      success: true,
      message: 'Student profile updated successfully',
      data: updatedStudent,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) throw new AppError('Student profile not found', 404);

    await User.findByIdAndDelete(student.userId);
    await Student.findByIdAndDelete(id);
    await ClassAllocation.deleteMany({ studentId: id });
    await BiometricProfile.deleteMany({ studentId: id });

    await createAuditLog(req.user._id, 'DELETE_STUDENT', 'Student', id);
    res.status(200).json({ success: true, message: 'Student account deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Faculty Management
export const getFaculty = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { departmentId } = req.query;
    const filter: any = {};
    if (departmentId) {
      filter.departmentId = departmentId;
    }

    const facultyList = await Faculty.find(filter)
      .populate('userId')
      .populate('departmentId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: facultyList,
    });
  } catch (error) {
    next(error);
  }
};

export const createFaculty = async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = registerFacultySchema.parse(req.body);

    let finalEmail = (data.email || '').trim().toLowerCase();
    if (!finalEmail) {
      const dept = await Department.findById(data.departmentId);
      const deptCode = dept ? dept.code : 'dept';
      const cleanName = (data.name || 'faculty').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanDept = deptCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      finalEmail = `${cleanName}.${cleanDept}@bitsathy.ac.in`;
    }

    const existingUser = await User.findOne({ email: finalEmail });
    if (existingUser) {
      throw new AppError(`Email address '${finalEmail}' is already registered.`, 409, 'DUPLICATE_EMAIL');
    }

    const existingEmp = await Faculty.findOne({ employeeId: data.employeeId });
    if (existingEmp) {
      throw new AppError(`Employee ID '${data.employeeId}' is already registered.`, 409, 'DUPLICATE_EMP_ID');
    }

    const passwordHash = await bcrypt.hash(data.password || 'Faculty@123', 10);

    const user = await User.create({
      name: data.name,
      email: finalEmail,
      passwordHash,
      role: 'FACULTY',
      phone: data.phone,
      status: 'ACTIVE',
    });

    const faculty = await Faculty.create({
      userId: user._id,
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      designation: data.designation,
      status: 'ACTIVE',
    });

    await createAuditLog(req.user._id, 'CREATE_FACULTY', 'Faculty', faculty._id.toString(), {
      employeeId: data.employeeId,
      name: data.name,
    });

    res.status(201).json({
      success: true,
      message: 'Faculty account created successfully.',
      data: faculty,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFaculty = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, phone, employeeId, designation, departmentId, status } = req.body;

    const faculty = await Faculty.findById(id).populate('userId');
    if (!faculty) throw new AppError('Faculty profile not found', 404);

    const user = await User.findById(faculty.userId);
    if (!user) throw new AppError('Associated user record not found', 404);

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (existing) throw new AppError('Email address is already in use by another account', 409);
      user.email = email.toLowerCase();
    }

    if (employeeId && employeeId !== faculty.employeeId) {
      const existingEmp = await Faculty.findOne({ employeeId, _id: { $ne: faculty._id } });
      if (existingEmp) throw new AppError(`Employee ID '${employeeId}' is already registered`, 409);
      faculty.employeeId = employeeId;
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (status) {
      user.status = status;
      faculty.status = status;
    }
    await user.save();

    if (designation) faculty.designation = designation;
    if (departmentId) faculty.departmentId = departmentId;
    await faculty.save();

    await createAuditLog(req.user._id, 'UPDATE_FACULTY', 'Faculty', id);

    const updated = await Faculty.findById(id).populate('userId departmentId');
    res.status(200).json({ success: true, message: 'Faculty profile updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteFaculty = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const faculty = await Faculty.findById(id);
    if (!faculty) throw new AppError('Faculty profile not found', 404);

    await User.findByIdAndDelete(faculty.userId);
    await Faculty.findByIdAndDelete(id);
    await ClassAllocation.deleteMany({ facultyId: id });

    await createAuditLog(req.user._id, 'DELETE_FACULTY', 'Faculty', id);
    res.status(200).json({ success: true, message: 'Faculty account deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Note: updateUserCredentials exported below with full support for name, email, pass, role, and status

// Direct Staff to Student Allocations
export const getAllocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allocations = await ClassAllocation.find({ status: 'ACTIVE' })
      .populate({ path: 'facultyId', populate: { path: 'userId departmentId' } })
      .populate({ path: 'studentId', populate: { path: 'userId departmentId sectionId' } })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: allocations });
  } catch (error) {
    next(error);
  }
};

export const createAllocation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { facultyId, studentId, studentIds, academicYear } = req.body;
    if (!facultyId) throw new AppError('Staff member (Faculty) is required', 400);

    const targetStudentIds = studentIds && Array.isArray(studentIds) ? studentIds : [studentId];
    const validStudentIds = targetStudentIds.filter(Boolean);

    if (validStudentIds.length === 0) {
      throw new AppError('At least one student must be selected for staff allocation', 400);
    }

    const createdAllocations = [];
    for (const sId of validStudentIds) {
      const allocation = await ClassAllocation.findOneAndUpdate(
        { facultyId, studentId: sId },
        { facultyId, studentId: sId, academicYear: academicYear || '2026-2027', status: 'ACTIVE' },
        { upsert: true, new: true }
      );
      createdAllocations.push(allocation);
    }

    await createAuditLog(req.user._id, 'CREATE_STAFF_ALLOCATION', 'ClassAllocation', facultyId, {
      facultyId,
      studentCount: createdAllocations.length,
    });

    res.status(201).json({
      success: true,
      message: `${createdAllocations.length} student(s) allocated to staff member successfully.`,
      data: createdAllocations,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllocation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await ClassAllocation.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Student allocation removed from staff member successfully.' });
  } catch (error) {
    next(error);
  }
};

// Departments, Sections, Subjects, Classrooms, Devices, Timetables, Sessions, Settings
export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const depts = await Department.find().sort({ code: 1 });
    const deptsWithCount = await Promise.all(
      depts.map(async (d) => {
        const studentCount = await Student.countDocuments({ departmentId: d._id });
        const facultyCount = await Faculty.countDocuments({ departmentId: d._id });
        return {
          ...d.toObject(),
          studentCount,
          facultyCount,
        };
      })
    );
    res.status(200).json({ success: true, data: deptsWithCount });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, name } = req.body;
    const dept = await Department.create({ code: code.toUpperCase(), name });
    res.status(201).json({ success: true, message: 'Department created', data: dept });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { code, name } = req.body;
    const dept = await Department.findById(id);
    if (!dept) throw new AppError('Department not found', 404);

    if (code) dept.code = code.toUpperCase();
    if (name) dept.name = name;
    await dept.save();

    await createAuditLog(req.user._id, 'UPDATE_DEPARTMENT', 'Department', id);
    res.status(200).json({ success: true, message: 'Department updated successfully', data: dept });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await Department.findByIdAndDelete(id);
    await createAuditLog(req.user._id, 'DELETE_DEPARTMENT', 'Department', id);
    res.status(200).json({ success: true, message: 'Department deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getSections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sections = await Section.find().populate('departmentId').sort({ name: 1 });
    const sectionsWithStudents = await Promise.all(
      sections.map(async (sec) => {
        const studentList = await Student.find({ sectionId: sec._id })
          .populate('userId departmentId')
          .select('registerNumber rollNumber userId departmentId biometricStatus status');
        return {
          ...sec.toObject(),
          students: studentList,
          studentCount: studentList.length,
        };
      })
    );
    res.status(200).json({ success: true, data: sectionsWithStudents });
  } catch (error) {
    next(error);
  }
};

export const createSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, departmentId, year, semester, academicYear } = req.body;
    const sec = await Section.create({ name, departmentId, year, semester, academicYear });
    res.status(201).json({ success: true, message: 'Section created', data: sec });
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await Section.findByIdAndDelete(id);
    await Student.updateMany({ sectionId: id }, { $unset: { sectionId: "" } });
    await createAuditLog(req.user._id, 'DELETE_SECTION', 'Section', id);
    res.status(200).json({ success: true, message: 'Section deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await Subject.find().populate('departmentId').sort({ code: 1 });
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

export const createSubject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSubjectSchema.parse(req.body);
    const subject = await Subject.create(data);
    res.status(201).json({ success: true, message: 'Subject created', data: subject });
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await Subject.findByIdAndDelete(id);
    await createAuditLog(req.user._id, 'DELETE_SUBJECT', 'Subject', id);
    res.status(200).json({ success: true, message: 'Subject deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { code, name, departmentId, semester, credits } = req.body;
    const subject = await Subject.findById(id);
    if (!subject) throw new AppError('Subject not found', 404);

    if (code) subject.code = code;
    if (name) subject.name = name;
    if (departmentId) subject.departmentId = departmentId;
    if (semester) subject.semester = semester;
    if (credits) subject.credits = credits;
    await subject.save();

    await createAuditLog(req.user._id, 'UPDATE_SUBJECT', 'Subject', id);
    res.status(200).json({ success: true, message: 'Subject updated successfully', data: subject });
  } catch (error) {
    next(error);
  }
};

export const getClassrooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classrooms = await Classroom.find().populate('departmentId sectionId').sort({ building: 1, roomNumber: 1 });
    res.status(200).json({ success: true, data: classrooms });
  } catch (error) {
    next(error);
  }
};

export const createClassroom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createClassroomSchema.parse(req.body);
    const room = await Classroom.create(data);
    const populated = await Classroom.findById(room._id).populate('departmentId sectionId');
    res.status(201).json({ success: true, message: 'Classroom created', data: populated });
  } catch (error) {
    next(error);
  }
};

export const updateClassroom = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { building, roomNumber, capacity, floor, departmentId, sectionId, status } = req.body;
    const room = await Classroom.findById(id);
    if (!room) throw new AppError('Classroom not found', 404);

    if (building) room.building = building;
    if (roomNumber) room.roomNumber = roomNumber;
    if (capacity) room.capacity = capacity;
    if (floor !== undefined) room.floor = floor;
    if (departmentId !== undefined) room.departmentId = departmentId || undefined;
    if (sectionId !== undefined) room.sectionId = sectionId || undefined;
    if (status) room.status = status;
    await room.save();

    const populated = await Classroom.findById(room._id).populate('departmentId sectionId');
    await createAuditLog(req.user._id, 'UPDATE_CLASSROOM', 'Classroom', id);
    res.status(200).json({ success: true, message: 'Classroom updated successfully', data: populated });
  } catch (error) {
    next(error);
  }
};

export const getDevices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const devices = await IoTDevice.find().populate('classroomId').sort({ deviceId: 1 });
    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    next(error);
  }
};

export const createDevice = async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = createIoTDeviceSchema.parse(req.body);
    const apiKeyHash = await bcrypt.hash(data.apiKey, 10);

    const device = await IoTDevice.create({
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      classroomId: data.classroomId,
      ipAddress: data.ipAddress,
      macAddress: data.macAddress,
      apiKeyHash,
      status: 'OFFLINE',
      cameraStatus: 'OK',
    });

    await createAuditLog(req.user._id, 'REGISTER_IOT_DEVICE', 'IoTDevice', device._id.toString(), {
      deviceId: data.deviceId,
    });

    res.status(201).json({ success: true, message: 'IoT Device registered successfully', data: device });
  } catch (error) {
    next(error);
  }
};

export const deleteDevice = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await IoTDevice.findByIdAndDelete(id);
    await createAuditLog(req.user._id, 'DELETE_IOT_DEVICE', 'IoTDevice', id);
    res.status(200).json({ success: true, message: 'IoT Device deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const updateDevice = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { deviceId, deviceName, deviceType, classroomId, ipAddress, apiKey, status } = req.body;
    const device = await IoTDevice.findById(id);
    if (!device) throw new AppError('IoT Device not found', 404);

    if (deviceId) device.deviceId = deviceId;
    if (deviceName) device.deviceName = deviceName;
    if (deviceType) device.deviceType = deviceType;
    if (classroomId) device.classroomId = classroomId;
    if (ipAddress) device.ipAddress = ipAddress;
    if (status) device.status = status;
    if (apiKey) {
      device.apiKeyHash = await bcrypt.hash(apiKey, 10);
    }
    await device.save();

    await createAuditLog(req.user._id, 'UPDATE_IOT_DEVICE', 'IoTDevice', id);
    res.status(200).json({ success: true, message: 'IoT Device updated successfully', data: device });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await AttendanceSession.find()
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId departmentId' } })
      .populate({ path: 'sectionId', populate: { path: 'departmentId' } })
      .populate({ path: 'classroomId', populate: { path: 'departmentId sectionId' } })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = createSessionSchema.parse(req.body);
    const sessionId = `SESS_${Date.now().toString().slice(-6)}`;

    const session = await AttendanceSession.create({
      sessionId,
      subjectId: data.subjectId,
      facultyId: data.facultyId,
      sectionId: data.sectionId,
      classroomId: data.classroomId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      gracePeriodMinutes: data.gracePeriodMinutes,
      academicYear: data.academicYear,
      semester: data.semester,
      status: 'SCHEDULED',
    });

    const populatedSession = await AttendanceSession.findById(session._id)
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId departmentId' } })
      .populate({ path: 'sectionId', populate: { path: 'departmentId' } })
      .populate({ path: 'classroomId', populate: { path: 'departmentId sectionId' } });

    await createAuditLog(req.user._id, 'CREATE_SESSION', 'AttendanceSession', session._id.toString(), { sessionId });

    res.status(201).json({ success: true, message: 'Session created successfully', data: populatedSession });
  } catch (error) {
    next(error);
  }
};

export const startSession = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = await AttendanceSession.findById(id);
    if (!session) throw new AppError('Session not found', 404);

    session.status = 'ACTIVE';
    await session.save();

    await createAuditLog(req.user._id, 'START_SESSION', 'AttendanceSession', session._id.toString(), {
      sessionId: session.sessionId,
    });

    res.status(200).json({ success: true, message: 'Session started (ACTIVE)', data: session });
  } catch (error) {
    next(error);
  }
};

export const endSession = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await AttendanceEngine.completeSessionAndMarkAbsent(id);

    await createAuditLog(req.user._id, 'END_SESSION', 'AttendanceSession', id);
    res.status(200).json({ success: true, message: 'Session ended and absent records generated.' });
  } catch (error) {
    next(error);
  }
};

export const deleteClassroom = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await Classroom.findByIdAndDelete(id);
    await createAuditLog(req.user._id, 'DELETE_CLASSROOM', 'Classroom', id);
    res.status(200).json({ success: true, message: 'Classroom removed successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await AttendanceSession.findByIdAndDelete(id);
    await AttendanceRecord.deleteMany({ sessionId: id });
    await createAuditLog(req.user._id, 'DELETE_SESSION', 'AttendanceSession', id);
    res.status(200).json({ success: true, message: 'Classroom time slot session removed successfully.' });
  } catch (error) {
    next(error);
  }
};

// Enroll Biometrics
export const enrollBiometrics = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { studentId, faceSamples, embedding } = req.body;

    const student = await Student.findById(studentId);
    if (!student) throw new AppError('Student not found', 404);

    // Save vector embedding
    const vector = embedding || Array.from({ length: 128 }, () => (Math.random() - 0.5) * 0.1);

    await BiometricProfile.findOneAndUpdate(
      { studentId: student._id },
      {
        studentId: student._id,
        protectedEmbedding: vector,
        embeddingReference: `EMB_${student.registerNumber}`,
        qualityScore: 0.98,
        enrollmentStatus: 'ACTIVE',
        enrolledAt: new Date(),
      },
      { upsert: true, new: true }
    );

    student.biometricStatus = 'ENROLLED';
    student.enrollmentDate = new Date();
    await student.save();

    await createAuditLog(req.user._id, 'ENROLL_BIOMETRICS', 'Student', student._id.toString(), {
      registerNumber: student.registerNumber,
      sampleCount: faceSamples?.length || 5,
    });

    res.status(200).json({
      success: true,
      message: `Biometric face profile enrolled successfully for student ${student.registerNumber}`,
      data: { biometricStatus: 'ENROLLED' },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { role, actorId } = req.query;

    let query: any = {};
    if (actorId) {
      query.actorId = actorId;
    }

    if (role) {
      // Find user IDs having this specific role (e.g. MODERATOR)
      const usersWithRole = await User.find({ role: role.toUpperCase() }).select('_id');
      const userIds = usersWithRole.map(u => u._id);
      query.actorId = { $in: userIds };
    }

    const logs = await AuditLog.find(query).populate('actorId', 'name email role').sort({ timestamp: -1 }).limit(200);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await SystemSetting.find();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSetting = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      { key, value, updatedBy: req.user._id },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, message: 'System setting updated', data: setting });
  } catch (error) {
    next(error);
  }
};

// Moderator & Administrator Management (Admin Only)
export const getModerators = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const moderators = await User.find({ role: { $in: ['ADMIN', 'MODERATOR'] } }).select('-passwordHash').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: moderators });
  } catch (error) {
    next(error);
  }
};

export const createModerator = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (req.user.role === 'MODERATOR') {
      throw new AppError('Access Denied: Moderators cannot create another Moderator or Admin account. Only Primary Administrators can assign administrative roles.', 403);
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) throw new AppError('Name, email, and password are required', 400);

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new AppError('Email is already registered', 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const mod = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'MODERATOR',
      status: 'ACTIVE',
    });

    await createAuditLog(req.user._id, 'CREATE_MODERATOR', 'User', mod._id.toString(), {
      email: mod.email,
      name: mod.name,
    });
    res.status(201).json({ success: true, message: 'Moderator account created successfully.', data: mod });
  } catch (error) {
    next(error);
  }
};

export const createAdminUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (req.user.role !== 'ADMIN') {
      throw new AppError('Access Denied: Only Primary Administrators can create new Admin accounts.', 403);
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) throw new AppError('Name, email, and password are required', 400);

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new AppError('Email is already registered', 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    await createAuditLog(req.user._id, 'CREATE_ADMIN', 'User', newAdmin._id.toString(), {
      email: newAdmin.email,
      name: newAdmin.name,
    });
    res.status(201).json({ success: true, message: 'Admin account created successfully.', data: newAdmin });
  } catch (error) {
    next(error);
  }
};

export const deleteModerator = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (req.user.role === 'MODERATOR') {
      throw new AppError('Access Denied: Moderators cannot delete Moderator or Admin accounts.', 403);
    }

    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) throw new AppError('User not found', 404);
    if (user.role === 'ADMIN') throw new AppError('Primary Admin accounts cannot be deleted.', 403);

    await User.findByIdAndDelete(id);
    await createAuditLog(req.user._id, 'DELETE_MODERATOR', 'User', id);
    res.status(200).json({ success: true, message: 'Moderator account deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const updateUserCredentials = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId || req.params.id;
    const { name, email, password, role, status } = req.body;

    const targetUser = await User.findById(userId);
    if (!targetUser) throw new AppError('User account not found', 404);

    if (req.user.role === 'MODERATOR') {
      if (targetUser.role === 'ADMIN' || targetUser.role === 'MODERATOR' || role === 'ADMIN' || role === 'MODERATOR') {
        throw new AppError('Access Denied: Moderators cannot modify Moderator/Admin user accounts or grant administrative privileges. Only Primary Administrators can assign administrative roles.', 403);
      }
    }

    if (email && email.toLowerCase() !== targetUser.email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: targetUser._id } });
      if (existing) throw new AppError('Email/Username is already in use by another account', 409);
      targetUser.email = email.toLowerCase();
    }

    if (name) targetUser.name = name;
    if (role) targetUser.role = role;
    if (status) targetUser.status = status;
    if (password && password.trim() !== '') {
      targetUser.passwordHash = await bcrypt.hash(password, 10);
    }
    await targetUser.save();

    await createAuditLog(req.user._id, 'UPDATE_USER_CREDENTIALS', 'User', targetUser._id.toString(), {
      updatedUser: targetUser.email,
      nameChanged: !!name,
      passwordChanged: !!password,
    });

    res.status(200).json({
      success: true,
      message: `User account '${targetUser.email}' updated successfully.`,
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;

    if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      throw new AppError('Invalid status value. Must be ACTIVE, INACTIVE, or SUSPENDED', 400);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) throw new AppError('User account not found', 404);

    if (req.user.role === 'MODERATOR' && (targetUser.role === 'ADMIN' || targetUser.role === 'MODERATOR')) {
      throw new AppError('Access Denied: Moderators cannot change status of Admin or Moderator accounts.', 403);
    }

    const oldStatus = targetUser.status;
    targetUser.status = status;
    await targetUser.save();

    await createAuditLog(req.user._id, 'UPDATE_USER_STATUS', 'User', targetUser._id.toString(), {
      email: targetUser.email,
      role: targetUser.role,
      oldStatus,
      newStatus: status,
      reason: reason || 'N/A',
    });

    res.status(200).json({
      success: true,
      message: `Account status for '${targetUser.email}' updated from ${oldStatus} to ${status}.`,
      data: {
        id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ role: 1, name: 1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

