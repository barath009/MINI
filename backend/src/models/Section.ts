import mongoose, { Schema, Document } from 'mongoose';

export interface ISection extends Document {
  name: string;
  departmentId: mongoose.Types.ObjectId;
  year: number;
  semester: number;
  academicYear: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    year: { type: Number, required: true },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Section = mongoose.model<ISection>('Section', SectionSchema);
