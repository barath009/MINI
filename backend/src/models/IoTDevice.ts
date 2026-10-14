import mongoose, { Schema, Document } from 'mongoose';

export type DeviceType = 'RASPBERRY_PI' | 'ESP32_CAM' | 'CUSTOM_EDGE';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';

export interface IIoTDevice extends Document {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  classroomId: mongoose.Types.ObjectId;
  ipAddress?: string;
  macAddress?: string;
  apiKeyHash: string;
  status: DeviceStatus;
  cameraStatus: 'OK' | 'ERROR' | 'OFFLINE';
  firmwareVersion: string;
  lastHeartbeat?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IoTDeviceSchema: Schema = new Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    deviceName: { type: String, required: true, trim: true },
    deviceType: { type: String, enum: ['RASPBERRY_PI', 'ESP32_CAM', 'CUSTOM_EDGE'], required: true },
    classroomId: { type: Schema.Types.ObjectId, ref: 'Classroom', required: true },
    ipAddress: { type: String, trim: true },
    macAddress: { type: String, trim: true },
    apiKeyHash: { type: String, required: true },
    status: { type: String, enum: ['ONLINE', 'OFFLINE', 'DEGRADED', 'MAINTENANCE'], default: 'OFFLINE' },
    cameraStatus: { type: String, enum: ['OK', 'ERROR', 'OFFLINE'], default: 'OK' },
    firmwareVersion: { type: String, default: 'v1.0.0' },
    lastHeartbeat: { type: Date },
  },
  { timestamps: true }
);

IoTDeviceSchema.index({ deviceId: 1 });
IoTDeviceSchema.index({ classroomId: 1 });
IoTDeviceSchema.index({ status: 1 });

export const IoTDevice = mongoose.model<IIoTDevice>('IoTDevice', IoTDeviceSchema);
