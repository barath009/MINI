import mongoose, { Schema, Document } from 'mongoose';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
export type RecognitionMethod = 'FACE_RECOGNITION' | 'MANUAL_OVERRIDE' | 'SYSTEM_AUTO_ABSENT';

export interface IAttendanceRecord extends Document {
  studentId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId;
  classroomId: mongoose.Types.ObjectId;
  deviceId?: mongoose.Types.ObjectId;
  date: Date;
  timestamp: Date;
  status: AttendanceStatus;
  markedBy: 'SYSTEM' | 'FACULTY' | 'ADMIN';
  recognitionMethod: RecognitionMethod;
  confidenceScore?: number;
  eventId?: string;
  overrideReason?: string;
  overrideRemark?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceRecordSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'IoTDevice' },
    date: { type: Date, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'], required: true },
    markedBy: { type: String, enum: ['SYSTEM', 'FACULTY', 'ADMIN'], default: 'SYSTEM' },
    recognitionMethod: {
      type: String,
      enum: ['FACE_RECOGNITION', 'MANUAL_OVERRIDE', 'SYSTEM_AUTO_ABSENT'],
      default: 'FACE_RECOGNITION',
    },
    confidenceScore: { type: Number },
    eventId: { type: String },
    overrideReason: { type: String },
    overrideRemark: { type: String },
  },
  { timestamps: true }
);

// MANDATORY UNIQUE INDEX: Prevents duplicate attendance for the same student in the same session!
AttendanceRecordSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });
AttendanceRecordSchema.index({ studentId: 1, date: 1 });
AttendanceRecordSchema.index({ facultyId: 1, date: 1 });
AttendanceRecordSchema.index({ sessionId: 1, status: 1 });
AttendanceRecordSchema.index({ deviceId: 1 });

export const AttendanceRecord = mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);
