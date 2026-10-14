import mongoose, { Schema, Document } from 'mongoose';

export type DisputeStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
export type IssueCategory =
  | 'Biometric attendance missing'
  | 'Incorrect attendance status'
  | 'Incorrect recorded time'
  | 'Other attendance issue';

export interface IAttendanceDispute extends Document {
  requestId: string;
  studentId: mongoose.Types.ObjectId;
  attendanceId?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  attendanceDate?: Date;
  issueCategory: IssueCategory;
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
    requestId: { type: String, unique: true, sparse: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    attendanceId: { type: Schema.Types.ObjectId, ref: 'AttendanceRecord' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    attendanceDate: { type: Date },
    issueCategory: {
      type: String,
      enum: [
        'Biometric attendance missing',
        'Incorrect attendance status',
        'Incorrect recorded time',
        'Other attendance issue',
      ],
      default: 'Incorrect attendance status',
    },
    reason: { type: String, required: true, trim: true },
    evidenceReference: { type: String, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
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
