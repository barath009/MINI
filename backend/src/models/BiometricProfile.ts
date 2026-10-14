import mongoose, { Schema, Document } from 'mongoose';

export interface IBiometricProfile extends Document {
  studentId: mongoose.Types.ObjectId;
  protectedEmbedding: number[]; // Face embedding vector
  embeddingReference: string;
  modelVersion: string;
  enrollmentVersion: number;
  qualityScore: number;
  enrollmentStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
  enrolledAt: Date;
  updatedAt: Date;
}

const BiometricProfileSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    protectedEmbedding: { type: [Number], required: true },
    embeddingReference: { type: String, required: true },
    modelVersion: { type: String, default: 'ArcFace-v1' },
    enrollmentVersion: { type: Number, default: 1 },
    qualityScore: { type: Number, required: true, default: 0.95 },
    enrollmentStatus: { type: String, enum: ['ACTIVE', 'REVOKED', 'SUPERSEDED'], default: 'ACTIVE' },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

BiometricProfileSchema.index({ studentId: 1 });

export const BiometricProfile = mongoose.model<IBiometricProfile>('BiometricProfile', BiometricProfileSchema);
