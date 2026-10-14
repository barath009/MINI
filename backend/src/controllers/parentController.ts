import { Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ParentWard } from '../models/ParentWard';
import { Student } from '../models/Student';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { ClassAllocation } from '../models/ClassAllocation';
import { Timetable } from '../models/Timetable';
import mongoose from 'mongoose';

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
    const overallPercentage = totalRecords > 0 ? parseFloat(((totalAttended / totalRecords) * 100).toFixed(1)) : 100.0;

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
          const pct = sTotal > 0 ? parseFloat(((sAttended / sTotal) * 100).toFixed(1)) : 100.0;
          return {
            subjectId: subId,
            subjectCode: alloc.subjectId.code,
            subjectName: alloc.subjectId.name,
            facultyName: alloc.facultyId?.userId?.name || 'Staff Member',
            totalClasses: sTotal,
            attendedClasses: sAttended,
            percentage: pct,
            status: pct >= 75 ? 'SAFE' : pct >= 65 ? 'WARNING' : 'CRITICAL',
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
        const wPct = wTotal > 0 ? parseFloat(((wAttended / wTotal) * 100).toFixed(1)) : 100.0;
        return {
          studentId: s._id,
          name: s.userId?.name || 'Student',
          registerNumber: s.registerNumber,
          rollNumber: s.rollNumber,
          department: s.departmentId?.name,
          section: s.sectionId?.name,
          relationship: wl.relationship,
          overallPercentage: wPct,
          statusBadge: wPct >= 75 ? 'SAFE' : 'WARNING',
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
          isLowAttendance: overallPercentage < 75,
          statusBadge: overallPercentage >= 75 ? 'SAFE' : 'WARNING',
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
        const pct = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 100.0;

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
          statusBadge: pct >= 75 ? 'SAFE' : 'WARNING',
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
    const { month, subjectId, status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const query: any = { studentId };

    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId as string)) {
      query.subjectId = subjectId;
    }

    if (status && ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'].includes(status as string)) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    } else if (month) {
      // Month format: YYYY-MM
      const [yearStr, monthStr] = (month as string).split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const startMonth = new Date(y, m, 1);
      const endMonth = new Date(y, m + 1, 0, 23, 59, 59);
      query.date = { $gte: startMonth, $lte: endMonth };
    }

    const [records, total] = await Promise.all([
      AttendanceRecord.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('subjectId')
        .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
        .populate('classroomId')
        .lean(),
      AttendanceRecord.countDocuments(query),
    ]);

    const formattedRecords = records.map((r: any) => ({
      id: r._id,
      date: new Date(r.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      biometricTime: new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      subjectName: r.subjectId?.name || 'Class Session',
      subjectCode: r.subjectId?.code || 'SUB',
      facultyName: r.facultyId?.userId?.name || 'Assigned Faculty',
      classroom: r.classroomId ? `${r.classroomId.building} - ${r.classroomId.roomNumber}` : 'Campus Hall',
      status: r.status,
      recognitionMethod: r.recognitionMethod,
      isLate: r.status === 'LATE',
      overrideReason: r.overrideReason,
    }));

    res.status(200).json({
      success: true,
      data: formattedRecords,
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

    const timetableRecords = await Timetable.find({
      sectionId: student.sectionId,
      status: 'ACTIVE',
    })
      .sort({ periodNumber: 1 })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .populate('classroomId')
      .lean();

    const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date().getDay()];

    const grouped: Record<string, any[]> = {};
    daysOfWeek.forEach((day) => {
      grouped[day] = [];
    });

    timetableRecords.forEach((t: any) => {
      if (grouped[t.dayOfWeek]) {
        grouped[t.dayOfWeek].push({
          id: t._id,
          periodNumber: t.periodNumber,
          startTime: t.startTime,
          endTime: t.endTime,
          subjectName: t.subjectId?.name || 'Class Subject',
          subjectCode: t.subjectId?.code || 'SUB',
          facultyName: t.facultyId?.userId?.name || 'Assigned Faculty',
          classroom: t.classroomId ? `${t.classroomId.building} - ${t.classroomId.roomNumber}` : 'Hall',
          classType: 'Theory',
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        currentDay,
        weeklySchedule: grouped,
        hasPublishedTimetable: timetableRecords.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

