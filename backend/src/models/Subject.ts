import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  code: string;
  name: string;
  departmentId: mongoose.Types.ObjectId;
  year: number;
  semester: number;
  credits: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    year: { type: Number, required: true, default: 1 },
    semester: { type: Number, required: true },
    credits: { type: Number, required: true, default: 3 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);
