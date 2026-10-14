import { Notification, NotificationType, NotificationPriority } from '../models/Notification';
import { getSocketIO } from './socketService';
import mongoose from 'mongoose';

export const createNotification = async (
  userId: mongoose.Types.ObjectId | string,
  title: string,
  message: string,
  type: NotificationType,
  priority: NotificationPriority = 'MEDIUM',
  metaData?: Record<string, any>
) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      priority,
      readStatus: false,
      metaData,
    });

    const io = getSocketIO();
    io.to(`user_${userId.toString()}`).emit('notification.created', notification);

    return notification;
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err);
  }
};
