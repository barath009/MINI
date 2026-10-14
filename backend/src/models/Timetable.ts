import mongoose, { Schema, Document } from 'mongoose';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type ClassScheduleStatus = 'ACTIVE' | 'CANCELLED' | 'RESCHEDULED';

export interface ITimetable extends Document {
  date: Date;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  subjectId: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  classroomId: mongoose.Types.ObjectId;
  academicYear: string;
  semester: number;
  notes?: string;
  status: ClassScheduleStatus;
  rescheduledTo?: {
    date: Date;
    startTime: string;
    endTime: string;
    reason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSchema: Schema = new Schema(
  {
    date: { type: Date, required: true },
    dayOfWeek: {
      type: String,
      enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      required: true,
    },
    periodNumber: { type: Number, required: true, min: 1, max: 10 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true },
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED', 'RESCHEDULED'],
      default: 'ACTIVE',
    },
    rescheduledTo: {
      date: { type: Date },
      startTime: { type: String },
      endTime: { type: String },
      reason: { type: String },
    },
  },
  { timestamps: true }
);

// Indexes to rapidly detect conflicts and query schedules by date
TimetableSchema.index({ date: 1, sectionId: 1, periodNumber: 1 });
TimetableSchema.index({ date: 1, classroomId: 1, periodNumber: 1 });
TimetableSchema.index({ date: 1, facultyId: 1, periodNumber: 1 });
TimetableSchema.index({ date: 1, status: 1 });

export const Timetable = mongoose.model<ITimetable>('Timetable', TimetableSchema);
