import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { Timetable } from '../models/Timetable';
import { Section } from '../models/Section';
import { Subject } from '../models/Subject';
import { Faculty } from '../models/Faculty';
import { Classroom } from '../models/Classroom';
import { createAuditLog } from '../services/auditService';
import { emitTimetableUpdate } from '../services/socketService';

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const getAdminTimetable = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { sectionId, dayOfWeek } = req.query;

    const query: any = { status: 'ACTIVE' };
    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId as string)) {
      query.sectionId = sectionId;
    }
    if (dayOfWeek && DAYS_OF_WEEK.includes((dayOfWeek as string).toUpperCase())) {
      query.dayOfWeek = (dayOfWeek as string).toUpperCase();
    }

    const records = await Timetable.find(query)
      .sort({ dayOfWeek: 1, periodNumber: 1 })
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email phone' } })
      .populate('classroomId')
      .populate({ path: 'sectionId', populate: { path: 'departmentId', select: 'name code' } })
      .lean();

    const groupedSchedule: Record<string, any[]> = {};
    DAYS_OF_WEEK.forEach((d) => {
      groupedSchedule[d] = [];
    });

    records.forEach((r: any) => {
      if (groupedSchedule[r.dayOfWeek]) {
        groupedSchedule[r.dayOfWeek].push({
          id: r._id,
          _id: r._id,
          dayOfWeek: r.dayOfWeek,
          periodNumber: r.periodNumber,
          startTime: r.startTime,
          endTime: r.endTime,
          academicYear: r.academicYear,
          semester: r.semester,
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
              }
            : null,
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        records,
        groupedSchedule,
        totalEntries: records.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const assignTimetablePeriod = async (req: any, res: Response, next: NextFunction) => {
  try {
    const {
      sectionId,
      subjectId,
      facultyId,
      classroomId,
      dayOfWeek,
      periodNumber,
      startTime,
      endTime,
      academicYear,
      semester,
    } = req.body;

    if (!sectionId || !subjectId || !facultyId || !classroomId || !dayOfWeek || !periodNumber || !startTime || !endTime) {
      throw new AppError('All period parameters (section, subject, faculty, classroom, day, period, timings) are required.', 400);
    }

    const formattedDay = dayOfWeek.toUpperCase();
    if (!DAYS_OF_WEEK.includes(formattedDay)) {
      throw new AppError('Invalid day of week. Must be MONDAY through SATURDAY.', 400);
    }

    const sectionDoc = await Section.findById(sectionId);
    if (!sectionDoc) throw new AppError('Academic section not found.', 404);

    const subjectDoc = await Subject.findById(subjectId);
    if (!subjectDoc) throw new AppError('Subject record not found.', 404);

    const facultyDoc = await Faculty.findById(facultyId);
    if (!facultyDoc) throw new AppError('Faculty member not found.', 404);

    const classroomDoc = await Classroom.findById(classroomId);
    if (!classroomDoc) throw new AppError('Classroom not found.', 404);

    const periodNum = parseInt(periodNumber, 10);

    // 1. Check Faculty Conflict (same day, same period, different section)
    const facultyConflict = await Timetable.findOne({
      facultyId,
      dayOfWeek: formattedDay,
      periodNumber: periodNum,
      sectionId: { $ne: sectionId },
      status: 'ACTIVE',
    })
      .populate('sectionId')
      .populate('subjectId');

    if (facultyConflict) {
      const conflictSecName = (facultyConflict.sectionId as any)?.name || 'another section';
      throw new AppError(
        `Faculty conflict: This faculty is already assigned to Period ${periodNum} on ${formattedDay} in Section ${conflictSecName}.`,
        409
      );
    }

    // 2. Check Classroom Conflict (same day, same period, different section)
    const roomConflict = await Timetable.findOne({
      classroomId,
      dayOfWeek: formattedDay,
      periodNumber: periodNum,
      sectionId: { $ne: sectionId },
      status: 'ACTIVE',
    }).populate('sectionId');

    if (roomConflict) {
      const conflictSecName = (roomConflict.sectionId as any)?.name || 'another section';
      throw new AppError(
        `Room conflict: Classroom ${classroomDoc.roomNumber} is already occupied during Period ${periodNum} on ${formattedDay} by Section ${conflictSecName}.`,
        409
      );
    }

    // 3. Check Section Slot (upsert if existing slot for this section at that day and period)
    let timetableEntry = await Timetable.findOne({
      sectionId,
      dayOfWeek: formattedDay,
      periodNumber: periodNum,
      status: 'ACTIVE',
    });

    if (timetableEntry) {
      timetableEntry.subjectId = subjectId;
      timetableEntry.facultyId = facultyId;
      timetableEntry.classroomId = classroomId;
      timetableEntry.startTime = startTime;
      timetableEntry.endTime = endTime;
      timetableEntry.academicYear = academicYear || sectionDoc.academicYear || '2026-2027';
      timetableEntry.semester = semester || sectionDoc.semester || 1;
      await timetableEntry.save();
    } else {
      timetableEntry = await Timetable.create({
        sectionId,
        subjectId,
        facultyId,
        classroomId,
        dayOfWeek: formattedDay,
        periodNumber: periodNum,
        startTime,
        endTime,
        academicYear: academicYear || sectionDoc.academicYear || '2026-2027',
        semester: semester || sectionDoc.semester || 1,
        status: 'ACTIVE',
      });
    }

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
        section: sectionDoc.name,
        subject: subjectDoc.name,
        dayOfWeek: formattedDay,
        periodNumber: periodNum,
      },
      req.ip
    );

    // Live Socket Broadcast
    emitTimetableUpdate({
      action: 'ASSIGN_PERIOD',
      sectionId,
      dayOfWeek: formattedDay,
      entry: populated,
    });

    res.status(201).json({
      success: true,
      message: `Period ${periodNum} successfully scheduled for Section ${sectionDoc.name} on ${formattedDay}.`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTimetablePeriod = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { subjectId, facultyId, classroomId, startTime, endTime, dayOfWeek, periodNumber } = req.body;

    const entry = await Timetable.findById(id);
    if (!entry) throw new AppError('Timetable slot not found.', 404);

    const formattedDay = dayOfWeek ? dayOfWeek.toUpperCase() : entry.dayOfWeek;
    const periodNum = periodNumber ? parseInt(periodNumber, 10) : entry.periodNumber;

    if (facultyId && (facultyId !== entry.facultyId?.toString() || periodNum !== entry.periodNumber || formattedDay !== entry.dayOfWeek)) {
      const conflict = await Timetable.findOne({
        _id: { $ne: entry._id },
        facultyId,
        dayOfWeek: formattedDay,
        periodNumber: periodNum,
        status: 'ACTIVE',
      });
      if (conflict) {
        throw new AppError(`Faculty is already assigned to another class during Period ${periodNum} on ${formattedDay}.`, 409);
      }
    }

    if (classroomId && (classroomId !== entry.classroomId?.toString() || periodNum !== entry.periodNumber || formattedDay !== entry.dayOfWeek)) {
      const conflict = await Timetable.findOne({
        _id: { $ne: entry._id },
        classroomId,
        dayOfWeek: formattedDay,
        periodNumber: periodNum,
        status: 'ACTIVE',
      });
      if (conflict) {
        throw new AppError(`Classroom is already booked during Period ${periodNum} on ${formattedDay}.`, 409);
      }
    }

    if (subjectId) entry.subjectId = subjectId;
    if (facultyId) entry.facultyId = facultyId;
    if (classroomId) entry.classroomId = classroomId;
    if (startTime) entry.startTime = startTime;
    if (endTime) entry.endTime = endTime;
    if (dayOfWeek) entry.dayOfWeek = formattedDay;
    if (periodNumber) entry.periodNumber = periodNum;

    await entry.save();

    const populated = await Timetable.findById(entry._id)
      .populate('subjectId')
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email phone' } })
      .populate('classroomId')
      .populate('sectionId');

    await createAuditLog(req.user._id, 'UPDATE_TIMETABLE_PERIOD', 'Timetable', id, req.body, req.ip);

    emitTimetableUpdate({
      action: 'UPDATE_PERIOD',
      sectionId: entry.sectionId,
      dayOfWeek: formattedDay,
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
    const dayOfWeek = entry.dayOfWeek;
    const periodNum = entry.periodNumber;

    await Timetable.findByIdAndDelete(id);

    await createAuditLog(req.user._id, 'DELETE_TIMETABLE_PERIOD', 'Timetable', id, { sectionId, dayOfWeek, periodNum }, req.ip);

    emitTimetableUpdate({
      action: 'DELETE_PERIOD',
      id,
      sectionId,
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