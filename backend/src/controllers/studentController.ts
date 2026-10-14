import { Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { Student } from '../models/Student';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { ClassAllocation } from '../models/ClassAllocation';
import { AttendanceSession } from '../models/AttendanceSession';
import { Notification } from '../models/Notification';
import { AttendanceDispute } from '../models/AttendanceDispute';
import { createDisputeSchema } from '../validators';
import { createAuditLog } from '../services/auditService';

export const getStudentDashboard = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate('departmentId')
      .populate('sectionId');

    if (!student) throw new AppError('Student profile not found', 404);

    const totalRecords = await AttendanceRecord.countDocuments({ studentId: student._id });
    const presentCount = await AttendanceRecord.countDocuments({ studentId: student._id, status: 'PRESENT' });
    const lateCount = await AttendanceRecord.countDocuments({ studentId: student._id, status: 'LATE' });
    const absentCount = await AttendanceRecord.countDocuments({ studentId: student._id, status: 'ABSENT' });

    const totalAttended = presentCount + lateCount;
    const overallPercentage = totalRecords > 0 ? ((totalAttended / totalRecords) * 100).toFixed(1) : '100.0';

    // Subject breakdown
    const allocations = await ClassAllocation.find({ studentId: student._id, status: 'ACTIVE' })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId' } });

    const subjectBreakdown = (
      await Promise.all(
        allocations.map(async (alloc) => {
          if (!alloc.subjectId) return null;
          const subId = (alloc.subjectId as any)._id;
          const sTotal = await AttendanceRecord.countDocuments({ studentId: student._id, subjectId: subId });
          const sPresent = await AttendanceRecord.countDocuments({
            studentId: student._id,
            subjectId: subId,
            status: { $in: ['PRESENT', 'LATE'] },
          });
          const pct = sTotal > 0 ? ((sPresent / sTotal) * 100).toFixed(1) : '100.0';
          return {
            subjectId: subId,
            subjectCode: (alloc.subjectId as any).code,
            subjectName: (alloc.subjectId as any).name,
            facultyName: (alloc.facultyId as any)?.userId?.name || 'Staff Member',
            totalClasses: sTotal,
            attendedClasses: sPresent,
            percentage: parseFloat(pct),
            status: parseFloat(pct) >= 75 ? 'SAFE' : parseFloat(pct) >= 65 ? 'WARNING' : 'CRITICAL',
          };
        })
      )
    ).filter(Boolean);

    // Today's attendance & current active class
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentRecords = await AttendanceRecord.find({ studentId: student._id })
      .sort({ timestamp: -1 })
      .limit(5)
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId' } })
      .populate('classroomId');

    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: req.user.name,
          registerNumber: student.registerNumber,
          rollNumber: student.rollNumber,
          department: (student.departmentId as any).name,
          section: (student.sectionId as any).name,
          year: student.year,
          semester: student.semester,
          biometricStatus: student.biometricStatus,
        },
        summary: {
          overallPercentage: parseFloat(overallPercentage as string),
          totalClasses: totalRecords,
          presentCount,
          lateCount,
          absentCount,
          statusBadge: parseFloat(overallPercentage as string) >= 75 ? 'SAFE' : 'WARNING',
        },
        subjectBreakdown,
        recentRecords,
        notifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) throw new AppError('Student profile not found', 404);

    const { subjectId, status, month } = req.query;
    const query: any = { studentId: student._id };

    if (subjectId) query.subjectId = subjectId;
    if (status) query.status = status;

    const records = await AttendanceRecord.find(query)
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId' } })
      .populate('classroomId')
      .populate('sessionId')
      .sort({ timestamp: -1 });

    // Format explicit "WHERE and WHEN" requirement payload
    const formattedRecords = records.map((r: any) => {
      const dateStr = new Date(r.date).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = new Date(r.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const classroomName = r.classroomId
        ? `${r.classroomId.building} - ${r.classroomId.roomNumber}`
        : 'Campus Classroom A204';
      const facultyName = r.facultyId?.userId?.name || 'Assigned Faculty';
      const subjectName = r.subjectId?.name || 'Subject';

      return {
        id: r._id,
        subjectName,
        subjectCode: r.subjectId?.code,
        facultyName,
        classroom: classroomName,
        date: dateStr,
        time: timeStr,
        status: r.status,
        recognitionMethod: r.recognitionMethod,
        confidenceScore: r.confidenceScore,
        overrideReason: r.overrideReason,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedRecords,
    });
  } catch (error) {
    next(error);
  }
};

export const createDispute = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) throw new AppError('Student profile not found', 404);

    const { attendanceId, reason, evidenceReference } = createDisputeSchema.parse(req.body);

    const record = await AttendanceRecord.findById(attendanceId);
    if (!record) throw new AppError('Attendance record not found', 404);

    const dispute = await AttendanceDispute.create({
      studentId: student._id,
      attendanceId: record._id,
      reason,
      evidenceReference,
      status: 'PENDING',
      submittedAt: new Date(),
    });

    await createAuditLog(req.user._id, 'CREATE_DISPUTE', 'AttendanceDispute', dispute._id.toString(), {
      attendanceId,
      reason,
    });

    res.status(201).json({
      success: true,
      message: 'Attendance dispute submitted for faculty/admin review.',
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentDisputes = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) throw new AppError('Student profile not found', 404);

    const disputes = await AttendanceDispute.find({ studentId: student._id })
      .populate({
        path: 'attendanceId',
        populate: [{ path: 'subjectId' }, { path: 'classroomId' }],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: disputes });
  } catch (error) {
    next(error);
  }
};
