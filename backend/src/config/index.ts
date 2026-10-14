import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Check if monorepo parent .env exists, otherwise load from local directory or container env
const monorepoEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(monorepoEnvPath)) {
  dotenv.config({ path: monorepoEnvPath });
} else {
  dotenv.config();
}

export const config = {
  port: process.env.PORT || 5000,
  frontendPort: process.env.FRONTEND_PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bit-smart-attendance',
  mongoDbName: process.env.MONGODB_DB_NAME || 'bit-smart-attendance',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_bit_smart_attendance_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_key_bit_2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  deviceApiSecret: process.env.DEVICE_API_SECRET || 'device_api_secret_key_bit_iot_2026',
  faceServiceUrl: process.env.FACE_SERVICE_URL || 'http://localhost:8000',
  faceServiceApiKey: process.env.FACE_SERVICE_API_KEY || 'face_service_secret_api_key_2026',
  socketUrl: process.env.SOCKET_URL || 'http://localhost:5000',
  appTimezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  faceRecognitionMode: process.env.FACE_RECOGNITION_MODE || 'mock',
  recognitionThreshold: parseFloat(process.env.RECOGNITION_THRESHOLD || '0.75'),
  livenessThreshold: parseFloat(process.env.LIVENESS_THRESHOLD || '0.70'),
  attendanceGracePeriod: parseInt(process.env.ATTENDANCE_GRACE_PERIOD || '10', 10),
  lowAttendanceThreshold: parseFloat(process.env.LOW_ATTENDANCE_THRESHOLD || '75'),
  deviceHeartbeatTimeout: parseInt(process.env.DEVICE_HEARTBEAT_TIMEOUT || '300', 10),
};
