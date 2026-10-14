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
import { Timetable } from '../models/Timetable';
import { manualOverrideSchema, reviewDisputeSchema } from '../validators';
import { createAuditLog } from '../services/auditService';
import { createNotification } from '../services/notificationService';
import { emitAttendanceEvent } from '../services/socketService';
import { clockService } from '../services/clockService';
import { normalizeCalendarDate } from './adminTimetableController';

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
    if (!faculty && req.user.role !== 'ADMIN') throw new AppError('Faculty profile not found', 404);

    if (faculty) {
      await ensureFacultyAllocationsAndSessions(faculty._id, faculty.departmentId);
    }

    const { departmentId, sectionId, semester, attendanceStatus, search, startDate, endDate } = req.query;

    // Determine allocated students
    let allocatedStudentIds: string[] = [];
    let allocations: any[] = [];

    if (faculty) {
      allocations = await ClassAllocation.find({ facultyId: faculty._id, status: 'ACTIVE' })
        .populate({ path: 'studentId', populate: [{ path: 'userId' }, { path: 'departmentId' }, { path: 'sectionId' }] })
        .populate('subjectId')
        .populate('sectionId');

      const directStudentIds = allocations.map((a: any) => a.studentId?._id?.toString()).filter(Boolean);

      // Section-level allocations
      const sectionAllocations = await ClassAllocation.find({
        facultyId: faculty._id,
        sectionId: { $exists: true, $ne: null },
        status: 'ACTIVE',
      });
      const secIds = sectionAllocations.map((a: any) => a.sectionId).filter(Boolean);

      let sectionStudentIds: string[] = [];
      if (secIds.length > 0) {
        const secStudents = await Student.find({ sectionId: { $in: secIds }, status: 'ACTIVE' }).select('_id');
        sectionStudentIds = secStudents.map((s) => s._id.toString());
      }

      allocatedStudentIds = Array.from(new Set([...directStudentIds, ...sectionStudentIds]));
    } else {
      // ADMIN viewing endpoint
      const allStudents = await Student.find({ status: 'ACTIVE' }).select('_id');
      allocatedStudentIds = allStudents.map((s) => s._id.toString());
    }

    if (allocatedStudentIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        summary: {
          totalAllocated: 0,
          averageAttendancePercentage: null,
          studentsInWarning: 0,
          studentsSafe: 0,
          noDataCount: 0,
        },
      });
    }

    // Load full student documents
    const students = await Student.find({ _id: { $in: allocatedStudentIds } })
      .populate('userId', 'name email phone')
      .populate('departmentId', 'name code')
      .populate('sectionId', 'name')
      .lean();

    // Date range filter for attendance records
    const dateQuery: any = {};
    if (startDate) {
      dateQuery.$gte = normalizeCalendarDate(startDate as string).normalizedDate;
    }
    if (endDate) {
      const e = normalizeCalendarDate(endDate as string).normalizedDate;
      e.setUTCHours(23, 59, 59, 999);
      dateQuery.$lte = e;
    }

    // Fetch today's records for all allocated students
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayRecords = await AttendanceRecord.find({
      studentId: { $in: allocatedStudentIds },
      date: { $gte: todayStart, $lte: todayEnd },
    }).lean();

    const todayRecordMap = new Map<string, any>();
    for (const r of todayRecords) {
      todayRecordMap.set(r.studentId.toString(), r);
    }

    // Fetch aggregate attendance metrics per student
    const matchFilter: any = {
      studentId: { $in: allocatedStudentIds.map((id) => new mongoose.Types.ObjectId(id)) },
      status: { $in: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] },
    };
    if (dateQuery.$gte || dateQuery.$lte) {
      matchFilter.date = dateQuery;
    }

    const attendanceAgg = await AttendanceRecord.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$studentId',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$status', 'EXCUSED'] }, 1, 0] } },
        },
      },
    ]);

    const aggMap = new Map<string, any>();
    for (const agg of attendanceAgg) {
      aggMap.set(agg._id.toString(), agg);
    }

    // Process each student
    const studentResults = students.map((st: any) => {
      const stId = st._id.toString();
      const agg = aggMap.get(stId) || { total: 0, present: 0, late: 0, absent: 0, excused: 0 };
      const attended = agg.present + agg.late;
      const totalEligible = agg.total;

      let percentage: number | null = null;
      let warningStatus: 'SAFE' | 'WARNING' | 'CRITICAL' | 'NO_DATA' = 'NO_DATA';

      if (totalEligible > 0) {
        percentage = parseFloat(((attended / totalEligible) * 100).toFixed(1));
        if (percentage >= 75) {
          warningStatus = 'SAFE';
        } else if (percentage >= 65) {
          warningStatus = 'WARNING';
        } else {
          warningStatus = 'CRITICAL';
        }
      }

      const todayRec = todayRecordMap.get(stId);

      return {
        _id: st._id,
        id: st._id,
        studentId: st, // Keeps backwards compatibility
        student: {
          _id: st._id,
          id: st._id,
          name: st.userId?.name || 'Unknown Student',
          email: st.userId?.email || '',
          phone: st.userId?.phone || '',
          registerNumber: st.registerNumber,
          rollNumber: st.rollNumber,
          department: st.departmentId?.name || '',
          departmentCode: st.departmentId?.code || '',
          departmentId: st.departmentId?._id?.toString() || st.departmentId?.toString() || '',
          section: st.sectionId?.name || '',
          sectionId: st.sectionId?._id?.toString() || st.sectionId?.toString() || '',
          year: st.year,
          semester: st.semester,
          biometricStatus: st.biometricStatus || 'NOT ENROLLED',
        },
        todayAttendance: todayRec
          ? {
              status: todayRec.status,
              timestamp: todayRec.timestamp,
              recognitionMethod: todayRec.recognitionMethod,
              confidenceScore: todayRec.confidenceScore,
            }
          : { status: 'ABSENT', timestamp: null },
        totalEligibleClasses: totalEligible,
        presentCount: agg.present,
        lateCount: agg.late,
        absentCount: agg.absent,
        excusedCount: agg.excused,
        attendancePercentage: percentage,
        warningStatus,
      };
    });

    // Apply filtering
    let filtered = studentResults;

    if (search) {
      const q = (search as string).toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.student.name.toLowerCase().includes(q) ||
          s.student.registerNumber.toLowerCase().includes(q) ||
          (s.student.rollNumber && s.student.rollNumber.toLowerCase().includes(q))
      );
    }

    if (departmentId) {
      filtered = filtered.filter((s) => s.student.departmentId === departmentId.toString());
    }

    if (sectionId) {
      filtered = filtered.filter((s) => s.student.sectionId === sectionId.toString());
    }

    if (semester) {
      const semNum = parseInt(semester as string, 10);
      filtered = filtered.filter((s) => s.student.semester === semNum);
    }

    if (attendanceStatus && attendanceStatus !== 'ALL') {
      const statusUpper = (attendanceStatus as string).toUpperCase();
      if (statusUpper === 'LOW') {
        filtered = filtered.filter((s) => s.warningStatus === 'WARNING' || s.warningStatus === 'CRITICAL');
      } else if (statusUpper === 'GOOD' || statusUpper === 'SAFE') {
        filtered = filtered.filter((s) => s.warningStatus === 'SAFE');
      } else {
        filtered = filtered.filter((s) => s.warningStatus === statusUpper);
      }
    }

    // Summary calculations across all allocated students
    const validPcts = studentResults
      .map((s) => s.attendancePercentage)
      .filter((p): p is number => p !== null && !isNaN(p));
    const avgPercentage =
      validPcts.length > 0 ? parseFloat((validPcts.reduce((a, b) => a + b, 0) / validPcts.length).toFixed(1)) : null;

    const studentsInWarning = studentResults.filter(
      (s) => s.warningStatus === 'WARNING' || s.warningStatus === 'CRITICAL'
    ).length;
    const studentsSafe = studentResults.filter((s) => s.warningStatus === 'SAFE').length;
    const noDataCount = studentResults.filter((s) => s.warningStatus === 'NO_DATA').length;

    res.status(200).json({
      success: true,
      data: filtered,
      summary: {
        totalAllocated: studentResults.length,
        averageAttendancePercentage: avgPercentage,
        studentsInWarning,
        studentsSafe,
        noDataCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentAttendanceDetail = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student =
      req.targetStudent ||
      (await Student.findById(req.params.studentId)
        .populate('userId')
        .populate('departmentId')
        .populate('sectionId'));
    if (!student) throw new AppError('Student profile not found', 404);

    const studentId = student._id;
    const { startDate, endDate, subjectId, status, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    // Build query for records
    const recordQuery: any = {
      studentId,
      status: { $in: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] },
    };

    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId as string)) {
      recordQuery.subjectId = subjectId;
    }

    if (status && ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'].includes(status as string)) {
      recordQuery.status = status;
    }

    if (startDate || endDate) {
      recordQuery.date = {};
      if (startDate) {
        recordQuery.date.$gte = normalizeCalendarDate(startDate as string).normalizedDate;
      }
      if (endDate) {
        const e = normalizeCalendarDate(endDate as string).normalizedDate;
        e.setUTCHours(23, 59, 59, 999);
        recordQuery.date.$lte = e;
      }
    }

    // 1. Overall stats for this student
    const [totalAll, presentAll, lateAll, absentAll, excusedAll] = await Promise.all([
      AttendanceRecord.countDocuments({ studentId, status: { $in: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] } }),
      AttendanceRecord.countDocuments({ studentId, status: 'PRESENT' }),
      AttendanceRecord.countDocuments({ studentId, status: 'LATE' }),
      AttendanceRecord.countDocuments({ studentId, status: 'ABSENT' }),
      AttendanceRecord.countDocuments({ studentId, status: 'EXCUSED' }),
    ]);

    const attendedAll = presentAll + lateAll;
    const overallPercentage = totalAll > 0 ? parseFloat(((attendedAll / totalAll) * 100).toFixed(1)) : null;
    const warningStatus =
      overallPercentage === null
        ? 'NO_DATA'
        : overallPercentage >= 75
        ? 'SAFE'
        : overallPercentage >= 65
        ? 'WARNING'
        : 'CRITICAL';

    // 2. Subject Breakdown
    const allocations = await ClassAllocation.find({ studentId, status: 'ACTIVE' })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email' } })
      .lean();

    const distinctSubjectIds = await AttendanceRecord.distinct('subjectId', { studentId });
    const allSubjectIds = Array.from(
      new Set([
        ...allocations.map((a: any) => a.subjectId?._id?.toString()).filter(Boolean),
        ...distinctSubjectIds.map((s: any) => s.toString()),
      ])
    );

    const subjectBreakdown = await Promise.all(
      allSubjectIds.map(async (subIdStr: string) => {
        const alloc = allocations.find((a: any) => a.subjectId?._id?.toString() === subIdStr);
        let subjectDoc: any = alloc?.subjectId;
        let facultyName = (alloc?.facultyId as any)?.userId?.name || 'Staff Member';

        if (!subjectDoc) {
          subjectDoc = (await Subject.findById(subIdStr).lean()) as any;
        }

        if (!subjectDoc) return null;

        const sTotal = await AttendanceRecord.countDocuments({
          studentId,
          subjectId: subIdStr,
          status: { $in: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] },
        });
        const sPresent = await AttendanceRecord.countDocuments({ studentId, subjectId: subIdStr, status: 'PRESENT' });
        const sLate = await AttendanceRecord.countDocuments({ studentId, subjectId: subIdStr, status: 'LATE' });
        const sAbsent = await AttendanceRecord.countDocuments({ studentId, subjectId: subIdStr, status: 'ABSENT' });
        const sExcused = await AttendanceRecord.countDocuments({ studentId, subjectId: subIdStr, status: 'EXCUSED' });
        const sAttended = sPresent + sLate;
        const sPct = sTotal > 0 ? parseFloat(((sAttended / sTotal) * 100).toFixed(1)) : null;

        return {
          subjectId: subjectDoc._id,
          subjectCode: subjectDoc.code,
          subjectName: subjectDoc.name,
          facultyName,
          totalClasses: sTotal,
          presentClasses: sPresent,
          lateClasses: sLate,
          absentClasses: sAbsent,
          excusedClasses: sExcused,
          attendedClasses: sAttended,
          percentage: sPct,
          status: sPct === null ? 'NO_DATA' : sPct >= 75 ? 'SAFE' : sPct >= 65 ? 'WARNING' : 'CRITICAL',
        };
      })
    );

    // 3. Paginated Attendance Records
    const [rawRecords, totalFiltered] = await Promise.all([
      AttendanceRecord.find(recordQuery)
        .sort({ date: -1, timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('subjectId')
        .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email' } })
        .populate('classroomId')
        .populate('deviceId')
        .populate('timetableId')
        .lean(),
      AttendanceRecord.countDocuments(recordQuery),
    ]);

    const formattedRecords = rawRecords.map((r: any) => {
      const periodNum = r.timetableId?.periodNumber || 1;
      const formattedDate = new Date(r.date).toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = r.timestamp
        ? new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : null;
      const devName =
        r.deviceId?.deviceName ||
        r.deviceId?.deviceId ||
        (r.recognitionMethod === 'MANUAL_OVERRIDE' ? 'Manual Override' : 'Biometric Terminal');

      return {
        id: r._id,
        _id: r._id,
        date: r.date,
        formattedDate,
        dateStr: new Date(r.date).toISOString().slice(0, 10),
        periodNumber: periodNum,
        slot: periodNum <= 3 ? 'Forenoon' : 'Afternoon',
        startTime: r.timetableId?.startTime || '09:00',
        endTime: r.timetableId?.endTime || '10:00',
        biometricTime: timeStr,
        verificationTime: timeStr,
        subjectName: r.subjectId?.name || 'Class Session',
        subjectCode: r.subjectId?.code || 'SUB',
        facultyName: r.facultyId?.userId?.name || (r.facultyId as any)?.name || 'Assigned Faculty',
        classroom: r.classroomId ? `${r.classroomId.building} - ${r.classroomId.roomNumber}` : 'Campus Hall',
        status: r.status,
        recognitionMethod: r.recognitionMethod,
        deviceName: devName,
        isLate: r.status === 'LATE',
        isTestMode: Boolean(r.isTestMode),
        realTimestamp: r.realTimestamp,
        overrideReason: r.overrideReason,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          _id: student._id,
          name: student.userId?.name || 'Student',
          email: student.userId?.email || '',
          phone: student.userId?.phone || '',
          registerNumber: student.registerNumber,
          rollNumber: student.rollNumber,
          department: student.departmentId?.name || '',
          departmentCode: student.departmentId?.code || '',
          section: student.sectionId?.name || '',
          year: student.year,
          semester: student.semester,
          biometricStatus: student.biometricStatus || 'NOT ENROLLED',
        },
        summary: {
          totalEligibleClasses: totalAll,
          presentCount: presentAll,
          lateCount: lateAll,
          absentCount: absentAll,
          excusedCount: excusedAll,
          attendancePercentage: overallPercentage,
          warningStatus,
          isLowAttendance: overallPercentage !== null && overallPercentage < 75,
        },
        subjectBreakdown: subjectBreakdown.filter(Boolean),
        records: formattedRecords,
        pagination: {
          total: totalFiltered,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalFiltered / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentAttendanceSummary = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student =
      req.targetStudent ||
      (await Student.findById(req.params.studentId)
        .populate('userId')
        .populate('departmentId')
        .populate('sectionId'));
    if (!student) throw new AppError('Student profile not found', 404);

    const studentId = student._id;

    const [totalAll, presentAll, lateAll, absentAll, excusedAll] = await Promise.all([
      AttendanceRecord.countDocuments({ studentId, status: { $in: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] } }),
      AttendanceRecord.countDocuments({ studentId, status: 'PRESENT' }),
      AttendanceRecord.countDocuments({ studentId, status: 'LATE' }),
      AttendanceRecord.countDocuments({ studentId, status: 'ABSENT' }),
      AttendanceRecord.countDocuments({ studentId, status: 'EXCUSED' }),
    ]);

    const attendedAll = presentAll + lateAll;
    const overallPercentage = totalAll > 0 ? parseFloat(((attendedAll / totalAll) * 100).toFixed(1)) : null;
    const warningStatus =
      overallPercentage === null
        ? 'NO_DATA'
        : overallPercentage >= 75
        ? 'SAFE'
        : overallPercentage >= 65
        ? 'WARNING'
        : 'CRITICAL';

    const allocations = await ClassAllocation.find({ studentId, status: 'ACTIVE' })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .lean();

    const distinctSubjectIds = await AttendanceRecord.distinct('subjectId', { studentId });
    const allSubjectIds = Array.from(
      new Set([
        ...allocations.map((a: any) => a.subjectId?._id?.toString()).filter(Boolean),
        ...distinctSubjectIds.map((s: any) => s.toString()),
      ])
    );

    const subjectBreakdown = await Promise.all(
      allSubjectIds.map(async (subIdStr: string) => {
        const alloc = allocations.find((a: any) => a.subjectId?._id?.toString() === subIdStr);
        let subjectDoc: any = alloc?.subjectId;
        let facultyName = (alloc?.facultyId as any)?.userId?.name || 'Staff Member';

        if (!subjectDoc) {
          subjectDoc = (await Subject.findById(subIdStr).lean()) as any;
        }
        if (!subjectDoc) return null;

        const sTotal = await AttendanceRecord.countDocuments({
          studentId,
          subjectId: subIdStr,
          status: { $in: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] },
        });
        const sPresent = await AttendanceRecord.countDocuments({ studentId, subjectId: subIdStr, status: 'PRESENT' });
        const sLate = await AttendanceRecord.countDocuments({ studentId, subjectId: subIdStr, status: 'LATE' });
        const sAbsent = await AttendanceRecord.countDocuments({ studentId, subjectId: subIdStr, status: 'ABSENT' });
        const sExcused = await AttendanceRecord.countDocuments({ studentId, subjectId: subIdStr, status: 'EXCUSED' });
        const sAttended = sPresent + sLate;
        const sPct = sTotal > 0 ? parseFloat(((sAttended / sTotal) * 100).toFixed(1)) : null;

        return {
          subjectId: subjectDoc._id,
          subjectCode: subjectDoc.code,
          subjectName: subjectDoc.name,
          facultyName,
          totalClasses: sTotal,
          presentClasses: sPresent,
          lateClasses: sLate,
          absentClasses: sAbsent,
          excusedClasses: sExcused,
          attendedClasses: sAttended,
          percentage: sPct,
          status: sPct === null ? 'NO_DATA' : sPct >= 75 ? 'SAFE' : sPct >= 65 ? 'WARNING' : 'CRITICAL',
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.userId?.name || 'Student',
          registerNumber: student.registerNumber,
          department: student.departmentId?.name || '',
          section: student.sectionId?.name || '',
          year: student.year,
          semester: student.semester,
        },
        summary: {
          totalEligibleClasses: totalAll,
          presentCount: presentAll,
          lateCount: lateAll,
          absentCount: absentAll,
          excusedCount: excusedAll,
          attendancePercentage: overallPercentage,
          warningStatus,
          isLowAttendance: overallPercentage !== null && overallPercentage < 75,
        },
        subjectBreakdown: subjectBreakdown.filter(Boolean),
      },
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
      .populate('deviceId')
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
      if (existingRecord) {
        const devName = (existingRecord.deviceId as any)?.deviceName || (existingRecord.deviceId as any)?.deviceId || (existingRecord.recognitionMethod === 'MANUAL_OVERRIDE' ? 'Manual Override' : 'Biometric Terminal');
        const plain = existingRecord.toObject ? existingRecord.toObject() : existingRecord;
        return {
          ...plain,
          deviceName: devName,
          verificationTime: existingRecord.timestamp ? new Date(existingRecord.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
        };
      }
      return {
        _id: `virtual_${sid}`,
        studentId: st,
        sessionId: session._id,
        status: 'ABSENT',
        timestamp: null,
        verificationTime: null,
        deviceName: null,
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

export const getFacultyTimetable = async (req: any, res: Response, next: NextFunction) => {
  try {
    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) throw new AppError('Faculty profile not found.', 404);

    const { date } = req.query;
    const { normalizedDate, dayOfWeek, dateStr } = normalizeCalendarDate(date as string | undefined);

    const timetableRecords = await Timetable.find({
      facultyId: faculty._id,
      date: normalizedDate,
    })
      .sort({ periodNumber: 1 })
      .populate('subjectId')
      .populate('sectionId')
      .populate('classroomId')
      .lean();

    const effectiveNow = clockService.getEffectiveNow();
    const nowMinutes = effectiveNow.getHours() * 60 + effectiveNow.getMinutes();

    const formattedClasses = await Promise.all(
      timetableRecords.map(async (t: any) => {
        const [sh, sm] = (t.startTime || '09:00').split(':').map((v: string) => parseInt(v, 10));
        const [eh, em] = (t.endTime || '10:00').split(':').map((v: string) => parseInt(v, 10));
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        const session = await AttendanceSession.findOne({ timetableId: t._id });
        let presentCount = 0;
        let totalAllocated = 0;
        if (session) {
          presentCount = await AttendanceRecord.countDocuments({
            sessionId: session._id,
            status: { $in: ['PRESENT', 'LATE'] },
          });
        }
        if (t.sectionId?._id) {
          totalAllocated = await Student.countDocuments({ sectionId: t.sectionId._id, status: 'ACTIVE' });
        }

        return {
          id: t._id,
          periodNumber: t.periodNumber,
          slot: t.periodNumber <= 3 ? 'Forenoon' : 'Afternoon',
          startTime: t.startTime,
          endTime: t.endTime,
          subjectName: t.subjectId?.name || 'Class Subject',
          subjectCode: t.subjectId?.code || 'SUB',
          year: t.subjectId?.year || Math.ceil((t.subjectId?.semester || t.semester || 1) / 2),
          semester: t.subjectId?.semester || t.semester || 1,
          sectionName: t.sectionId?.name || 'Assigned Section',
          sectionId: t.sectionId?._id || t.sectionId,
          classroom: t.classroomId ? `${t.classroomId.building} - ${t.classroomId.roomNumber}` : 'Hall',
          classType: 'Theory',
          status: t.status || 'ACTIVE',
          notes: t.notes || '',
          sessionId: session?._id || null,
          presentCount,
          totalAllocated,
          isCurrent: nowMinutes >= startMin && nowMinutes <= endMin,
        };
      })
    );

    const weeklySchedule: Record<string, any[]> = { [dayOfWeek]: formattedClasses };

    res.status(200).json({
      success: true,
      data: {
        date: dateStr,
        dayOfWeek,
        currentDay: dayOfWeek,
        classes: formattedClasses,
        hasClasses: formattedClasses.length > 0,
        weeklySchedule,
        hasPublishedTimetable: formattedClasses.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

