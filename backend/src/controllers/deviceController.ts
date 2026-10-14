import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Request, Response, NextFunction } from 'express';
import { DeviceAuthRequest } from '../middleware/deviceAuth';
import { IoTDevice } from '../models/IoTDevice';
import { Student } from '../models/Student';
import { AttendanceSession } from '../models/AttendanceSession';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { Classroom } from '../models/Classroom';
import { Faculty } from '../models/Faculty';
import { BiometricProfile } from '../models/BiometricProfile';
import { ClassAllocation } from '../models/ClassAllocation';
import { AttendanceEngine } from '../services/attendanceEngine';
import { emitDeviceStatus, emitAttendanceEvent } from '../services/socketService';
import { recognizeAttendanceSchema } from '../validators';
import { AppError } from '../errors/AppError';

/** Cosine similarity between two 128-element float vectors. Returns 0–1. */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < 128; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Minimum cosine similarity to confirm a face match.
 * Observed real-world scores:
 *   Enrolled person → above 0.95
 *   Stranger        → below 0.95
 */
const RECOGNITION_THRESHOLD = 0.95;



// ─────────────────────────────────────────────────────────────────────────────

export const deviceLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceId, password, apiKey } = req.body;
    const inputPass = password || apiKey;

    if (!deviceId || !inputPass) {
      throw new AppError('Device ID and Device Password are required.', 400);
    }

    const device = await IoTDevice.findOne({ deviceId: deviceId.trim() }).populate('classroomId');
    if (!device) {
      throw new AppError('IoT Device ID not found or unregistered.', 404);
    }

    const isMatch = await bcrypt.compare(inputPass, device.apiKeyHash);
    if (!isMatch) {
      throw new AppError('Invalid Device Password / Passcode.', 401);
    }

    device.status = 'ONLINE';
    device.lastHeartbeat = new Date();
    await device.save();

    emitDeviceStatus(device.deviceId, 'ONLINE', device.classroomId?.toString());

    const token = jwt.sign(
      { deviceId: device.deviceId, id: device._id, role: 'DEVICE' },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: `IoT Camera Device '${device.deviceName}' authenticated successfully!`,
      data: {
        token,
        device: {
          id: device._id,
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          classroom: device.classroomId,
          status: device.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const heartbeat = async (req: DeviceAuthRequest, res: Response, next: NextFunction) => {
  try {
    const device = req.device;
    if (device) {
      device.lastHeartbeat = new Date();
      device.status = 'ONLINE';
      if (req.body.cameraStatus) device.cameraStatus = req.body.cameraStatus;
      if (req.body.softwareVersion) device.firmwareVersion = req.body.softwareVersion;
      await device.save();

      emitDeviceStatus(device.deviceId, 'ONLINE', device.classroomId?.toString());
    }

    res.status(200).json({
      success: true,
      message: 'Heartbeat received and logged',
      data: {
        status: 'ONLINE',
        serverTime: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const recognizeAttendance = async (req: DeviceAuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = recognizeAttendanceSchema.parse(req.body);

    const result = await AttendanceEngine.processRecognition({
      deviceId: input.deviceId,
      eventId: input.eventId,
      timestamp: input.timestamp,
      image: input.image,
      imagePath: input.imagePath,
      mockStudentRegisterNumber: input.mockStudentRegisterNumber,
    });

    const statusCode = result.success ? 200 : result.errorCode === 'ATTENDANCE_DUPLICATE' ? 409 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/devices/kiosk-recognize
 *
 * Real face recognition endpoint for the browser-based kiosk.
 * Accepts a 128D face descriptor (Float32Array as number[]) extracted by face-api.js in the browser.
 * Performs cosine similarity comparison against all enrolled BiometricProfile embeddings in MongoDB.
 * Returns the best-matching student if score >= RECOGNITION_THRESHOLD, otherwise returns "not recognized".
 */
export const kioskRecognize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { descriptor } = req.body as { descriptor?: number[] };

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing face descriptor. Expected a 128-element float array.',
      });
    }

    // ── Load all active biometric profiles ──
    const profiles = await BiometricProfile.find({ enrollmentStatus: 'ACTIVE' }).populate({
      path: 'studentId',
      populate: [{ path: 'userId' }, { path: 'departmentId' }],
    });

    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'No biometric profiles are enrolled yet. Go to Admin → Students → and click "Enroll Biometrics" for each student first.',
      });
    }

    // ── Find best matching profile via cosine similarity ──
    let bestScore = -1;
    let bestProfile: any = null;

    for (const profile of profiles) {
      const stored = profile.protectedEmbedding;
      if (!stored || stored.length !== 128) continue;
      const score = cosineSimilarity(descriptor, stored);
      if (score > bestScore) {
        bestScore = score;
        bestProfile = profile;
      }
    }

    // ── Threshold check ──
    if (bestScore < RECOGNITION_THRESHOLD || !bestProfile) {
      return res.status(200).json({
        success: false,
        recognized: false,
        message: `Face not recognized (similarity: ${(bestScore * 100).toFixed(1)}%). Please ensure you are enrolled.`,
        data: { confidence: parseFloat(bestScore.toFixed(4)) },
      });
    }

    const student: any = bestProfile.studentId;
    if (!student) {
      throw new AppError('Matched student record not found.', 404);
    }

    const matchedConfidence = parseFloat(bestScore.toFixed(4));

    // ── Resolve Allocated Staff (Faculty) for this student ──
    const allocation = await ClassAllocation.findOne({ studentId: student._id, status: 'ACTIVE' });
    let targetFacultyId = allocation?.facultyId;

    if (!targetFacultyId) {
      const deptFaculty = await Faculty.findOne({ departmentId: student.departmentId });
      targetFacultyId = deptFaculty?._id || (await Faculty.findOne())?._id;
    }

    // ── Get or create active attendance session for this student's allocated staff ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let session = await AttendanceSession.findOne({
      facultyId: targetFacultyId,
      status: 'ACTIVE',
      date: { $gte: todayStart },
    });

    if (!session) {
      session = await AttendanceSession.findOne({ facultyId: targetFacultyId }).sort({ createdAt: -1 });
    }

    if (!session) {
      const classroom = await Classroom.findOne();
      session = await AttendanceSession.create({
        sessionId: `KIOSK_${Date.now().toString().slice(-6)}`,
        facultyId: targetFacultyId,
        subjectId: allocation?.subjectId,
        sectionId: student.sectionId || allocation?.sectionId,
        classroomId: classroom?._id,
        date: new Date(),
        startTime: '09:00',
        endTime: '17:00',
        status: 'ACTIVE',
        academicYear: '2026-2027',
      });
    }

    // ── Upsert attendance record for allocated staff ──
    const record = await AttendanceRecord.findOneAndUpdate(
      { studentId: student._id, sessionId: session._id },
      {
        studentId: student._id,
        sessionId: session._id,
        facultyId: targetFacultyId,
        classroomId: session.classroomId,
        date: session.date,
        timestamp: new Date(),
        status: 'PRESENT',
        markedBy: 'SYSTEM',
        recognitionMethod: 'FACE_RECOGNITION',
        confidenceScore: matchedConfidence,
      },
      { upsert: true, new: true }
    );

    if (student.biometricStatus !== 'ENROLLED') {
      student.biometricStatus = 'ENROLLED';
      student.enrollmentDate = new Date();
      await student.save();
    }

    emitAttendanceEvent('attendance.marked', {
      attendanceId: record._id,
      studentName: student.userId?.name,
      registerNumber: student.registerNumber,
      status: 'PRESENT',
      confidence: matchedConfidence,
      timestamp: record.timestamp,
    });
    emitAttendanceEvent('attendance.created', {
      attendanceId: record._id,
      studentName: student.userId?.name,
    });

    return res.status(200).json({
      success: true,
      recognized: true,
      message: `Face Recognized! ${student.userId?.name || student.registerNumber} marked PRESENT (confidence: ${(matchedConfidence * 100).toFixed(1)}%)`,
      data: {
        attendanceId: record._id,
        studentName: student.userId?.name,
        registerNumber: student.registerNumber,
        department: student.departmentId?.name || 'Engineering',
        status: 'PRESENT',
        confidence: matchedConfidence,
        timestamp: record.timestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDeviceStatus = async (req: DeviceAuthRequest, res: Response, next: NextFunction) => {
  try {
    const device = req.device;
    res.status(200).json({
      success: true,
      data: device,
    });
  } catch (error) {
    next(error);
  }
};
