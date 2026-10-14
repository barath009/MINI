import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AppError } from '../errors/AppError';
import { IoTDevice, IIoTDevice } from '../models/IoTDevice';

export interface DeviceAuthRequest extends Request {
  device?: IIoTDevice;
}

export const authenticateDevice = async (req: DeviceAuthRequest, res: Response, next: NextFunction) => {
  try {
    const deviceId = req.headers['x-device-id'] as string || req.body.deviceId;
    const apiKey = req.headers['x-api-key'] as string;

    if (!deviceId) {
      throw new AppError('Device ID header (x-device-id) or body field missing.', 401, 'DEVICE_UNAUTHORIZED');
    }

    const device = await IoTDevice.findOne({ deviceId });
    if (!device) {
      throw new AppError(`IoT Device '${deviceId}' not found in registry.`, 401, 'DEVICE_UNAUTHORIZED');
    }

    if (device.status === 'MAINTENANCE' || device.status === 'OFFLINE') {
      // Allow heartbeat even if offline, but block attendance recognize requests if offline/maintenance
      if (req.path !== '/heartbeat' && device.status === 'MAINTENANCE') {
        throw new AppError(`IoT Device '${deviceId}' is currently in MAINTENANCE mode.`, 403, 'DEVICE_OFFLINE');
      }
    }

    // Check API Key if provided in headers
    if (apiKey) {
      const match = await bcrypt.compare(apiKey, device.apiKeyHash);
      if (!match) {
        throw new AppError(`Invalid API Key provided for device '${deviceId}'.`, 401, 'DEVICE_UNAUTHORIZED');
      }
    }

    req.device = device;
    next();
  } catch (error) {
    next(error);
  }
};
