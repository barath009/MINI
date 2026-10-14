import mongoose from 'mongoose';
import { AttendanceSession, SessionStatus } from '../models/AttendanceSession';
import { Timetable, ITimetable } from '../models/Timetable';
import { SystemSetting } from '../models/SystemSetting';
import { clockService } from './clockService';
import { AttendanceEngine } from './attendanceEngine';
import { emitAttendanceEvent } from './socketService';

export interface CollegePeriod {
  periodNumber: number;
  label: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  sessionPart: 'Forenoon' | 'Afternoon';
}

export interface CollegeScheduleConfig {
  workingHours: { start: string; end: string };
  lunchBreak: { start: string; end: string };
  periods: CollegePeriod[];
  workingDays: string[];
}

export const DEFAULT_COLLEGE_SCHEDULE: CollegeScheduleConfig = {
  workingHours: { start: '09:00', end: '16:00' },
  lunchBreak: { start: '12:00', end: '13:00' },
  periods: [
    { periodNumber: 1, label: 'Hour 1', startTime: '09:00', endTime: '10:00', sessionPart: 'Forenoon' },
    { periodNumber: 2, label: 'Hour 2', startTime: '10:00', endTime: '11:00', sessionPart: 'Forenoon' },
    { periodNumber: 3, label: 'Hour 3', startTime: '11:00', endTime: '12:00', sessionPart: 'Forenoon' },
    { periodNumber: 4, label: 'Hour 4', startTime: '13:00', endTime: '14:00', sessionPart: 'Afternoon' },
    { periodNumber: 5, label: 'Hour 5', startTime: '14:00', endTime: '15:00', sessionPart: 'Afternoon' },
    { periodNumber: 6, label: 'Hour 6', startTime: '15:00', endTime: '16:00', sessionPart: 'Afternoon' },
  ],
  workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
};

const SCHEDULE_SETTING_KEY = 'COLLEGE_SCHEDULE';

export class SessionService {
  /**
   * Retrieves official college schedule settings.
   */
  public static async getCollegeSchedule(): Promise<CollegeScheduleConfig> {
    try {
      const setting = await SystemSetting.findOne({ key: SCHEDULE_SETTING_KEY });
      if (setting && setting.value && setting.value.periods) {
        return setting.value as CollegeScheduleConfig;
      }
    } catch (err) {
      console.error('[SessionService] Error loading schedule, using default:', err);
    }
    return DEFAULT_COLLEGE_SCHEDULE;
  }

  /**
   * Updates college schedule settings (Admin only).
   */
  public static async updateCollegeSchedule(newSchedule: Partial<CollegeScheduleConfig>, adminId?: string): Promise<CollegeScheduleConfig> {
    const updated = {
      ...DEFAULT_COLLEGE_SCHEDULE,
      ...newSchedule,
    };
    await SystemSetting.findOneAndUpdate(
      { key: SCHEDULE_SETTING_KEY },
      {
        key: SCHEDULE_SETTING_KEY,
        value: updated,
        description: 'Institutional working hours and period timings configuration',
        updatedAt: new Date(),
        updatedBy: adminId,
      },
      { upsert: true, new: true }
    );
    return updated;
  }

  /**
   * Check if a given time is during lunch break.
   */
  public static isLunchTime(timeStr: string): boolean {
    const [h, m] = timeStr.split(':').map(Number);
    const mins = h * 60 + m;
    return mins >= 12 * 60 && mins < 13 * 60;
  }

  /**
   * Normalize any date to start of UTC day for calendar date comparison.
   */
  public static normalizeDate(d: Date | string): Date {
    const date = new Date(d);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Idempotently create or retrieve an AttendanceSession for a scheduled class on its specific date.
   */
  public static async ensureSessionForScheduledClass(classEntry: any): Promise<any> {
    const classDate = this.normalizeDate(classEntry.date);
    const effectiveNow = clockService.getEffectiveNow();
    const effectiveDate = this.normalizeDate(effectiveNow);

    // Unique deterministic sessionId
    const ymd = classDate.toISOString().slice(0, 10).replace(/-/g, '');
    const sessionId = `SESS_${ymd}_P${classEntry.periodNumber}_${classEntry.sectionId?._id || classEntry.sectionId}`;

    let session = await AttendanceSession.findOne({
      timetableId: classEntry._id,
      date: classDate,
    });

    if (!session) {
      session = await AttendanceSession.findOne({ sessionId });
    }

    // Determine initial status based on effective clock
    let status: SessionStatus = 'SCHEDULED';
    if (classEntry.status === 'CANCELLED') {
      status = 'CANCELLED';
    } else if (classDate.getTime() < effectiveDate.getTime()) {
      status = 'COMPLETED';
    } else if (classDate.getTime() === effectiveDate.getTime()) {
      const nowH = effectiveNow.getHours();
      const nowM = effectiveNow.getMinutes();
      const nowMins = nowH * 60 + nowM;

      const [sh, sm] = classEntry.startTime.split(':').map(Number);
      const [eh, em] = classEntry.endTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      if (nowMins > endMins) {
        status = 'COMPLETED';
      } else if (nowMins >= startMins) {
        status = 'ACTIVE';
      } else {
        status = 'SCHEDULED';
      }
    } else {
      // Future date
      status = 'SCHEDULED';
    }

    if (session) {
      session.subjectId = classEntry.subjectId?._id || classEntry.subjectId;
      session.facultyId = classEntry.facultyId?._id || classEntry.facultyId;
      session.sectionId = classEntry.sectionId?._id || classEntry.sectionId;
      session.classroomId = classEntry.classroomId?._id || classEntry.classroomId;
      session.startTime = classEntry.startTime;
      session.endTime = classEntry.endTime;
      session.periodNumber = classEntry.periodNumber;
      session.academicYear = classEntry.academicYear;
      session.semester = classEntry.semester;
      if (classEntry.status === 'CANCELLED') {
        session.status = 'CANCELLED';
      }
      await session.save();
      return session;
    }

    try {
      session = await AttendanceSession.create({
        sessionId,
        timetableId: classEntry._id,
        periodNumber: classEntry.periodNumber,
        subjectId: classEntry.subjectId?._id || classEntry.subjectId,
        facultyId: classEntry.facultyId?._id || classEntry.facultyId,
        sectionId: classEntry.sectionId?._id || classEntry.sectionId,
        classroomId: classEntry.classroomId?._id || classEntry.classroomId,
        date: classDate,
        startTime: classEntry.startTime,
        endTime: classEntry.endTime,
        status,
        gracePeriodMinutes: 10,
        academicYear: classEntry.academicYear,
        semester: classEntry.semester,
      });
      return session;
    } catch (err: any) {
      if (err.code === 11000) {
        return AttendanceSession.findOne({ sessionId });
      }
      throw err;
    }
  }

  /**
   * Synchronize session statuses according to centralized effective application clock.
   * - Transitions SCHEDULED -> ACTIVE when start time is reached.
   * - Transitions ACTIVE -> COMPLETED when end time has passed, finalizing unscanned students as ABSENT.
   */
  public static async syncSessionStatuses(): Promise<{ activated: number; finalized: number }> {
    const effectiveNow = clockService.getEffectiveNow();
    const effectiveDate = this.normalizeDate(effectiveNow);

    const nowH = effectiveNow.getHours();
    const nowM = effectiveNow.getMinutes();
    const nowMins = nowH * 60 + nowM;

    let activatedCount = 0;
    let finalizedCount = 0;

    // 1. Activate sessions that should now be running
    const scheduledSessions = await AttendanceSession.find({
      date: effectiveDate,
      status: 'SCHEDULED',
    });

    for (const sess of scheduledSessions) {
      const [sh, sm] = sess.startTime.split(':').map(Number);
      const [eh, em] = sess.endTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;

      if (nowMins >= startMins && nowMins <= endMins) {
        sess.status = 'ACTIVE';
        await sess.save();
        activatedCount++;
        emitAttendanceEvent('session.started', { sessionId: sess.sessionId, status: 'ACTIVE' }, sess.sessionId);
      } else if (nowMins > endMins) {
        // Class already ended before server noticed
        await AttendanceEngine.completeSessionAndMarkAbsent(sess._id);
        finalizedCount++;
      }
    }

    // 2. Finalize active sessions that have reached or passed their end time
    const activeSessions = await AttendanceSession.find({
      date: effectiveDate,
      status: 'ACTIVE',
    });

    for (const sess of activeSessions) {
      const [eh, em] = sess.endTime.split(':').map(Number);
      const endMins = eh * 60 + em;

      if (nowMins >= endMins) {
        await AttendanceEngine.completeSessionAndMarkAbsent(sess._id);
        finalizedCount++;
      }
    }

    // 3. Also finalize any previous day active/scheduled sessions left uncompleted
    const pastPendingSessions = await AttendanceSession.find({
      date: { $lt: effectiveDate },
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
    });

    for (const sess of pastPendingSessions) {
      await AttendanceEngine.completeSessionAndMarkAbsent(sess._id);
      finalizedCount++;
    }

    return { activated: activatedCount, finalized: finalizedCount };
  }
}

export const ensureSessionForScheduledClass = SessionService.ensureSessionForScheduledClass.bind(SessionService);
export const syncSessionStatuses = SessionService.syncSessionStatuses.bind(SessionService);
export const isLunchTime = SessionService.isLunchTime.bind(SessionService);
