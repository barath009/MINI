import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { Faculty } from '../models/Faculty';
import { Student } from '../models/Student';
import { ClassAllocation } from '../models/ClassAllocation';
import { AttendanceSession } from '../models/AttendanceSession';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { AttendanceDispute } from '../models/AttendanceDispute';
import { IoTDevice } from '../models/IoTDevice';
import { Classroom } from '../models/Classroom';
import { Subject } from '../models/Subject';
import { Section } from '../models/Section';
import { manualOverrideSchema, reviewDisputeSchema } from '../validators';
import { createAuditLog } from '../services/auditService';
import { createNotification } from '../services/notificationService';
import { emitAttendanceEvent } from '../services/socketService';

export const ensureFacultyAllocationsAndSessions = async (facultyId: any, departmentId?: any) => {
  try {
    // Ensure AttendanceSession for today if faculty has none
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySessions = await AttendanceSession.find({
      facultyId,
      date: { $gte: todayStart },
    });

    if (todaySessions.length === 0) {
      const classroom = await Classroom.findOne();
      const subject = await Subject.findOne();
      const section = await Section.findOne();

      if (classroom) {
        await AttendanceSession.create({
          sessionId: `SESS_${Date.now().toString().slice(-6)}_${Math.floor(Math.random() * 100)}`,
          facultyId,
          subjectId: subject?._id,
          sectionId: section?._id,
          classroomId: classroom._id,
          date: new Date(),
          startTime: '09:00',
          endTime: '17:00',
          status: 'ACTIVE',
          academicYear: '2026-2027',
        });
      }
    }
  } catch (err) {
    console.error('Error ensuring faculty sessions:', err);
  }
};

export const getFacultyDashboard = async (req: any, res: Response, next: NextFunction) => {
  try {
    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) throw new AppError('Faculty profile not found', 404);

    // Auto-ensure allocations and active sessions exist for this faculty profile
    await ensureFacultyAllocationsAndSessions(faculty._id, faculty.departmentId);

    // Allocated students count
    const allocations = await ClassAllocation.find({ facultyId: faculty._id, status: 'ACTIVE' });
    const allocatedStudentIds = [...new Set(allocations.map((a) => a.studentId.toString()))];

    // Today's active session
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySessions = await AttendanceSession.find({
      facultyId: faculty._id,
      date: { $gte: today },
    })
      .populate('subjectId')
      .populate('sectionId')
      .populate('classroomId');

    const activeSession = todaySessions.find((s) => s.status === 'ACTIVE') || todaySessions[0] || null;

    let presentToday = 0;
    let lateToday = 0;
    let absentToday = 0;
    let liveArrivals: any[] = [];
    let deviceStatus = 'ONLINE';

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (allocatedStudentIds.length > 0) {
      presentToday = await AttendanceRecord.countDocuments({
        studentId: { $in: allocatedStudentIds },
        date: { $gte: todayStart },
        status: 'PRESENT',
      });
      lateToday = await AttendanceRecord.countDocuments({
        studentId: { $in: allocatedStudentIds },
        date: { $gte: todayStart },
        status: 'LATE',
      });
      absentToday = allocatedStudentIds.length - (presentToday + lateToday);

      liveArrivals = await AttendanceRecord.find({
        studentId: { $in: allocatedStudentIds },
        date: { $gte: todayStart },
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate({ path: 'studentId', populate: { path: 'userId' } });
    }

    if (activeSession) {
      const device = await IoTDevice.findOne({ classroomId: activeSession.classroomId._id });
      if (device) deviceStatus = device.status;
    }

    res.status(200).json({
      success: true,
      data: {
        faculty: {
          id: faculty._id,
          employeeId: faculty.employeeId,
          designation: faculty.designation,
          name: req.user.name,
        },
        summary: {
          assignedStudentCount: allocatedStudentIds.length,
          todayClassesCount: todaySessions.length,
          activeClass: activeSession,
          presentToday,
          lateToday,
          absentToday,
          deviceStatus,
        },
        todaySessions,
        liveArrivals,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyStudents = async (req: any, res: Response, next: NextFunction) => {
  try {
    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) throw new AppError('Faculty profile not found', 404);

    // Auto-ensure allocations exist for this faculty
    await ensureFacultyAllocationsAndSessions(faculty._id, faculty.departmentId);

    // Query allocations specifically for THIS faculty (IDOR protection)
    const allocations = await ClassAllocation.find({ facultyId: faculty._id, status: 'ACTIVE' })
      .populate({ path: 'studentId', populate: [{ path: 'userId' }, { path: 'departmentId' }, { path: 'sectionId' }] })
      .populate('subjectId')
      .populate('sectionId');

    const allocatedStudentIds = allocations.map((a: any) => a.studentId?._id?.toString()).filter(Boolean);

    // ── Today's attendance status for each allocated student ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch today's attendance records for allocated students
    let todayRecordsMap: Map<string, any> = new Map();
    if (allocatedStudentIds.length > 0) {
      const todayRecords = await AttendanceRecord.find({
        studentId: { $in: allocatedStudentIds },
        date: { $gte: todayStart, $lte: todayEnd },
      });
      for (const r of todayRecords) {
        todayRecordsMap.set(r.studentId.toString(), r);
      }
    }

    // Attach attendance info to each allocation
    const enrichedAllocations = allocations.map((alloc: any) => {
      const st = alloc.studentId;
      const stId = st?._id?.toString();
      const todayRecord = stId ? todayRecordsMap.get(stId) : null;
      return {
        ...alloc.toObject(),
        todayAttendance: todayRecord
          ? {
              status: todayRecord.status,
              timestamp: todayRecord.timestamp,
              recognitionMethod: todayRecord.recognitionMethod,
              confidenceScore: todayRecord.confidenceScore,
            }
          : { status: 'ABSENT', timestamp: null },
      };
    });

    res.status(200).json({
      success: true,
      data: enrichedAllocations,
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionAttendance = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const session = await AttendanceSession.findById(sessionId)
      .populate('subjectId')
      .populate('sectionId')
      .populate('classroomId')
      .populate('facultyId');

    if (!session) throw new AppError('Session not found', 404);

    // ── Get actual attendance records for this session ──
    const existingRecords = await AttendanceRecord.find({ sessionId: session._id })
      .populate({ path: 'studentId', populate: [{ path: 'userId' }, { path: 'departmentId' }] })
      .sort({ timestamp: -1 });

    // Build a map of studentId → record
    const recordMap = new Map<string, any>();
    for (const r of existingRecords) {
      const sid = (r.studentId as any)?._id?.toString();
      if (sid) recordMap.set(sid, r);
    }

    // ── Get students allocated to this faculty (no sectionId filter — avoids empty roster) ──
    const targetFacultyId = session.facultyId?._id || session.facultyId;
    const allocations = await ClassAllocation.find({
      facultyId: targetFacultyId,
      status: 'ACTIVE',
    }).populate({ path: 'studentId', populate: [{ path: 'userId' }, { path: 'departmentId' }] });

    const allocatedStudents = allocations.map((a: any) => a.studentId).filter(Boolean);

    // Build student map from allocations, then merge any already-scanned students
    const studentMap = new Map<string, any>();
    for (const st of allocatedStudents) {
      if (st && st._id) studentMap.set(st._id.toString(), st);
    }
    // Ensure every student who has an attendance record always appears (even if allocation was late-added)
    for (const r of existingRecords) {
      const st = r.studentId as any;
      if (st && st._id && !studentMap.has(st._id.toString())) {
        studentMap.set(st._id.toString(), st);
      }
    }

    const fullRoster = Array.from(studentMap.values()).map((st: any) => {
      const sid = st._id?.toString();
      const existingRecord = sid ? recordMap.get(sid) : null;
      if (existingRecord) return existingRecord;
      return {
        _id: `virtual_${sid}`,
        studentId: st,
        sessionId: session._id,
        status: 'ABSENT',
        timestamp: null,
        recognitionMethod: null,
        confidenceScore: null,
        markedBy: null,
        isVirtual: true,
      };
    });

    // Sort: PRESENT/LATE first (by time desc), then ABSENT
    fullRoster.sort((a: any, b: any) => {
      const order: Record<string, number> = { PRESENT: 0, LATE: 1, ABSENT: 2 };
      const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
      if (diff !== 0) return diff;
      if (a.timestamp && b.timestamp) return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return 0;
    });

    res.status(200).json({
      success: true,
      data: {
        session,
        records: fullRoster,
        summary: {
          total: fullRoster.length,
          present: fullRoster.filter((r: any) => r.status === 'PRESENT').length,
          late: fullRoster.filter((r: any) => r.status === 'LATE').length,
          absent: fullRoster.filter((r: any) => r.status === 'ABSENT').length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const manualAttendanceOverride = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // AttendanceRecord ID or Student ID + Session ID
    const { status, reason, remark } = manualOverrideSchema.parse(req.body);

    // When id === 'new' (virtual/absent student with no DB record yet), skip findById entirely
    // to avoid MongoDB ObjectId cast error — resolve directly via studentId + sessionId from body
    let record: any = id !== 'new' ? await AttendanceRecord.findById(id).catch(() => null) : null;

    if (!record) {
      // Resolve via studentId + sessionId sent in request body
      const { studentId, sessionId } = req.body;
      if (studentId && sessionId) {
        const session = await AttendanceSession.findById(sessionId);
        if (session) {
          record = await AttendanceRecord.findOne({ studentId, sessionId: session._id });
          if (!record) {
            record = new AttendanceRecord({
              studentId,
              sessionId: session._id,
              subjectId: session.subjectId,
              facultyId: session.facultyId,
              sectionId: session.sectionId,
              classroomId: session.classroomId,
              date: session.date,
              timestamp: new Date(),
              status,
              markedBy: 'FACULTY',
              recognitionMethod: 'MANUAL_OVERRIDE',
            });
          }
        }
      }
    }

    if (!record) throw new AppError('Attendance record not found for manual override', 404);

    const prevStatus = record.status;
    record.status = status;
    record.markedBy = 'FACULTY';
    record.recognitionMethod = 'MANUAL_OVERRIDE';
    record.overrideReason = reason;
    record.overrideRemark = remark;
    await record.save();

    // Create Mandatory Audit Log
    await createAuditLog(
      req.user._id,
      'MANUAL_ATTENDANCE_OVERRIDE',
      'AttendanceRecord',
      record._id.toString(),
      {
        previousStatus: prevStatus,
        newStatus: status,
        reason,
        remark,
      },
      req.ip
    );

    // Notify Student
    const student = await record.populate({ path: 'studentId', populate: { path: 'userId' } });
    const userDoc = (student.studentId as any)?.userId;
    if (userDoc) {
      await createNotification(
        userDoc._id,
        'Attendance Record Corrected',
        `Your attendance status was manually corrected from ${prevStatus} to ${status} by faculty. Reason: ${reason}`,
        'ATTENDANCE_MARKED',
        'MEDIUM'
      );
    }

    emitAttendanceEvent('attendance.updated', {
      attendanceId: record._id,
      sessionId: record.sessionId.toString(),
      status,
      reason,
      overrideBy: req.user.name,
    });

    res.status(200).json({
      success: true,
      message: `Attendance status updated from ${prevStatus} to ${status}`,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const getFacultyDisputes = async (req: any, res: Response, next: NextFunction) => {
  try {
    const disputes = await AttendanceDispute.find()
      .populate({
        path: 'attendanceId',
        populate: [{ path: 'subjectId' }, { path: 'sessionId' }],
      })
      .populate({ path: 'studentId', populate: { path: 'userId' } })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: disputes });
  } catch (error) {
    next(error);
  }
};

export const reviewDispute = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reviewRemark } = reviewDisputeSchema.parse(req.body);

    const dispute = await AttendanceDispute.findById(id);
    if (!dispute) throw new AppError('Dispute not found', 404);

    dispute.status = status;
    dispute.reviewedBy = req.user._id;
    dispute.reviewedAt = new Date();
    dispute.reviewRemark = reviewRemark;
    await dispute.save();

    // If APPROVED, update attendance record
    if (status === 'APPROVED') {
      const record = await AttendanceRecord.findById(dispute.attendanceId);
      if (record) {
        record.status = 'PRESENT';
        record.markedBy = 'FACULTY';
        record.overrideReason = `Dispute Approved: ${reviewRemark}`;
        await record.save();
      }
    }

    await createAuditLog(req.user._id, 'REVIEW_DISPUTE', 'AttendanceDispute', dispute._id.toString(), {
      status,
      reviewRemark,
    });

    res.status(200).json({
      success: true,
      message: `Attendance dispute ${status.toLowerCase()} successfully.`,
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
};
