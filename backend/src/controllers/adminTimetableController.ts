import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { Timetable } from '../models/Timetable';
import { Section } from '../models/Section';
import { Subject } from '../models/Subject';
import { Faculty } from '../models/Faculty';
import { Classroom } from '../models/Classroom';
import { AttendanceSession } from '../models/AttendanceSession';
import { createAuditLog } from '../services/auditService';
import { emitTimetableUpdate } from '../services/socketService';
import { ensureSessionForScheduledClass } from '../services/sessionService';
import { clockService } from '../services/clockService';

const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// Standard College Period Timings (9:00 AM - 4:00 PM, Lunch 12:00 PM - 1:00 PM)
export const STANDARD_PERIODS: Record<number, { startTime: string; endTime: string; label: string; slot: 'FORENOON' | 'AFTERNOON' }> = {
  1: { startTime: '09:00', endTime: '10:00', label: 'Hour 1 (09:00 - 10:00)', slot: 'FORENOON' },
  2: { startTime: '10:00', endTime: '11:00', label: 'Hour 2 (10:00 - 11:00)', slot: 'FORENOON' },
  3: { startTime: '11:00', endTime: '12:00', label: 'Hour 3 (11:00 - 12:00)', slot: 'FORENOON' },
  4: { startTime: '13:00', endTime: '14:00', label: 'Hour 4 (13:00 - 14:00)', slot: 'AFTERNOON' },
  5: { startTime: '14:00', endTime: '15:00', label: 'Hour 5 (14:00 - 15:00)', slot: 'AFTERNOON' },
  6: { startTime: '15:00', endTime: '16:00', label: 'Hour 6 (15:00 - 16:00)', slot: 'AFTERNOON' },
};

/**
 * Normalizes any date string or Date object to UTC midnight representing the calendar date.
 */
export const normalizeCalendarDate = (input: string | Date | undefined): { normalizedDate: Date; dayOfWeek: string; dateStr: string } => {
  let y: number, m: number, d: number;
  if (!input) {
    const eff = clockService.getEffectiveNow();
    y = eff.getFullYear();
    m = eff.getMonth();
    d = eff.getDate();
  } else if (typeof input === 'string') {
    // If format is YYYY-MM-DD
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      y = parseInt(match[1], 10);
      m = parseInt(match[2], 10) - 1;
      d = parseInt(match[3], 10);
    } else {
      const dt = new Date(input);
      y = dt.getFullYear();
      m = dt.getMonth();
      d = dt.getDate();
    }
  } else {
    y = input.getFullYear();
    m = input.getMonth();
    d = input.getDate();
  }

  const normalizedDate = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const dayOfWeek = DAYS_OF_WEEK[normalizedDate.getUTCDay()];
  const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return { normalizedDate, dayOfWeek, dateStr };
};

export const getAdminTimetable = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { sectionId, date, startDate, endDate, facultyId, classroomId, status } = req.query;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId as string)) {
      query.sectionId = sectionId;
    }
    if (facultyId && mongoose.Types.ObjectId.isValid(facultyId as string)) {
      query.facultyId = facultyId;
    }
    if (classroomId && mongoose.Types.ObjectId.isValid(classroomId as string)) {
      query.classroomId = classroomId;
    }

    let targetDateStr = '';
    let targetDayOfWeek = '';

    if (startDate && endDate) {
      const start = normalizeCalendarDate(startDate as string).normalizedDate;
      const end = normalizeCalendarDate(endDate as string).normalizedDate;
      end.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    } else if (date) {
      const { normalizedDate, dateStr, dayOfWeek } = normalizeCalendarDate(date as string);
      query.date = normalizedDate;
      targetDateStr = dateStr;
      targetDayOfWeek = dayOfWeek;
    } else {
      // Default to today's effective date
      const { normalizedDate, dateStr, dayOfWeek } = normalizeCalendarDate(undefined);
      query.date = normalizedDate;
      targetDateStr = dateStr;
      targetDayOfWeek = dayOfWeek;
    }

    const records = await Timetable.find(query)
      .sort({ periodNumber: 1 })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email phone' } })
      .populate('classroomId')
      .populate({ path: 'sectionId', populate: { path: 'departmentId', select: 'name code' } })
      .lean();

    const formattedRecords = records.map((r: any) => ({
      id: r._id,
      _id: r._id,
      date: r.date,
      dateStr: r.date ? new Date(r.date).toISOString().slice(0, 10) : targetDateStr,
      dayOfWeek: r.dayOfWeek,
      periodNumber: r.periodNumber,
      startTime: r.startTime,
      endTime: r.endTime,
      academicYear: r.academicYear,
      semester: r.semester,
      notes: r.notes || '',
      status: r.status || 'ACTIVE',
      rescheduledTo: r.rescheduledTo,
      subject: r.subjectId
        ? { id: r.subjectId._id, name: r.subjectId.name, code: r.subjectId.code }
        : { name: 'Unknown Subject', code: 'SUB' },
      faculty: r.facultyId
        ? {
            id: r.facultyId._id,
            name: r.facultyId.userId?.name || r.facultyId.name || 'Staff Member',
            employeeId: r.facultyId.employeeId,
          }
        : { name: 'Assigned Staff', employeeId: '' },
      classroom: r.classroomId
        ? {
            id: r.classroomId._id,
            building: r.classroomId.building,
            roomNumber: r.classroomId.roomNumber,
            displayName: `${r.classroomId.building} - ${r.classroomId.roomNumber}`,
          }
        : { displayName: 'Classroom Hall' },
      section: r.sectionId
        ? {
            id: r.sectionId._id,
            name: r.sectionId.name,
            departmentCode: r.sectionId.departmentId?.code || '',
            departmentName: r.sectionId.departmentId?.name || '',
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        date: targetDateStr,
        dayOfWeek: targetDayOfWeek,
        records: formattedRecords,
        totalEntries: formattedRecords.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const assignTimetablePeriod = async (req: any, res: Response, next: NextFunction) => {
  try {
    const {
      date,
      sectionId,
      subjectId,
      facultyId,
      classroomId,
      periodNumber,
      startTime,
      endTime,
      academicYear,
      semester,
      notes,
      status = 'ACTIVE',
    } = req.body;

    if (!sectionId || !subjectId || !facultyId || !classroomId || !periodNumber) {
      throw new AppError('All period parameters (date, section, subject, faculty, classroom, period number) are required.', 400);
    }

    const { normalizedDate, dayOfWeek, dateStr } = normalizeCalendarDate(date);

    const sectionDoc = await Section.findById(sectionId);
    if (!sectionDoc) throw new AppError('Academic section not found.', 404);

    const subjectDoc = await Subject.findById(subjectId);
    if (!subjectDoc) throw new AppError('Subject record not found.', 404);

    const facultyDoc = await Faculty.findById(facultyId).populate('userId');
    if (!facultyDoc) throw new AppError('Faculty member not found.', 404);

    const classroomDoc = await Classroom.findById(classroomId);
    if (!classroomDoc) throw new AppError('Classroom not found.', 404);

    const periodNum = parseInt(periodNumber, 10);
    if (periodNum < 1 || periodNum > 6) {
      throw new AppError('Period number must be between 1 and 6.', 400);
    }

    // Derive or validate start/end time
    const defaultTiming = STANDARD_PERIODS[periodNum];
    const finalStartTime = startTime || defaultTiming?.startTime || '09:00';
    const finalEndTime = endTime || defaultTiming?.endTime || '10:00';

    // 1. Check Faculty Conflict on the same concrete date and period
    const facultyConflict = await Timetable.findOne({
      date: normalizedDate,
      facultyId,
      periodNumber: periodNum,
      sectionId: { $ne: sectionId },
      status: 'ACTIVE',
    })
      .populate('sectionId')
      .populate('subjectId');

    if (facultyConflict) {
      const conflictSecName = (facultyConflict.sectionId as any)?.name || 'another section';
      const facultyName = (facultyDoc.userId as any)?.name || 'This faculty';
      throw new AppError(
        `Faculty conflict: ${facultyName} is already assigned to Period ${periodNum} on ${dateStr} (${dayOfWeek}) in Section ${conflictSecName}.`,
        409
      );
    }

    // 2. Check Classroom Conflict on the same concrete date and period
    const roomConflict = await Timetable.findOne({
      date: normalizedDate,
      classroomId,
      periodNumber: periodNum,
      sectionId: { $ne: sectionId },
      status: 'ACTIVE',
    }).populate('sectionId');

    if (roomConflict) {
      const conflictSecName = (roomConflict.sectionId as any)?.name || 'another section';
      throw new AppError(
        `Classroom conflict: Room ${classroomDoc.roomNumber} is already occupied during Period ${periodNum} on ${dateStr} (${dayOfWeek}) by Section ${conflictSecName}.`,
        409
      );
    }

    // 3. Check Section Slot Conflict on the same concrete date and period
    let timetableEntry = await Timetable.findOne({
      date: normalizedDate,
      sectionId,
      periodNumber: periodNum,
    });

    if (timetableEntry) {
      timetableEntry.subjectId = subjectId;
      timetableEntry.facultyId = facultyId;
      timetableEntry.classroomId = classroomId;
      timetableEntry.dayOfWeek = dayOfWeek as any;
      timetableEntry.startTime = finalStartTime;
      timetableEntry.endTime = finalEndTime;
      timetableEntry.academicYear = academicYear || sectionDoc.academicYear || '2026-2027';
      timetableEntry.semester = semester || sectionDoc.semester || 1;
      timetableEntry.notes = notes || '';
      timetableEntry.status = status;
      await timetableEntry.save();
    } else {
      timetableEntry = await Timetable.create({
        date: normalizedDate,
        dayOfWeek: dayOfWeek as any,
        sectionId,
        subjectId,
        facultyId,
        classroomId,
        periodNumber: periodNum,
        startTime: finalStartTime,
        endTime: finalEndTime,
        academicYear: academicYear || sectionDoc.academicYear || '2026-2027',
        semester: semester || sectionDoc.semester || 1,
        notes: notes || '',
        status,
      });
    }

    // Automatically ensure attendance session exists for this scheduled class
    await ensureSessionForScheduledClass(timetableEntry);

    const populated = await Timetable.findById(timetableEntry._id)
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email phone' } })
      .populate('classroomId')
      .populate('sectionId');

    // Audit Log
    await createAuditLog(
      req.user._id,
      'ASSIGN_TIMETABLE_PERIOD',
      'Timetable',
      timetableEntry._id.toString(),
      {
        date: dateStr,
        dayOfWeek,
        section: sectionDoc.name,
        subject: subjectDoc.name,
        periodNumber: periodNum,
        status,
      },
      req.ip
    );

    // Live Socket Broadcast
    emitTimetableUpdate({
      action: 'ASSIGN_PERIOD',
      sectionId,
      date: dateStr,
      dayOfWeek,
      entry: populated,
    });

    res.status(201).json({
      success: true,
      message: `Period ${periodNum} successfully scheduled for Section ${sectionDoc.name} on ${dayOfWeek}, ${dateStr}.`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTimetablePeriod = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      date,
      subjectId,
      facultyId,
      classroomId,
      startTime,
      endTime,
      periodNumber,
      notes,
      status,
      rescheduledTo,
    } = req.body;

    const entry = await Timetable.findById(id);
    if (!entry) throw new AppError('Timetable slot not found.', 404);

    let targetDate = entry.date;
    let targetDayOfWeek = entry.dayOfWeek;

    if (date) {
      const parsed = normalizeCalendarDate(date);
      targetDate = parsed.normalizedDate;
      targetDayOfWeek = parsed.dayOfWeek as any;
    }

    const periodNum = periodNumber ? parseInt(periodNumber, 10) : entry.periodNumber;

    // Validate faculty conflict if changed or date/period changed
    const targetFacultyId = facultyId || entry.facultyId;
    if (status !== 'CANCELLED') {
      const facultyConflict = await Timetable.findOne({
        _id: { $ne: entry._id },
        date: targetDate,
        facultyId: targetFacultyId,
        periodNumber: periodNum,
        status: 'ACTIVE',
      });
      if (facultyConflict) {
        throw new AppError(`Faculty is already assigned to another class during Period ${periodNum} on that date.`, 409);
      }

      // Validate classroom conflict
      const targetClassroomId = classroomId || entry.classroomId;
      const roomConflict = await Timetable.findOne({
        _id: { $ne: entry._id },
        date: targetDate,
        classroomId: targetClassroomId,
        periodNumber: periodNum,
        status: 'ACTIVE',
      });
      if (roomConflict) {
        throw new AppError(`Classroom is already booked during Period ${periodNum} on that date.`, 409);
      }
    }

    if (date) {
      entry.date = targetDate;
      entry.dayOfWeek = targetDayOfWeek as any;
    }
    if (subjectId) entry.subjectId = subjectId;
    if (facultyId) entry.facultyId = facultyId;
    if (classroomId) entry.classroomId = classroomId;
    if (startTime) entry.startTime = startTime;
    if (endTime) entry.endTime = endTime;
    if (periodNumber) entry.periodNumber = periodNum;
    if (notes !== undefined) entry.notes = notes;
    if (status) entry.status = status;
    if (rescheduledTo) entry.rescheduledTo = rescheduledTo;

    await entry.save();

    // Sync linked session status
    if (status === 'CANCELLED') {
      await AttendanceSession.updateMany(
        { timetableId: entry._id },
        { status: 'CANCELLED' }
      );
    } else {
      await ensureSessionForScheduledClass(entry);
    }

    const populated = await Timetable.findById(entry._id)
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email phone' } })
      .populate('classroomId')
      .populate('sectionId');

    await createAuditLog(req.user._id, 'UPDATE_TIMETABLE_PERIOD', 'Timetable', id, req.body, req.ip);

    emitTimetableUpdate({
      action: 'UPDATE_PERIOD',
      sectionId: entry.sectionId,
      date: targetDate ? new Date(targetDate).toISOString().slice(0, 10) : undefined,
      dayOfWeek: targetDayOfWeek,
      entry: populated,
    });

    res.status(200).json({
      success: true,
      message: 'Timetable period updated successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTimetablePeriod = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const entry = await Timetable.findById(id);
    if (!entry) throw new AppError('Timetable slot not found.', 404);

    const sectionId = entry.sectionId;
    const dateStr = entry.date ? new Date(entry.date).toISOString().slice(0, 10) : '';
    const dayOfWeek = entry.dayOfWeek;
    const periodNum = entry.periodNumber;

    // Delete or cancel linked session
    await AttendanceSession.deleteMany({ timetableId: entry._id, status: { $in: ['SCHEDULED', 'UPCOMING'] } });

    await Timetable.findByIdAndDelete(id);

    await createAuditLog(req.user._id, 'DELETE_TIMETABLE_PERIOD', 'Timetable', id, { sectionId, dateStr, dayOfWeek, periodNum }, req.ip);

    emitTimetableUpdate({
      action: 'DELETE_PERIOD',
      id,
      sectionId,
      date: dateStr,
      dayOfWeek,
      periodNumber: periodNum,
    });

    res.status(200).json({
      success: true,
      message: 'Timetable period slot removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};