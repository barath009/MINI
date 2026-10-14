import mongoose, { Schema, Document } from 'mongoose';

export type BiometricStatus = 'PENDING' | 'ENROLLED' | 'RE_ENROLL_REQUIRED';

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  rollNumber: string;
  registerNumber: string;
  departmentId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  year: number;
  semester: number;
  academicYear: string;
  biometricStatus: BiometricStatus;
  enrollmentDate?: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'WITHDRAWN';
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    registerNumber: { type: String, required: true, unique: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    year: { type: Number, required: true },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true, trim: true },
    biometricStatus: { type: String, enum: ['PENDING', 'ENROLLED', 'RE_ENROLL_REQUIRED'], default: 'PENDING' },
    enrollmentDate: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'WITHDRAWN'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

StudentSchema.index({ registerNumber: 1 });
StudentSchema.index({ userId: 1 });
StudentSchema.index({ departmentId: 1, sectionId: 1 });

export const Student = mongoose.model<IStudent>('Student', StudentSchema);
