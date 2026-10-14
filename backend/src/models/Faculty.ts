import mongoose, { Schema, Document } from 'mongoose';

export interface IFaculty extends Document {
  userId: mongoose.Types.ObjectId;
  employeeId: string;
  departmentId: mongoose.Types.ObjectId;
  designation: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const FacultySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    designation: { type: String, required: true, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

FacultySchema.index({ employeeId: 1 });
FacultySchema.index({ userId: 1 });

export const Faculty = mongoose.model<IFaculty>('Faculty', FacultySchema);
