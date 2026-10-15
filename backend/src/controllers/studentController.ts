import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { ClassAllocation } from '../models/ClassAllocation';
import { Timetable } from '../models/Timetable';
import { Notification } from '../models/Notification';
import { AttendanceDispute } from '../models/AttendanceDispute';
import { Subject } from '../models/Subject';
import { AttendanceSession } from '../models/AttendanceSession';
import { reportAttendanceIssueSchema, updateStudentProfileSchema } from '../validators';
import { createAuditLog } from '../services/auditService';
import { clockService, getEffectiveKolkataTime } from '../services/clockService';
import { normalizeCalendarDate } from './adminTimetableController';

export const getStudentDashboard = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate('departmentId')
      .populate('sectionId')
      .lean();

    if (!student) throw new AppError('Student academic profile not found.', 404);

    const studentId = student._id;

    // 1. Overall Attendance Summary
    const totalRecords = await AttendanceRecord.countDocuments({ studentId });
    const presentCount = await AttendanceRecord.countDocuments({ studentId, status: 'PRESENT' });
    const lateCount = await AttendanceRecord.countDocuments({ studentId, status: 'LATE' });
    const absentCount = await AttendanceRecord.countDocuments({ studentId, status: 'ABSENT' });
    const excusedCount = await AttendanceRecord.countDocuments({ studentId, status: 'EXCUSED' });

    const totalAttended = presentCount + lateCount;
    const overallPercentage = totalRecords > 0 ? parseFloat(((totalAttended / totalRecords) * 100).toFixed(1)) : 100.0;
    const isLowAttendance = overallPercentage < 75;

    // 2. Today's Attendance (Latest Recorded Biometric Attendance)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayRecord = await AttendanceRecord.findOne({
      studentId,
      date: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ timestamp: -1 })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .populate('classroomId')
      .lean();

    const formattedTodayAttendance = todayRecord
      ? {
          id: todayRecord._id,
          subjectName: (todayRecord.subjectId as any)?.name || 'Class Session',
          subjectCode: (todayRecord.subjectId as any)?.code || 'SUB',
          date: new Date(todayRecord.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
          recordedTime: new Date(todayRecord.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          classroom: (todayRecord.classroomId as any)
            ? `${(todayRecord.classroomId as any).building} - ${(todayRecord.classroomId as any).roomNumber}`
            : 'Campus Hall',
          faculty: (todayRecord.facultyId as any)?.userId?.name || 'Assigned Faculty',
          status: todayRecord.status,
          recognitionMethod: todayRecord.recognitionMethod,
        }
      : null;

    // 3. Today's Timetable Schedule & Next Upcoming Class (via effective clock & calendar date)
    const effectiveNow = clockService.getEffectiveNow();
    const { normalizedDate: todayNormalized, dayOfWeek: currentDayName, dateStr: todayDateStr } = normalizeCalendarDate(effectiveNow);

    const todayScheduleRaw = await Timetable.find({
      sectionId: student.sectionId?._id || student.sectionId,
      date: todayNormalized,
      status: { $ne: 'CANCELLED' },
    })
      .sort({ periodNumber: 1 })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .populate('classroomId')
      .lean();

    const nowMinutes = effectiveNow.getHours() * 60 + effectiveNow.getMinutes();

    let nextUpcomingClass: any = null;
    const formattedTodaySchedule = todayScheduleRaw.map((t: any) => {
      const [sh, sm] = (t.startTime || '09:00').split(':').map((v: string) => parseInt(v, 10));
      const [eh, em] = (t.endTime || '10:00').split(':').map((v: string) => parseInt(v, 10));
      const classStartMinutes = sh * 60 + sm;
      const classEndMinutes = eh * 60 + em;

      const isCurrent = nowMinutes >= classStartMinutes && nowMinutes <= classEndMinutes;
      const isUpcoming = nowMinutes < classStartMinutes;

      const item = {
        id: t._id,
        period: t.periodNumber,
        startTime: t.startTime,
        endTime: t.endTime,
        subjectName: t.subjectId?.name || 'Subject',
        subjectCode: t.subjectId?.code || 'SUB',
        facultyName: t.facultyId?.userId?.name || 'Staff',
        classroom: t.classroomId ? `${t.classroomId.building} - ${t.classroomId.roomNumber}` : 'Hall',
        isCurrent,
        isUpcoming,
        status: t.status || 'ACTIVE',
      };

      if (!nextUpcomingClass && (isCurrent || isUpcoming)) {
        nextUpcomingClass = item;
      }

      return item;
    });

    // 4. Subject Breakdown (Department & Semester curriculum + Class Allocations)
    const departmentId = student.departmentId?._id || student.departmentId;
    const deptSubjects = await Subject.find({
      departmentId,
      semester: student.semester,
      status: 'ACTIVE',
    }).lean();

    const allocations = await ClassAllocation.find({
      $or: [{ studentId }, { sectionId: student.sectionId?._id || student.sectionId }],
      status: 'ACTIVE',
    })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .lean();

    const timetableEntries = await Timetable.find({
      sectionId: student.sectionId?._id || student.sectionId,
      status: 'ACTIVE',
    })
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .lean();

    const facultyMap = new Map<string, string>();
    allocations.forEach((a: any) => {
      if (a.subjectId?._id && a.facultyId?.userId?.name) {
        facultyMap.set(a.subjectId._id.toString(), a.facultyId.userId.name);
      }
    });
    timetableEntries.forEach((t: any) => {
      if (t.subjectId && t.facultyId?.userId?.name && !facultyMap.has(t.subjectId.toString())) {
        facultyMap.set(t.subjectId.toString(), t.facultyId.userId.name);
      }
    });

    // Merge department curriculum subjects with any allocated subjects
    const allSubjectMap = new Map<string, any>();
    deptSubjects.forEach((sub: any) => {
      allSubjectMap.set(sub._id.toString(), sub);
    });
    allocations.forEach((a: any) => {
      if (a.subjectId && !allSubjectMap.has(a.subjectId._id.toString())) {
        allSubjectMap.set(a.subjectId._id.toString(), a.subjectId);
      }
    });

    const subjectBreakdown = await Promise.all(
      Array.from(allSubjectMap.values()).map(async (sub: any) => {
        const subId = sub._id;
        const sTotal = await AttendanceRecord.countDocuments({ studentId, subjectId: subId });
        const sAttended = await AttendanceRecord.countDocuments({
          studentId,
          subjectId: subId,
          status: { $in: ['PRESENT', 'LATE'] },
        });
        const pct = sTotal > 0 ? parseFloat(((sAttended / sTotal) * 100).toFixed(1)) : 100.0;
        return {
          subjectId: subId,
          subjectCode: sub.code,
          subjectName: sub.name,
          credits: sub.credits || 3,
          semester: sub.semester,
          facultyName: facultyMap.get(subId.toString()) || 'Faculty Member',
          totalClasses: sTotal,
          attendedClasses: sAttended,
          percentage: pct,
          status: pct >= 75 ? 'SAFE' : pct >= 65 ? 'WARNING' : 'CRITICAL',
        };
      })
    );

    // 5. Recent Attendance Activity
    const recentRecordsRaw = await AttendanceRecord.find({ studentId })
      .sort({ timestamp: -1 })
      .limit(6)
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .populate('classroomId')
      .lean();

    const recentRecords = recentRecordsRaw.map((r: any) => ({
      id: r._id,
      date: new Date(r.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      biometricTime: new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      subjectName: r.subjectId?.name || 'Subject',
      subjectCode: r.subjectId?.code,
      facultyName: r.facultyId?.userId?.name || 'Faculty Member',
      classroom: r.classroomId ? `${r.classroomId.building} - ${r.classroomId.roomNumber}` : 'Hall',
      status: r.status,
      recognitionMethod: r.recognitionMethod,
    }));

    // 6. Notifications & Unread Count
    const unreadNotificationCount = await Notification.countDocuments({ userId: req.user._id, readStatus: false });

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          studentId: student.registerNumber,
          registerNumber: student.registerNumber,
          rollNumber: student.rollNumber,
          department: (student.departmentId as any)?.name || 'Engineering',
          departmentCode: (student.departmentId as any)?.code || 'ENG',
          section: (student.sectionId as any)?.name || 'A',
          year: student.year,
          semester: student.semester,
          academicYear: student.academicYear,
          biometricStatus: student.biometricStatus,
        },
        summary: {
          overallPercentage,
          totalEligibleClasses: totalRecords,
          presentCount,
          lateCount,
          absentCount,
          excusedCount,
          isLowAttendance,
          statusBadge: overallPercentage >= 75 ? 'SAFE' : 'WARNING',
        },
        todayAttendance: formattedTodayAttendance,
        todaySchedule: {
          dayName: currentDayName,
          classes: formattedTodaySchedule,
          nextUpcomingClass,
        },
        subjectBreakdown,
        recentRecords,
        unreadNotificationCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) throw new AppError('Student academic profile not found.', 404);

    const { subjectId, status, month, startDate, endDate, date, search, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const query: any = { studentId: student._id };

    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId as string)) {
      query.subjectId = subjectId;
    }

    if (status && ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'].includes(status as string)) {
      query.status = status;
    }

    if (date) {
      const { normalizedDate } = normalizeCalendarDate(date as string);
      const nextDay = new Date(normalizedDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      query.date = { $gte: normalizedDate, $lt: nextDay };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = normalizeCalendarDate(startDate as string).normalizedDate;
      if (endDate) {
        const e = normalizeCalendarDate(endDate as string).normalizedDate;
        e.setUTCHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    } else if (month) {
      const [yearStr, monthStr] = (month as string).split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      query.date = {
        $gte: new Date(Date.UTC(y, m, 1)),
        $lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
      };
    }

    const [records, total, totalAll, presentAll, lateAll, absentAll] = await Promise.all([
      AttendanceRecord.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('subjectId')
        .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
        .populate('classroomId')
        .populate('deviceId')
        .populate('timetableId')
        .lean(),
      AttendanceRecord.countDocuments(query),
      AttendanceRecord.countDocuments({ studentId: student._id }),
      AttendanceRecord.countDocuments({ studentId: student._id, status: 'PRESENT' }),
      AttendanceRecord.countDocuments({ studentId: student._id, status: 'LATE' }),
      AttendanceRecord.countDocuments({ studentId: student._id, status: 'ABSENT' }),
    ]);

    const attendedAll = presentAll + lateAll;
    const attendancePercentage = totalAll > 0 ? parseFloat(((attendedAll / totalAll) * 100).toFixed(1)) : 100.0;

    let formattedRecords = records.map((r: any) => {
      const periodNum = r.timetableId?.periodNumber || 1;
      const formattedDate = new Date(r.date).toLocaleDateString('en-US', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = r.timestamp
        ? new Date(r.timestamp).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : null;
      const devName = r.deviceId?.deviceName || r.deviceId?.deviceId || (r.recognitionMethod === 'MANUAL_OVERRIDE' ? 'Admin Override' : 'Biometric Terminal');
      const facultyName = r.facultyId?.userId?.name || (r.facultyId as any)?.name || 'Assigned Faculty';

      return {
        id: r._id,
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
        facultyName,
        markedBy: facultyName,
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

    if (search) {
      const q = (search as string).toLowerCase();
      formattedRecords = formattedRecords.filter(
        (r) =>
          r.subjectName.toLowerCase().includes(q) ||
          r.subjectCode.toLowerCase().includes(q) ||
          r.facultyName.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      data: formattedRecords,
      summary: {
        attendancePercentage,
        totalEligibleClasses: totalAll,
        presentCount: attendedAll,
        absentCount: absentAll,
        lateCount: lateAll,
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentTimetable = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) throw new AppError('Student profile not found.', 404);

    const { date } = req.query;
    const { normalizedDate, dayOfWeek, dateStr } = normalizeCalendarDate(date as string | undefined);

    const timetableRecords = await Timetable.find({
      sectionId: student.sectionId?._id || student.sectionId,
      date: normalizedDate,
    })
      .sort({ periodNumber: 1 })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .populate('classroomId')
      .lean();

    // Look up attendance records for student on this date
    const dayAttendance = await AttendanceRecord.find({
      studentId: student._id,
      date: normalizedDate,
    })
      .populate('deviceId')
      .lean();

    const attMap = new Map<string, any>();
    dayAttendance.forEach((rec: any) => {
      if (rec.timetableId) {
        attMap.set(rec.timetableId.toString(), rec);
      }
    });

    const effectiveKolkata = getEffectiveKolkataTime();
    const todayStr = effectiveKolkata.dateStr;
    const nowMinutes = effectiveKolkata.totalMinutes;

    const formattedClasses = timetableRecords.map((t: any) => {
      const existingRecord = attMap.get(t._id.toString());
      const [sh, sm] = (t.startTime || '09:00').split(':').map((v: string) => parseInt(v, 10));
      const [eh, em] = (t.endTime || '10:00').split(':').map((v: string) => parseInt(v, 10));
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      let computedStatus: string = t.status || 'ACTIVE';
      let verificationTime: string | null = null;
      let deviceName: string | null = null;

      if (t.status === 'CANCELLED') {
        computedStatus = 'CANCELLED';
      } else if (existingRecord) {
        computedStatus = existingRecord.status;
        verificationTime = existingRecord.timestamp
          ? new Date(existingRecord.timestamp).toLocaleTimeString('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : null;
        deviceName = (existingRecord.deviceId as any)?.deviceName || (existingRecord.deviceId as any)?.deviceId || 'Biometric Scanner';
      } else {
        // No attendance punch record yet
        if (dateStr > todayStr) {
          // Future date
          computedStatus = 'UPCOMING';
        } else if (dateStr < todayStr) {
          // Past date with no punch -> Absent
          computedStatus = 'ABSENT';
        } else {
          // Today's date
          if (nowMinutes < startMin) {
            // Next / future hour today -> UPCOMING
            computedStatus = 'UPCOMING';
          } else if (nowMinutes <= endMin) {
            // Current scheduled class period in progress -> ACTIVE
            computedStatus = 'ACTIVE';
          } else {
            // Class hour has passed today without punch -> ABSENT
            computedStatus = 'ABSENT';
          }
        }
      }

      return {
        id: t._id,
        periodNumber: t.periodNumber,
        slot: t.periodNumber <= 3 ? 'Forenoon' : 'Afternoon',
        startTime: t.startTime,
        endTime: t.endTime,
        subjectName: t.subjectId?.name || 'Class Subject',
        subjectCode: t.subjectId?.code || 'SUB',
        facultyName: t.facultyId?.userId?.name || (t.facultyId as any)?.name || 'Assigned Faculty',
        classroom: t.classroomId ? `${t.classroomId.building} - ${t.classroomId.roomNumber}` : 'Hall',
        status: computedStatus,
        verificationTime,
        deviceName,
        notes: t.notes || '',
        isCurrent: dateStr === todayStr && nowMinutes >= startMin && nowMinutes <= endMin,
      };
    });

    // Backwards compatibility weekly schedule placeholder
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

export const getStudentAnalytics = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) throw new AppError('Student profile not found.', 404);

    const studentId = student._id;

    // 1. Overall Attendance Stats
    const totalRecords = await AttendanceRecord.countDocuments({ studentId });
    const presentCount = await AttendanceRecord.countDocuments({ studentId, status: 'PRESENT' });
    const lateCount = await AttendanceRecord.countDocuments({ studentId, status: 'LATE' });
    const absentCount = await AttendanceRecord.countDocuments({ studentId, status: 'ABSENT' });
    const excusedCount = await AttendanceRecord.countDocuments({ studentId, status: 'EXCUSED' });

    const totalAttended = presentCount + lateCount;
    const overallPercentage = totalRecords > 0 ? parseFloat(((totalAttended / totalRecords) * 100).toFixed(1)) : 100.0;

    // 2. Subject-wise Attendance Breakdown
    const allocations = await ClassAllocation.find({ studentId, status: 'ACTIVE' })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .lean();

    const subjectBreakdown = await Promise.all(
      allocations.map(async (alloc: any) => {
        if (!alloc.subjectId) return null;
        const subId = alloc.subjectId._id;
        const sTotal = await AttendanceRecord.countDocuments({ studentId, subjectId: subId });
        const sPresent = await AttendanceRecord.countDocuments({ studentId, subjectId: subId, status: 'PRESENT' });
        const sLate = await AttendanceRecord.countDocuments({ studentId, subjectId: subId, status: 'LATE' });
        const sAbsent = await AttendanceRecord.countDocuments({ studentId, subjectId: subId, status: 'ABSENT' });
        const sAttended = sPresent + sLate;
        const pct = sTotal > 0 ? parseFloat(((sAttended / sTotal) * 100).toFixed(1)) : 100.0;

        return {
          subjectId: subId,
          subjectCode: alloc.subjectId.code,
          subjectName: alloc.subjectId.name,
          facultyName: alloc.facultyId?.userId?.name || 'Staff Member',
          totalClasses: sTotal,
          presentClasses: sPresent,
          lateClasses: sLate,
          absentClasses: sAbsent,
          percentage: pct,
          status: pct >= 75 ? 'SAFE' : pct >= 65 ? 'WARNING' : 'CRITICAL',
        };
      })
    );

    const validSubjects = subjectBreakdown.filter(Boolean);
    const lowAttendanceSubjects = validSubjects.filter((s: any) => s.percentage < 75);

    // 3. Monthly Attendance Trend (Last 6 Months Aggregation)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyAggregation = await AttendanceRecord.aggregate([
      {
        $match: {
          studentId: new mongoose.Types.ObjectId(studentId.toString()),
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          total: { $sum: 1 },
          attended: {
            $sum: {
              $cond: [{ $in: ['$status', ['PRESENT', 'LATE']] }, 1, 0],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = monthlyAggregation.map((m) => {
      const pct = m.total > 0 ? parseFloat(((m.attended / m.total) * 100).toFixed(1)) : 100.0;
      return {
        month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
        percentage: pct,
        total: m.total,
        attended: m.attended,
        absent: m.absent,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          overallPercentage,
          totalEligibleClasses: totalRecords,
          presentCount,
          lateCount,
          absentCount,
          excusedCount,
          isLowAttendance: overallPercentage < 75,
        },
        subjectBreakdown: validSubjects,
        lowAttendanceSubjects,
        monthlyTrend,
        distribution: [
          { name: 'Present (On-Time)', value: presentCount, color: '#10b981' },
          { name: 'Late Arrival', value: lateCount, color: '#f59e0b' },
          { name: 'Absent', value: absentCount, color: '#f43f5e' },
          { name: 'Excused', value: excusedCount, color: '#8b5cf6' },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentNotifications = async (req: any, res: Response, next: NextFunction) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, readStatus: false });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({ _id: id, userId: req.user._id });
    if (!notification) throw new AppError('Notification not found.', 404);

    notification.readStatus = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsAsRead = async (req: any, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany({ userId: req.user._id, readStatus: false }, { readStatus: true });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

export const reportAttendanceIssue = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) throw new AppError('Student profile not found.', 404);

    const data = reportAttendanceIssueSchema.parse(req.body);

    let attRecord = null;
    if (data.attendanceId && mongoose.Types.ObjectId.isValid(data.attendanceId)) {
      attRecord = await AttendanceRecord.findOne({ _id: data.attendanceId, studentId: student._id });
      if (!attRecord) throw new AppError('Specified attendance record not found for student.', 404);
    }

    const generatedId = `ISSUE-${Date.now().toString().slice(-6)}`;

    const dispute = await AttendanceDispute.create({
      requestId: generatedId,
      studentId: student._id,
      attendanceId: attRecord ? attRecord._id : undefined,
      subjectId: data.subjectId && mongoose.Types.ObjectId.isValid(data.subjectId) ? data.subjectId : undefined,
      attendanceDate: data.attendanceDate ? new Date(data.attendanceDate) : attRecord?.date,
      issueCategory: data.issueCategory,
      reason: data.description.trim(),
      evidenceReference: data.evidenceReference?.trim(),
      status: 'PENDING',
      submittedAt: new Date(),
    });

    await createAuditLog(
      req.user._id,
      'REPORT_ATTENDANCE_ISSUE',
      'AttendanceDispute',
      dispute._id.toString(),
      {
        requestId: generatedId,
        category: data.issueCategory,
      },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: 'Attendance issue reported successfully. It will be reviewed by assigned faculty and administrators.',
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentAttendanceIssues = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) throw new AppError('Student profile not found.', 404);

    const issues = await AttendanceDispute.find({ studentId: student._id })
      .populate({
        path: 'attendanceId',
        populate: ['subjectId', 'classroomId', 'facultyId'],
      })
      .populate('subjectId')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    const formattedIssues = issues.map((i: any) => ({
      id: i._id,
      requestId: i.requestId || `ISSUE-${i._id.toString().slice(-6)}`,
      issueCategory: i.issueCategory || 'Incorrect attendance status',
      description: i.reason,
      evidenceReference: i.evidenceReference,
      status: i.status,
      submittedAt: new Date(i.submittedAt || i.createdAt).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      reviewedBy: i.reviewedBy?.name,
      reviewedAt: i.reviewedAt ? new Date(i.reviewedAt).toLocaleDateString() : null,
      reviewRemark: i.reviewRemark,
      attendanceDetails: i.attendanceId
        ? {
            subjectName: i.attendanceId.subjectId?.name,
            subjectCode: i.attendanceId.subjectId?.code,
            date: new Date(i.attendanceId.date).toLocaleDateString(),
            recordedTime: new Date(i.attendanceId.timestamp).toLocaleTimeString(),
            status: i.attendanceId.status,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: formattedIssues,
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate('departmentId')
      .populate('sectionId')
      .lean();

    if (!student) throw new AppError('Student profile not found.', 404);

    res.status(200).json({
      success: true,
      data: {
        id: student._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
        studentId: student.registerNumber,
        registerNumber: student.registerNumber,
        rollNumber: student.rollNumber,
        department: (student.departmentId as any)?.name || 'Engineering',
        departmentCode: (student.departmentId as any)?.code || 'ENG',
        section: (student.sectionId as any)?.name || 'A',
        year: student.year,
        semester: student.semester,
        academicYear: student.academicYear,
        biometricStatus: student.biometricStatus,
        status: student.status,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudentProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const data = updateStudentProfileSchema.parse(req.body);

    const user = await User.findById(req.user._id);
    if (!user) throw new AppError('User account not found.', 404);

    user.phone = data.phone.trim();
    await user.save();

    await createAuditLog(
      req.user._id,
      'UPDATE_STUDENT_PROFILE',
      'User',
      user._id.toString(),
      { updatedPhone: data.phone },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: 'Contact information updated successfully.',
      data: {
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all subjects according to the student's department and semester
 * Includes attendance statistics, credits, and assigned faculty for each subject.
 */
export const getStudentSubjects = async (req: any, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate('departmentId')
      .populate('sectionId')
      .lean();

    if (!student) throw new AppError('Student profile not found.', 404);

    const studentId = student._id;
    const departmentId = student.departmentId?._id || student.departmentId;
    const currentSemester = student.semester;

    // Fetch all active subjects for this student's department
    const deptSubjects = await Subject.find({ departmentId, status: 'ACTIVE' })
      .populate('departmentId')
      .sort({ semester: 1, code: 1 })
      .lean();

    // Map section timetable to find assigned faculties
    const timetables = await Timetable.find({
      sectionId: student.sectionId?._id || student.sectionId,
      status: 'ACTIVE',
    })
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email' } })
      .lean();

    const facultyMap = new Map<string, string>();
    timetables.forEach((t: any) => {
      if (t.subjectId && t.facultyId?.userId?.name) {
        facultyMap.set(t.subjectId.toString(), t.facultyId.userId.name);
      }
    });

    // Check allocations as well
    const allocations = await ClassAllocation.find({
      $or: [{ studentId }, { sectionId: student.sectionId?._id || student.sectionId }],
      status: 'ACTIVE',
    })
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .lean();

    allocations.forEach((a: any) => {
      if (a.subjectId && a.facultyId?.userId?.name) {
        facultyMap.set(a.subjectId.toString(), a.facultyId.userId.name);
      }
    });

    // Compute attendance statistics for each subject
    const enrichedSubjects = await Promise.all(
      deptSubjects.map(async (sub: any) => {
        const subId = sub._id;
        const totalClasses = await AttendanceRecord.countDocuments({ studentId, subjectId: subId });
        const attendedClasses = await AttendanceRecord.countDocuments({
          studentId,
          subjectId: subId,
          status: { $in: ['PRESENT', 'LATE'] },
        });
        const percentage = totalClasses > 0 ? parseFloat(((attendedClasses / totalClasses) * 100).toFixed(1)) : 100.0;

        return {
          id: sub._id,
          code: sub.code,
          name: sub.name,
          semester: sub.semester,
          credits: sub.credits || 3,
          isCurrentSemester: sub.semester === currentSemester,
          departmentCode: (sub.departmentId as any)?.code || (student.departmentId as any)?.code || 'DEPT',
          departmentName: (sub.departmentId as any)?.name || (student.departmentId as any)?.name || '',
          facultyName: facultyMap.get(subId.toString()) || 'Faculty Member',
          totalClasses,
          attendedClasses,
          percentage,
          status: percentage >= 75 ? 'SAFE' : percentage >= 65 ? 'WARNING' : 'CRITICAL',
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        department: {
          id: departmentId,
          name: (student.departmentId as any)?.name || 'Department',
          code: (student.departmentId as any)?.code || 'DEPT',
        },
        currentSemester,
        year: student.year,
        section: (student.sectionId as any)?.name || 'A',
        totalDepartmentSubjects: enrichedSubjects.length,
        currentSemesterSubjects: enrichedSubjects.filter((s) => s.isCurrentSemester),
        allSubjects: enrichedSubjects,
      },
    });
  } catch (err) {
    next(err);
  }
};
