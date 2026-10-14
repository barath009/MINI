import mongoose, { Schema, Document } from 'mongoose';

export interface IClassAllocation extends Document {
  facultyId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId;
  academicYear: string;
  semester?: number;
  startDate: Date;
  endDate?: Date;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const ClassAllocationSchema: Schema = new Schema(
  {
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
    academicYear: { type: String, default: '2026-2027' },
    semester: { type: Number, default: 5 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

ClassAllocationSchema.index({ facultyId: 1, studentId: 1 });
ClassAllocationSchema.index({ studentId: 1, status: 1 });

export const ClassAllocation = mongoose.model<IClassAllocation>('ClassAllocation', ClassAllocationSchema);
