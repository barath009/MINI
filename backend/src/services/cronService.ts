import cron from 'node-cron';
import { IoTDevice } from '../models/IoTDevice';
import { Student } from '../models/Student';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { createNotification } from './notificationService';
import { emitDeviceStatus } from './socketService';
import { config } from '../config';

export const startCronJobs = () => {
  // Check offline devices every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      const timeoutMargin = new Date(Date.now() - config.deviceHeartbeatTimeout * 1000);
      const offlineDevices = await IoTDevice.find({
        status: { $ne: 'OFFLINE' },
        lastHeartbeat: { $lt: timeoutMargin },
      });

      for (const device of offlineDevices) {
        device.status = 'OFFLINE';
        device.cameraStatus = 'OFFLINE';
        await device.save();
        console.log(`[CronJob] Device '${device.deviceId}' marked OFFLINE due to heartbeat timeout.`);
        emitDeviceStatus(device.deviceId, 'OFFLINE', device.classroomId.toString());
      }
    } catch (err) {
      console.error('[CronJob Error - Device Offline Check]:', err);
    }
  });

  // Check low attendance defaulters once per day
  cron.schedule('0 18 * * *', async () => {
    try {
      const activeStudents = await Student.find({ status: 'ACTIVE' }).populate('userId');
      for (const student of activeStudents) {
        const total = await AttendanceRecord.countDocuments({ studentId: student._id });
        if (total === 0) continue;

        const present = await AttendanceRecord.countDocuments({
          studentId: student._id,
          status: { $in: ['PRESENT', 'LATE'] },
        });

        const percentage = (present / total) * 100;
        if (percentage < config.lowAttendanceThreshold) {
          const userDoc = student.userId as any;
          await createNotification(
            userDoc._id,
            'Low Attendance Defaulter Warning',
            `Your current overall attendance is ${percentage.toFixed(1)}%, which is below the mandatory ${config.lowAttendanceThreshold}% threshold.`,
            'LOW_ATTENDANCE_WARNING',
            'HIGH',
            { currentPercentage: percentage }
          );
        }
      }
    } catch (err) {
      console.error('[CronJob Error - Low Attendance Check]:', err);
    }
  });

  console.log('[CronService] Background scheduled tasks initialized.');
};
