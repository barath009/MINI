import { AuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

export const createAuditLog = async (
  actorId: mongoose.Types.ObjectId | string,
  action: string,
  targetEntity: string,
  targetId?: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    await AuditLog.create({
      actorId,
      action,
      targetEntity,
      targetId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[AuditLog] Failed to create audit log entry:', err);
  }
};
