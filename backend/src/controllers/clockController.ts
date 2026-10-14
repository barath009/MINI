import { Request, Response, NextFunction } from 'express';
import { clockService } from '../services/clockService';
import { syncSessionStatuses } from '../services/sessionService';
import { AppError } from '../errors/AppError';

export const getSystemTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = clockService.getStatus();
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

export const setTestMode = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      throw new AppError('The "enabled" boolean field is required.', 400);
    }

    if (enabled) {
      await clockService.enableTestMode(undefined, req.user?._id?.toString());
    } else {
      await clockService.disableTestMode(req.user?._id?.toString());
    }

    // Trigger session status synchronization on time change
    await syncSessionStatuses();

    const status = clockService.getStatus();
    res.status(200).json({
      success: true,
      message: `Test mode ${enabled ? 'enabled' : 'disabled'}.`,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

export const setTestTime = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { targetTime } = req.body;
    if (!targetTime) {
      throw new AppError('targetTime is required.', 400);
    }

    const dateObj = new Date(targetTime);
    if (isNaN(dateObj.getTime())) {
      throw new AppError('Invalid targetTime format. Must be a valid ISO or date string.', 400);
    }

    await clockService.setTestTime(dateObj, req.user?._id?.toString());
    await syncSessionStatuses();

    const status = clockService.getStatus();
    res.status(200).json({
      success: true,
      message: 'Test time updated successfully.',
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

export const advanceTestTime = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { minutes } = req.body;
    if (typeof minutes !== 'number') {
      throw new AppError('minutes must be a number.', 400);
    }

    await clockService.advanceTestTime(minutes * 60 * 1000, req.user?._id?.toString());
    await syncSessionStatuses();

    const status = clockService.getStatus();
    res.status(200).json({
      success: true,
      message: `System time advanced by ${minutes} minute(s).`,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

export const setPlayback = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { speedMultiplier, isPaused } = req.body;
    if (typeof speedMultiplier !== 'number' || speedMultiplier <= 0) {
      throw new AppError('speedMultiplier must be a positive number.', 400);
    }

    await clockService.setPlayback(Boolean(isPaused), speedMultiplier, req.user?._id?.toString());

    const status = clockService.getStatus();
    res.status(200).json({
      success: true,
      message: 'Playback settings updated.',
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

export const resetSystemTime = async (req: any, res: Response, next: NextFunction) => {
  try {
    await clockService.disableTestMode(req.user?._id?.toString());
    await syncSessionStatuses();

    const status = clockService.getStatus();
    res.status(200).json({
      success: true,
      message: 'System time reset to real server time.',
      data: status,
    });
  } catch (error) {
    next(error);
  }
};
