import mongoose, { Schema, Document } from 'mongoose';

export type SessionStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface IAttendanceSession extends Document {
  sessionId: string;
  subjectId?: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId;
  classroomId: mongoose.Types.ObjectId;
  date: Date;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  status: SessionStatus;
  gracePeriodMinutes: number;
  academicYear: string;
  semester?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSessionSchema: Schema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED' },
    gracePeriodMinutes: { type: Number, default: 10 },
    academicYear: { type: String, default: '2026-2027' },
    semester: { type: Number, default: 5 },
  },
  { timestamps: true }
);

AttendanceSessionSchema.index({ classroomId: 1, date: 1, status: 1 });
AttendanceSessionSchema.index({ facultyId: 1, date: 1 });

export const AttendanceSession = mongoose.model<IAttendanceSession>('AttendanceSession', AttendanceSessionSchema);
