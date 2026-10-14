import mongoose, { Schema, Document } from 'mongoose';

export type WardRelationship = 'Father' | 'Mother' | 'Guardian' | 'Other';

export interface IParentWard extends Document {
  parent: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  relationship: WardRelationship | string;
  isActive: boolean;
  assignedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ParentWardSchema: Schema = new Schema(
  {
    parent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    relationship: { type: String, default: 'Guardian', trim: true },
    isActive: { type: Boolean, default: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound Unique Index: prevents duplicate associations for the same parent and student
ParentWardSchema.index({ parent: 1, student: 1 }, { unique: true });
ParentWardSchema.index({ parent: 1, isActive: 1 });
ParentWardSchema.index({ student: 1, isActive: 1 });

export const ParentWard = mongoose.model<IParentWard>('ParentWard', ParentWardSchema);
