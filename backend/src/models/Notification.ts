import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'ATTENDANCE_MARKED' | 'LOW_ATTENDANCE_WARNING' | 'DISPUTE_UPDATE' | 'DEVICE_ALERT' | 'SYSTEM_ALERT';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  readStatus: boolean;
  metaData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['ATTENDANCE_MARKED', 'LOW_ATTENDANCE_WARNING', 'DISPUTE_UPDATE', 'DEVICE_ALERT', 'SYSTEM_ALERT'],
      required: true,
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    readStatus: { type: Boolean, default: false },
    metaData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, readStatus: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
