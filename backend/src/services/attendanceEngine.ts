import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import { IoTDevice } from '../models/IoTDevice';
import { AttendanceSession } from '../models/AttendanceSession';
import { Student } from '../models/Student';
import { ClassAllocation } from '../models/ClassAllocation';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { RecognitionEvent, RecognitionResult } from '../models/RecognitionEvent';
import { ParentWard } from '../models/ParentWard';
import { User } from '../models/User';
import { FaceClient, FaceRecognitionResult } from './faceClient';
import { emitAttendanceEvent } from './socketService';
import { createNotification } from './notificationService';
import { clockService } from './clockService';
import { SessionService } from './sessionService';
import { config } from '../config';

export interface ProcessRecognizeInput {
  deviceId: string;
  eventId: string;
  timestamp?: string;
  image?: string;
  imagePath?: string;
  mockStudentRegisterNumber?: string;
}

export class AttendanceEngine {
  public static async processRecognition(input: ProcessRecognizeInput) {
    const { deviceId, eventId, image, imagePath, mockStudentRegisterNumber } = input;

    // 1. Idempotency Check: Don't process duplicate event IDs
    const existingEvent = await RecognitionEvent.findOne({ eventId });
    if (existingEvent) {
      return {
        success: false,
        message: 'Duplicate event ID ignored by attendance engine.',
        errorCode: 'EVENT_DUPLICATE',
        data: { eventId, result: existingEvent.result },
      };
    }

    // 2. Validate Device
    const device = await IoTDevice.findOne({ deviceId });
    if (!device) {
      throw new AppError(`Device '${deviceId}' not found in registry.`, 401, 'DEVICE_UNAUTHORIZED');
    }
    if (device.status === 'OFFLINE' || device.status === 'MAINTENANCE') {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        faceDetected: false,
        faceCount: 0,
        livenessPassed: false,
        result: 'UNAUTHORIZED_DEVICE',
        failureReason: `Device is in status: ${device.status}`,
      });
      throw new AppError(`Device '${deviceId}' is ${device.status}.`, 403, 'DEVICE_OFFLINE');
    }

    // Update Device heartbeat timestamp
    device.lastHeartbeat = clockService.getRealNow();
    device.status = 'ONLINE';
    await device.save();

    // 3. Centralized Application Clock & Session Time Validation
    const effectiveNow = clockService.getEffectiveNow();
    const effectiveTimeStr = `${String(effectiveNow.getHours()).padStart(2, '0')}:${String(effectiveNow.getMinutes()).padStart(2, '0')}`;
    const effectiveDate = SessionService.normalizeDate(effectiveNow);

    // Reject scans during institutional lunch break (12:00 PM - 1:00 PM)
    if (SessionService.isLunchTime(effectiveTimeStr)) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        faceDetected: false,
        faceCount: 0,
        livenessPassed: false,
        result: 'SESSION_INACTIVE',
        failureReason: 'Biometric scan attempted during institutional lunch break (12:00 PM - 1:00 PM).',
      });
      return {
        success: false,
        message: 'Campus is currently on lunch break (12:00 PM - 1:00 PM). No class attendance session is active.',
        errorCode: 'LUNCH_BREAK_SCAN_REJECTED',
      };
    }

    // Validate Active Session for this classroom on the effective date
    const activeSession = await AttendanceSession.findOne({
      classroomId: device.classroomId,
      date: effectiveDate,
      status: 'ACTIVE',
    })
      .populate('subjectId')
      .populate('facultyId')
      .populate('timetableId');

    if (!activeSession) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        faceDetected: false,
        faceCount: 0,
        livenessPassed: false,
        result: 'SESSION_INACTIVE',
        failureReason: `No ACTIVE attendance session found in classroom for date ${effectiveDate.toISOString().slice(0, 10)}.`,
      });
      return {
        success: false,
        message: 'No active class session currently running in this classroom for the scheduled date and time.',
        errorCode: 'SESSION_INACTIVE',
      };
    }

    // 4. Call Face Recognition Microservice
    const faceResult: FaceRecognitionResult = await FaceClient.recognizeFace({
      image,
      imagePath,
      mockRegisterNumber: mockStudentRegisterNumber,
    });

    // 5. Evaluate Face Recognition & Liveness Rules
    if (!faceResult.faceDetected) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        faceDetected: false,
        faceCount: 0,
        livenessPassed: false,
        result: 'NO_FACE_DETECTED',
        failureReason: faceResult.reason || 'No face detected in camera frame.',
      });
      return {
        success: false,
        message: 'No human face detected in frame.',
        errorCode: 'FACE_NOT_DETECTED',
      };
    }

    if (faceResult.faceCount > 1) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        faceDetected: true,
        faceCount: faceResult.faceCount,
        livenessPassed: false,
        result: 'MULTIPLE_FACES',
        failureReason: 'Multiple faces detected in single frame.',
      });
      return {
        success: false,
        message: 'Multiple faces detected. Please frame one student at a time.',
        errorCode: 'MULTIPLE_FACES',
      };
    }

    if (!faceResult.livenessPassed) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        faceDetected: true,
        faceCount: 1,
        confidence: faceResult.confidence,
        qualityScore: faceResult.qualityScore,
        livenessPassed: false,
        result: 'LIVENESS_FAILED',
        failureReason: faceResult.reason || 'Anti-spoofing liveness check failed.',
      });
      return {
        success: false,
        message: 'Liveness check failed. Anti-spoofing protection activated.',
        errorCode: 'LIVENESS_FAILED',
      };
    }

    if (!faceResult.matched || !faceResult.registerNumber) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        faceDetected: true,
        faceCount: 1,
        confidence: faceResult.confidence,
        qualityScore: faceResult.qualityScore,
        livenessPassed: true,
        result: 'UNKNOWN_FACE',
        failureReason: faceResult.reason || 'Face did not match any enrolled student.',
      });
      return {
        success: false,
        message: 'Unrecognized face. Student biometric profile not found.',
        errorCode: 'FACE_UNKNOWN',
      };
    }

    if (faceResult.confidence < config.recognitionThreshold) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        faceDetected: true,
        faceCount: 1,
        confidence: faceResult.confidence,
        qualityScore: faceResult.qualityScore,
        livenessPassed: true,
        result: 'LOW_CONFIDENCE',
        failureReason: `Confidence score ${faceResult.confidence.toFixed(2)} is below required threshold ${config.recognitionThreshold}`,
      });
      return {
        success: false,
        message: 'Match confidence below security threshold. Please re-position face.',
        errorCode: 'FACE_LOW_CONFIDENCE',
      };
    }

    // 6. Resolve Student & Verify Allocation to Session
    const student = await Student.findOne({ registerNumber: faceResult.registerNumber, status: 'ACTIVE' }).populate(
      'userId'
    );

    if (!student) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        faceDetected: true,
        faceCount: 1,
        confidence: faceResult.confidence,
        livenessPassed: true,
        result: 'STUDENT_NOT_ALLOCATED',
        failureReason: `Student with register number '${faceResult.registerNumber}' not found or inactive.`,
      });
      return {
        success: false,
        message: `Student account '${faceResult.registerNumber}' is inactive or invalid.`,
        errorCode: 'STUDENT_NOT_FOUND',
      };
    }

    // Verify Student allocation to this section or staff member
    const isEnrolledInSection = activeSession.sectionId && student.sectionId?.toString() === activeSession.sectionId.toString();
    const allocation = await ClassAllocation.findOne({
      studentId: student._id,
      facultyId: (activeSession.facultyId as any)?._id || activeSession.facultyId,
      status: 'ACTIVE',
    });

    if (!isEnrolledInSection && !allocation) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        studentId: student._id,
        faceDetected: true,
        faceCount: 1,
        confidence: faceResult.confidence,
        livenessPassed: true,
        result: 'STUDENT_NOT_ALLOCATED',
        failureReason: `Student '${student.registerNumber}' is not enrolled in this section or allocated to this class.`,
      });
      return {
        success: false,
        message: `Student ${student.registerNumber} is not enrolled in this section or allocated to this class session.`,
        errorCode: 'ATTENDANCE_REJECTED',
      };
    }

    // 7. Check for duplicate attendance record in this session
    const existingRecord = await AttendanceRecord.findOne({
      studentId: student._id,
      sessionId: activeSession._id,
    });

    if (existingRecord) {
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        studentId: student._id,
        faceDetected: true,
        faceCount: 1,
        confidence: faceResult.confidence,
        livenessPassed: true,
        result: 'SUCCESS',
        failureReason: 'Attendance already recorded for this session',
      });
      return {
        success: false,
        message: `Attendance already recorded for student ${student.registerNumber} in this session.`,
        errorCode: 'ATTENDANCE_DUPLICATE',
        data: {
          attendanceId: existingRecord._id,
          status: existingRecord.status,
          timestamp: existingRecord.timestamp,
        },
      };
    }

    // 8. Calculate Attendance Status (PRESENT vs LATE based on grace period from effective time)
    const [startH, startM] = activeSession.startTime.split(':').map(Number);
    const sessionStartTime = new Date(activeSession.date);
    sessionStartTime.setHours(startH, startM, 0, 0);

    const graceEndTime = new Date(sessionStartTime.getTime() + activeSession.gracePeriodMinutes * 60 * 1000);
    const attendanceStatus = effectiveNow <= graceEndTime ? 'PRESENT' : 'LATE';

    const realNow = clockService.getRealNow();
    const isTestMode = clockService.getStatus().mode === 'TEST_MODE';

    // 9. Atomic Create Attendance Record
    try {
      const attendanceRecord = await AttendanceRecord.create({
        studentId: student._id,
        sessionId: activeSession._id,
        timetableId: activeSession.timetableId?._id || activeSession.timetableId,
        subjectId: (activeSession.subjectId as any)?._id || activeSession.subjectId,
        facultyId: (activeSession.facultyId as any)?._id || activeSession.facultyId,
        sectionId: activeSession.sectionId,
        classroomId: activeSession.classroomId,
        deviceId: device._id,
        date: activeSession.date,
        timestamp: effectiveNow,
        realTimestamp: realNow,
        isTestMode,
        status: attendanceStatus,
        markedBy: 'SYSTEM',
        recognitionMethod: 'FACE_RECOGNITION',
        confidenceScore: faceResult.confidence,
        eventId,
      });

      // Log successful recognition event (audit preserves real physical server timestamp)
      await this.logRecognitionEvent({
        eventId,
        deviceId,
        studentId: student._id,
        faceDetected: true,
        faceCount: 1,
        confidence: faceResult.confidence,
        qualityScore: faceResult.qualityScore,
        livenessPassed: true,
        result: 'SUCCESS',
      });

      const userDoc = student.userId as any;
      const facultyUserDoc = (activeSession.facultyId as any)?.userId;

      // Find parents linked to this student to emit real-time event
      const parentLinks = await ParentWard.find({ student: student._id, status: 'ACTIVE' }).select('parent');
      const parentUserIds = parentLinks.map((p) => p.parent?.toString()).filter(Boolean);

      // Notification string
      const timeString = effectiveNow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Create student notification
      await createNotification(
        userDoc._id,
        'Attendance Recorded',
        `Attendance recorded as ${attendanceStatus} at ${timeString} for ${(activeSession.subjectId as any).name}. Verified via ${device.deviceName}.`,
        'ATTENDANCE_MARKED',
        'LOW',
        { sessionId: activeSession.sessionId, status: attendanceStatus }
      );

      // Emit Real-time Socket.IO Event with device metadata and effective timestamp
      emitAttendanceEvent(
        'attendance.created',
        {
          attendanceId: attendanceRecord._id,
          sessionId: activeSession.sessionId,
          student: {
            id: student._id,
            name: userDoc.name,
            registerNumber: student.registerNumber,
            rollNumber: student.rollNumber,
          },
          subject: (activeSession.subjectId as any)?.name,
          subjectCode: (activeSession.subjectId as any)?.code,
          status: attendanceStatus,
          timestamp: effectiveNow,
          realTimestamp: realNow,
          isTestMode,
          deviceName: device.deviceName,
          deviceId: device.deviceId,
          classroomName: activeSession.classroomId ? 'MZ Classroom 101' : 'Classroom',
          confidence: faceResult.confidence,
          recognitionMethod: 'FACE_RECOGNITION',
        },
        activeSession.sessionId,
        facultyUserDoc?.toString(),
        userDoc._id.toString(),
        parentUserIds
      );

      return {
        success: true,
        message: `Attendance recorded successfully (${attendanceStatus})`,
        data: {
          attendanceId: attendanceRecord._id,
          studentName: userDoc.name,
          registerNumber: student.registerNumber,
          status: attendanceStatus,
          timestamp: effectiveNow,
          deviceName: device.deviceName,
          isTestMode,
          confidence: faceResult.confidence,
        },
      };
    } catch (err: any) {
      if (err.code === 11000) {
        return {
          success: false,
          message: 'Attendance already recorded (Concurrent request protected by unique index)',
          errorCode: 'ATTENDANCE_DUPLICATE',
        };
      }
      throw err;
    }
  }

  public static async completeSessionAndMarkAbsent(sessionId: string | mongoose.Types.ObjectId) {
    const session = await AttendanceSession.findById(sessionId);
    if (!session || session.status === 'COMPLETED') return;

    const effectiveNow = clockService.getEffectiveNow();
    const realNow = clockService.getRealNow();
    const isTestMode = clockService.getStatus().mode === 'TEST_MODE';

    // Find all allocated/enrolled students for this section or subject
    const allocations = await ClassAllocation.find({
      $or: [
        { sectionId: session.sectionId },
        { subjectId: session.subjectId, sectionId: session.sectionId },
      ],
      status: 'ACTIVE',
    });

    let studentIds = allocations.map((a: any) => a.studentId.toString());

    // Also include any students whose student.sectionId matches session.sectionId
    if (session.sectionId) {
      const sectionStudents = await Student.find({ sectionId: session.sectionId, status: 'ACTIVE' }).select('_id');
      const secIds = sectionStudents.map((s) => s._id.toString());
      studentIds = Array.from(new Set([...studentIds, ...secIds]));
    }

    // Find students already marked present/late/excused
    const existingRecords = await AttendanceRecord.find({
      sessionId: session._id,
    });
    const markedStudentIds = new Set(existingRecords.map((r: any) => r.studentId.toString()));

    const absentRecordsToInsert = [];
    for (const studentId of studentIds) {
      if (!markedStudentIds.has(studentId)) {
        absentRecordsToInsert.push({
          studentId: new mongoose.Types.ObjectId(studentId),
          sessionId: session._id,
          timetableId: session.timetableId,
          subjectId: session.subjectId,
          facultyId: session.facultyId,
          sectionId: session.sectionId,
          classroomId: session.classroomId,
          date: session.date,
          timestamp: effectiveNow,
          realTimestamp: realNow,
          isTestMode,
          status: 'ABSENT',
          markedBy: 'SYSTEM',
          recognitionMethod: 'SYSTEM_AUTO_ABSENT',
        });
      }
    }

    if (absentRecordsToInsert.length > 0) {
      await AttendanceRecord.insertMany(absentRecordsToInsert, { ordered: false }).catch(() => {});
    }

    session.status = 'COMPLETED';
    await session.save();

    emitAttendanceEvent('session.ended', { sessionId: session.sessionId, status: 'COMPLETED' }, session.sessionId);
  }

  private static async logRecognitionEvent(payload: {
    eventId: string;
    deviceId: string;
    studentId?: mongoose.Types.ObjectId;
    faceDetected: boolean;
    faceCount: number;
    confidence?: number;
    qualityScore?: number;
    livenessPassed: boolean;
    result: RecognitionResult;
    failureReason?: string;
  }) {
    try {
      await RecognitionEvent.create({
        ...payload,
        timestamp: clockService.getRealNow(), // Security events preserve real physical server timestamp
        modelVersion: 'ArcFace-v1',
        processingTimeMs: 45,
      });
    } catch (err) {
      console.error('[RecognitionEvent Log Error]:', err);
    }
  }
}
