import { Router } from 'express';
import { deviceLogin, heartbeat, recognizeAttendance, kioskRecognize, getDeviceStatus } from '../controllers/deviceController';
import { authenticateDevice } from '../middleware/deviceAuth';

const router = Router();

// Device authentication
router.post('/login', deviceLogin);

// Public Kiosk Scanner endpoint for web biometric camera
router.post('/kiosk-recognize', kioskRecognize);

// Device authenticated endpoints
router.post('/heartbeat', authenticateDevice, heartbeat);
router.post('/status', authenticateDevice, getDeviceStatus);
router.post('/recognize', authenticateDevice, recognizeAttendance);

export default router;
