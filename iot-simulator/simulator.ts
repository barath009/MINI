import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const DEVICE_ID = process.env.DEVICE_ID || 'DEV_A204_01';
const API_KEY = process.env.DEVICE_API_SECRET || 'device_api_secret_key_bit_iot_2026';

const headers = {
  'x-device-id': DEVICE_ID,
  'x-api-key': API_KEY,
  'Content-Type': 'application/json',
};

async function sendHeartbeat() {
  console.log(`\n[IoT Simulator] Sending Heartbeat for device ${DEVICE_ID}...`);
  try {
    const res = await axios.post(
      `${BACKEND_URL}/api/v1/devices/heartbeat`,
      {
        deviceId: DEVICE_ID,
        timestamp: new Date().toISOString(),
        cameraStatus: 'OK',
        softwareVersion: 'v1.2.0',
      },
      { headers }
    );
    console.log(`[Result 200 OK]:`, res.data);
  } catch (err: any) {
    console.error(`[Error]:`, err.response?.data || err.message);
  }
}

async function simulateScenario(scenarioName: string, mockRegisterNumber?: string, customEventId?: string) {
  const eventId = customEventId || `EVT_SIM_${Date.now()}`;
  console.log(`\n=======================================================`);
  console.log(`[IoT Simulator] Running Scenario: ${scenarioName}`);
  console.log(`Device: ${DEVICE_ID} | EventId: ${eventId}`);
  console.log(`=======================================================`);

  try {
    const res = await axios.post(
      `${BACKEND_URL}/api/v1/attendance/recognize`,
      {
        deviceId: DEVICE_ID,
        eventId,
        timestamp: new Date().toISOString(),
        mockStudentRegisterNumber: mockRegisterNumber,
      },
      { headers }
    );
    console.log(`[Success Response ${res.status}]:`, JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.log(`[Rejected Response ${err.response?.status}]:`, JSON.stringify(err.response?.data, null, 2));
  }
}

async function runAllSimulations() {
  console.log(`=======================================================`);
  console.log(`  BIT SMART ATTENDANCE - HARDWARE SIMULATOR SUITE      `);
  console.log(`=======================================================`);

  await sendHeartbeat();

  // 1. Valid Attendance Scan for Aarav Sharma (7376221CS101)
  await simulateScenario('SCENARIO 1: Valid Face Match (Aarav Sharma)', '7376221CS101');

  // 2. Duplicate Event Scan (Should trigger ATTENDANCE_DUPLICATE error)
  const dupId = `EVT_DUP_${Date.now()}`;
  await simulateScenario('SCENARIO 2A: Initial Scan for Student 2', '7376221CS102', dupId);
  await simulateScenario('SCENARIO 2B: Duplicate Scan with Same Event ID', '7376221CS102', dupId);

  // 3. Unknown Face Scan
  await simulateScenario('SCENARIO 3: Unknown Unenrolled Face', 'UNKNOWN');

  // 4. No Face Detected
  await simulateScenario('SCENARIO 4: Blank / Frame Without Face', 'NO_FACE');

  // 5. Anti-Spoofing Liveness Failure (Printed Photo / Screen Attack)
  await simulateScenario('SCENARIO 5: Photo Spoof Attack (Liveness Failure)', 'SPOOF');

  console.log(`\n=======================================================`);
  console.log(`[IoT Simulator] Simulation Test Suite Completed!`);
  console.log(`=======================================================\n`);
}

if (require.main === module) {
  runAllSimulations();
}
