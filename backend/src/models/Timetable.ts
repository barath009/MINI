import mongoose, { Schema, Document } from 'mongoose';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface ITimetable extends Document {
  subjectId: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  classroomId: mongoose.Types.ObjectId;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  academicYear: string;
  semester: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSchema: Schema = new Schema(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true },
    dayOfWeek: {
      type: String,
      enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      required: true,
    },
    periodNumber: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

TimetableSchema.index({ classroomId: 1, dayOfWeek: 1, periodNumber: 1 });
TimetableSchema.index({ facultyId: 1, dayOfWeek: 1 });

export const Timetable = mongoose.model<ITimetable>('Timetable', TimetableSchema);
