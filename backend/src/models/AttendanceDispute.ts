import mongoose, { Schema, Document } from 'mongoose';

export type DisputeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IAttendanceDispute extends Document {
  studentId: mongoose.Types.ObjectId;
  attendanceId: mongoose.Types.ObjectId;
  reason: string;
  evidenceReference?: string;
  status: DisputeStatus;
  submittedAt: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewRemark?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceDisputeSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    attendanceId: { type: Schema.Types.ObjectId, ref: 'AttendanceRecord', required: true },
    reason: { type: String, required: true, trim: true },
    evidenceReference: { type: String, trim: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewRemark: { type: String, trim: true },
  },
  { timestamps: true }
);

AttendanceDisputeSchema.index({ studentId: 1, status: 1 });
AttendanceDisputeSchema.index({ status: 1 });

export const AttendanceDispute = mongoose.model<IAttendanceDispute>('AttendanceDispute', AttendanceDisputeSchema);
