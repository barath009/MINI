import mongoose, { Schema, Document } from 'mongoose';

export interface IClassroom extends Document {
  building: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  departmentId?: mongoose.Types.ObjectId;
  sectionId?: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const ClassroomSchema: Schema = new Schema(
  {
    building: { type: String, required: true, trim: true },
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, required: true },
    capacity: { type: Number, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
    status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

ClassroomSchema.index({ building: 1, roomNumber: 1 }, { unique: true });

export const Classroom = mongoose.model<IClassroom>('Classroom', ClassroomSchema);
