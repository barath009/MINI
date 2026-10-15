import mongoose from 'mongoose';
import { Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ParentWard } from '../models/ParentWard';
import { Student } from '../models/Student';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { ClassAllocation } from '../models/ClassAllocation';
import { Timetable } from '../models/Timetable';
import { clockService, getEffectiveKolkataTime } from '../services/clockService';
import { normalizeCalendarDate } from './adminTimetableController';

export const getParentDashboard = async (req: any, res: Response, next: NextFunction) => {
  try {
    const parentId = req.user._id;

    // 1. Fetch all active wards for this parent
    const wardLinks = await ParentWard.find({ parent: parentId, isActive: true })
      .populate({
        path: 'student',
        populate: [
          { path: 'userId', select: 'name email phone' },
          { path: 'departmentId', select: 'name code' },
          { path: 'sectionId', select: 'name' },
        ],
      })
      .lean();

    if (!wardLinks || wardLinks.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          parent: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
          },
          wards: [],
          selectedWard: null,
          summary: null,
          recentRecords: [],
          subjectBreakdown: [],
        },
      });
    }

    // 2. Select ward: query param or default to first
    const reqStudentId = req.query.studentId as string;
    let selectedWardLink = wardLinks[0];
    if (reqStudentId) {
      const match = wardLinks.find((wl: any) => wl.student?._id?.toString() === reqStudentId);
      if (match) selectedWardLink = match;
    }

    const studentDoc: any = selectedWardLink.student;
    if (!studentDoc) {
      throw new AppError('Linked student details could not be retrieved.', 404);
    }

    const studentId = studentDoc._id;

    // 3. Calculate attendance stats for the selected ward
    const totalRecords = await AttendanceRecord.countDocuments({ studentId });
    const presentCount = await AttendanceRecord.countDocuments({ studentId, status: 'PRESENT' });
    const lateCount = await AttendanceRecord.countDocuments({ studentId, status: 'LATE' });
    const absentCount = await AttendanceRecord.countDocuments({ studentId, status: 'ABSENT' });
    const excusedCount = await AttendanceRecord.countDocuments({ studentId, status: 'EXCUSED' });

    const totalAttended = presentCount + lateCount;
    const overallPercentage = totalRecords > 0 ? parseFloat(((totalAttended / totalRecords) * 100).toFixed(1)) : null;

    // 4. Subject breakdown for the selected ward
    const allocations = await ClassAllocation.find({ studentId, status: 'ACTIVE' })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email' } })
      .lean();

    const subjectBreakdown = (
      await Promise.all(
        allocations.map(async (alloc: any) => {
          if (!alloc.subjectId) return null;
          const subId = alloc.subjectId._id;
          const sTotal = await AttendanceRecord.countDocuments({ studentId, subjectId: subId });
          const sAttended = await AttendanceRecord.countDocuments({
            studentId,
            subjectId: subId,
            status: { $in: ['PRESENT', 'LATE'] },
          });
          const pct = sTotal > 0 ? parseFloat(((sAttended / sTotal) * 100).toFixed(1)) : null;
          return {
            subjectId: subId,
            subjectCode: alloc.subjectId.code,
            subjectName: alloc.subjectId.name,
            facultyName: alloc.facultyId?.userId?.name || 'Staff Member',
            totalClasses: sTotal,
            attendedClasses: sAttended,
            percentage: pct,
            status: pct === null ? 'NO_DATA' : pct >= 75 ? 'SAFE' : pct >= 65 ? 'WARNING' : 'CRITICAL',
          };
        })
      )
    ).filter(Boolean);

    // 5. Recent biometric attendance records
    const recentRaw = await AttendanceRecord.find({ studentId })
      .sort({ timestamp: -1 })
      .limit(6)
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .populate('classroomId')
      .lean();

    const recentRecords = recentRaw.map((r: any) => ({
      id: r._id,
      date: new Date(r.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      biometricTime: new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      subjectName: r.subjectId?.name || 'Subject Class',
      subjectCode: r.subjectId?.code,
      facultyName: r.facultyId?.userId?.name || 'Faculty Member',
      classroom: r.classroomId ? `${r.classroomId.building} - ${r.classroomId.roomNumber}` : 'Classroom',
      status: r.status,
      recognitionMethod: r.recognitionMethod,
    }));

    // Format all wards list for top tab selector
    const wardsList = await Promise.all(
      wardLinks.map(async (wl: any) => {
        const s = wl.student;
        if (!s) return null;
        const wTotal = await AttendanceRecord.countDocuments({ studentId: s._id });
        const wAttended = await AttendanceRecord.countDocuments({
          studentId: s._id,
          status: { $in: ['PRESENT', 'LATE'] },
        });
        const wPct = wTotal > 0 ? parseFloat(((wAttended / wTotal) * 100).toFixed(1)) : null;
        return {
          studentId: s._id,
          name: s.userId?.name || 'Student',
          registerNumber: s.registerNumber,
          rollNumber: s.rollNumber,
          department: s.departmentId?.name,
          section: s.sectionId?.name,
          relationship: wl.relationship,
          overallPercentage: wPct,
          statusBadge: wPct === null ? 'NO_DATA' : wPct >= 75 ? 'SAFE' : 'WARNING',
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        parent: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
        },
        wards: wardsList.filter(Boolean),
        selectedWard: {
          studentId: studentDoc._id,
          name: studentDoc.userId?.name,
          registerNumber: studentDoc.registerNumber,
          rollNumber: studentDoc.rollNumber,
          department: studentDoc.departmentId?.name,
          section: studentDoc.sectionId?.name,
          year: studentDoc.year,
          semester: studentDoc.semester,
          academicYear: studentDoc.academicYear,
          relationship: selectedWardLink.relationship,
        },
        summary: {
          overallPercentage,
          totalEligibleClasses: totalRecords,
          presentCount,
          lateCount,
          absentCount,
          excusedCount,
          isLowAttendance: overallPercentage !== null && overallPercentage < 75,
          statusBadge: overallPercentage === null ? 'NO_DATA' : overallPercentage >= 75 ? 'SAFE' : 'WARNING',
        },
        subjectBreakdown,
        recentRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getParentWards = async (req: any, res: Response, next: NextFunction) => {
  try {
    const wardLinks = await ParentWard.find({ parent: req.user._id, isActive: true })
      .populate({
        path: 'student',
        populate: [
          { path: 'userId', select: 'name email phone' },
          { path: 'departmentId', select: 'name code' },
          { path: 'sectionId', select: 'name' },
        ],
      })
      .lean();

    const formattedWards = await Promise.all(
      wardLinks.map(async (wl: any) => {
        const s = wl.student;
        if (!s) return null;
        const total = await AttendanceRecord.countDocuments({ studentId: s._id });
        const attended = await AttendanceRecord.countDocuments({
          studentId: s._id,
          status: { $in: ['PRESENT', 'LATE'] },
        });
        const pct = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : null;

        return {
          studentId: s._id,
          name: s.userId?.name,
          email: s.userId?.email,
          registerNumber: s.registerNumber,
          rollNumber: s.rollNumber,
          department: s.departmentId?.name,
          section: s.sectionId?.name,
          year: s.year,
          semester: s.semester,
          relationship: wl.relationship,
          totalClasses: total,
          attendedClasses: attended,
          percentage: pct,
          statusBadge: pct === null ? 'NO_DATA' : pct >= 75 ? 'SAFE' : 'WARNING',
          biometricStatus: s.biometricStatus,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: formattedWards.filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};

export const getWardAttendanceHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.studentId;
    const { month, subjectId, status, startDate, endDate, date, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    if (date) {
      const student = await Student.findById(studentId);
      const { normalizedDate, dateStr, dayOfWeek } = normalizeCalendarDate(date as string);

      const ttQuery: any = {
        sectionId: student?.sectionId?._id || student?.sectionId,
        date: normalizedDate,
      };
      if (subjectId && mongoose.Types.ObjectId.isValid(subjectId as string)) {
        ttQuery.subjectId = subjectId;
      }

      const scheduledClasses = await Timetable.find(ttQuery)
        .sort({ periodNumber: 1 })
        .populate('subjectId')
        .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
        .populate('classroomId')
        .lean();

      const nextDay = new Date(normalizedDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const dayRecords = await AttendanceRecord.find({
        studentId,
        date: { $gte: normalizedDate, $lt: nextDay },
      })
        .populate('subjectId')
        .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
        .populate('classroomId')
        .populate('deviceId')
        .populate('timetableId')
        .lean();

      const attByTimetable = new Map<string, any>();
      const attBySubject = new Map<string, any>();
      dayRecords.forEach((r: any) => {
        if (r.timetableId?._id) {
          attByTimetable.set(r.timetableId._id.toString(), r);
        } else if (r.timetableId) {
          attByTimetable.set(r.timetableId.toString(), r);
        }
        if (r.subjectId?._id) {
          attBySubject.set(r.subjectId._id.toString(), r);
        }
      });

      const effectiveKolkata = getEffectiveKolkataTime();
      const todayStr = effectiveKolkata.dateStr;
      const nowMinutes = effectiveKolkata.totalMinutes;

      const matchedAttendanceIds = new Set<string>();

      let combinedRecords = scheduledClasses.map((t: any) => {
        const existingRecord = attByTimetable.get(t._id.toString()) || attBySubject.get(t.subjectId?._id?.toString());
        if (existingRecord) {
          matchedAttendanceIds.add(existingRecord._id.toString());
        }

        const [sh, sm] = (t.startTime || '09:00').split(':').map((v: string) => parseInt(v, 10));
        const [eh, em] = (t.endTime || '10:00').split(':').map((v: string) => parseInt(v, 10));
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        let computedStatus: string = 'UPCOMING';
        let verificationTime: string | null = null;
        let deviceName = 'Biometric Terminal';

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
          deviceName =
            existingRecord.deviceId?.deviceName ||
            existingRecord.deviceId?.deviceId ||
            (existingRecord.recognitionMethod === 'MANUAL_OVERRIDE' ? 'Admin Override' : 'Biometric Terminal');
        } else {
          // No punch yet
          if (dateStr > todayStr) {
            computedStatus = 'UPCOMING';
          } else if (dateStr < todayStr) {
            computedStatus = 'ABSENT';
          } else {
            // Today
            if (nowMinutes < startMin) {
              computedStatus = 'UPCOMING';
            } else if (nowMinutes <= endMin) {
              computedStatus = 'ACTIVE';
            } else {
              computedStatus = 'ABSENT';
            }
          }
        }

        const formattedDate = new Date(normalizedDate).toLocaleDateString('en-US', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        const facultyName = t.facultyId?.userId?.name || (t.facultyId as any)?.name || 'Assigned Faculty';

        return {
          id: existingRecord?._id || t._id,
          timetableId: t._id,
          date: normalizedDate,
          formattedDate,
          dateStr,
          dayOfWeek,
          periodNumber: t.periodNumber,
          slot: t.periodNumber <= 3 ? 'Forenoon' : 'Afternoon',
          startTime: t.startTime,
          endTime: t.endTime,
          biometricTime: verificationTime,
          verificationTime,
          subjectName: t.subjectId?.name || 'Class Subject',
          subjectCode: t.subjectId?.code || 'SUB',
          facultyName,
          markedBy: facultyName,
          classroom: t.classroomId ? `${t.classroomId.building} - ${t.classroomId.roomNumber}` : 'Campus Hall',
          status: computedStatus,
          isPresent: computedStatus === 'PRESENT' || computedStatus === 'LATE',
          isAbsent: computedStatus === 'ABSENT',
          isActive: computedStatus === 'ACTIVE',
          isUpcoming: computedStatus === 'UPCOMING',
          recognitionMethod: existingRecord?.recognitionMethod || (computedStatus === 'ABSENT' ? 'SYSTEM_AUTO_ABSENT' : undefined),
          deviceName,
          isLate: computedStatus === 'LATE',
          isTestMode: Boolean(existingRecord?.isTestMode),
          isCurrent: dateStr === todayStr && nowMinutes >= startMin && nowMinutes <= endMin,
        };
      });

      dayRecords.forEach((r: any) => {
        if (!matchedAttendanceIds.has(r._id.toString())) {
          const facultyName = r.facultyId?.userId?.name || (r.facultyId as any)?.name || 'Assigned Faculty';
          const timeStr = r.timestamp
            ? new Date(r.timestamp).toLocaleTimeString('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : null;
          const formattedDate = new Date(r.date).toLocaleDateString('en-US', {
            timeZone: 'Asia/Kolkata',
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });

          combinedRecords.push({
            id: r._id,
            timetableId: r.timetableId?._id || r.timetableId,
            date: r.date,
            formattedDate,
            dateStr,
            dayOfWeek,
            periodNumber: r.timetableId?.periodNumber || 99,
            slot: 'Forenoon',
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
            isPresent: r.status === 'PRESENT' || r.status === 'LATE',
            isAbsent: r.status === 'ABSENT',
            isActive: false,
            isUpcoming: false,
            recognitionMethod: r.recognitionMethod,
            deviceName: r.deviceId?.deviceName || 'Biometric Scanner',
            isLate: r.status === 'LATE',
            isTestMode: Boolean(r.isTestMode),
            isCurrent: false,
          });
        }
      });

      combinedRecords.sort((a, b) => (a.periodNumber || 0) - (b.periodNumber || 0));

      if (status) {
        combinedRecords = combinedRecords.filter((r) => r.status === status);
      }

      const dayTotal = combinedRecords.length;
      const dayPresent = combinedRecords.filter((r) => r.isPresent).length;
      const dayAbsent = combinedRecords.filter((r) => r.isAbsent).length;
      const dayActive = combinedRecords.filter((r) => r.isActive).length;
      const dayUpcoming = combinedRecords.filter((r) => r.isUpcoming).length;

      const [totalAll, presentAll, lateAll, absentAll] = await Promise.all([
        AttendanceRecord.countDocuments({ studentId }),
        AttendanceRecord.countDocuments({ studentId, status: 'PRESENT' }),
        AttendanceRecord.countDocuments({ studentId, status: 'LATE' }),
        AttendanceRecord.countDocuments({ studentId, status: 'ABSENT' }),
      ]);
      const attendedAll = presentAll + lateAll;
      const attendancePercentage = totalAll > 0 ? parseFloat(((attendedAll / totalAll) * 100).toFixed(1)) : null;

      return res.status(200).json({
        success: true,
        data: combinedRecords,
        date: dateStr,
        dayOfWeek,
        daySummary: {
          totalClasses: dayTotal,
          presentCount: dayPresent,
          absentCount: dayAbsent,
          activeCount: dayActive,
          upcomingCount: dayUpcoming,
        },
        summary: {
          attendancePercentage,
          totalEligibleClasses: totalAll,
          presentCount: attendedAll,
          absentCount: absentAll,
          lateCount: lateAll,
        },
        pagination: {
          total: combinedRecords.length,
          page: 1,
          limit: combinedRecords.length,
          totalPages: 1,
        },
      });
    }

    const query: any = { studentId };

    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId as string)) {
      query.subjectId = subjectId;
    }

    if (status && ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'].includes(status as string)) {
      query.status = status;
    }

    if (startDate || endDate) {
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
      AttendanceRecord.countDocuments({ studentId }),
      AttendanceRecord.countDocuments({ studentId, status: 'PRESENT' }),
      AttendanceRecord.countDocuments({ studentId, status: 'LATE' }),
      AttendanceRecord.countDocuments({ studentId, status: 'ABSENT' }),
    ]);

    const attendedAll = presentAll + lateAll;
    const attendancePercentage = totalAll > 0 ? parseFloat(((attendedAll / totalAll) * 100).toFixed(1)) : null;

    const formattedRecords = records.map((r: any) => {
      const periodNum = r.timetableId?.periodNumber || 1;
      const formattedDate = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
      const devName = r.deviceId?.deviceName || r.deviceId?.deviceId || (r.recognitionMethod === 'MANUAL_OVERRIDE' ? 'Admin Override' : 'Biometric Terminal');

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

export const getWardAttendanceSummary = async (req: any, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.studentId;

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
        const pct = sTotal > 0 ? parseFloat(((sAttended / sTotal) * 100).toFixed(1)) : null;

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
          status: pct === null ? 'NO_DATA' : pct >= 75 ? 'SAFE' : pct >= 65 ? 'WARNING' : 'CRITICAL',
        };
      })
    );

    res.status(200).json({
      success: true,
      data: subjectBreakdown.filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};

export const getWardTimetable = async (req: any, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.studentId;
    const student = await Student.findById(studentId);
    if (!student) throw new AppError('Student profile not found.', 404);

    const { date } = req.query;
    const { normalizedDate, dayOfWeek, dateStr } = normalizeCalendarDate(date as string | undefined);

    const timetableRecords = await Timetable.find({
      sectionId: student.sectionId,
      date: normalizedDate,
    })
      .sort({ periodNumber: 1 })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .populate('classroomId')
      .lean();

    // Look up attendance records for this ward on this date
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
        if (dateStr > todayStr) {
          computedStatus = 'UPCOMING';
        } else if (dateStr < todayStr) {
          computedStatus = 'ABSENT';
        } else {
          if (nowMinutes < startMin) {
            computedStatus = 'UPCOMING';
          } else if (nowMinutes <= endMin) {
            computedStatus = 'ACTIVE';
          } else {
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

