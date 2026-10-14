import mongoose, { Schema, Document } from 'mongoose';

export type RecognitionResult =
  | 'SUCCESS'
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES'
  | 'UNKNOWN_FACE'
  | 'LOW_CONFIDENCE'
  | 'LIVENESS_FAILED'
  | 'SESSION_INACTIVE'
  | 'UNAUTHORIZED_DEVICE'
  | 'STUDENT_NOT_ALLOCATED';

export interface IRecognitionEvent extends Document {
  eventId: string;
  deviceId: string;
  studentId?: mongoose.Types.ObjectId;
  timestamp: Date;
  faceDetected: boolean;
  faceCount: number;
  confidence?: number;
  qualityScore?: number;
  livenessPassed: boolean;
  result: RecognitionResult;
  failureReason?: string;
  modelVersion: string;
  processingTimeMs: number;
  createdAt: Date;
}

const RecognitionEventSchema: Schema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, trim: true },
    deviceId: { type: String, required: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    timestamp: { type: Date, required: true, default: Date.now },
    faceDetected: { type: Boolean, required: true },
    faceCount: { type: Number, required: true, default: 0 },
    confidence: { type: Number },
    qualityScore: { type: Number },
    livenessPassed: { type: Boolean, default: true },
    result: {
      type: String,
      enum: [
        'SUCCESS',
        'NO_FACE_DETECTED',
        'MULTIPLE_FACES',
        'UNKNOWN_FACE',
        'LOW_CONFIDENCE',
        'LIVENESS_FAILED',
        'SESSION_INACTIVE',
        'UNAUTHORIZED_DEVICE',
        'STUDENT_NOT_ALLOCATED',
      ],
      required: true,
    },
    failureReason: { type: String },
    modelVersion: { type: String, default: 'ArcFace-v1' },
    processingTimeMs: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RecognitionEventSchema.index({ deviceId: 1, timestamp: -1 });
RecognitionEventSchema.index({ studentId: 1, timestamp: -1 });
RecognitionEventSchema.index({ result: 1 });

export const RecognitionEvent = mongoose.model<IRecognitionEvent>('RecognitionEvent', RecognitionEventSchema);
