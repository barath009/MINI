# BIT Smart Attendance System - IoT Edge Hardware & Simulator

## Hardware Support
- **Raspberry Pi 4 (Preferred Edge Unit)**: Capable of running local frame captures and REST API calls.
- **ESP32-CAM (Compact Edge Node)**: Acts as camera capture node sending Base64 frames over HTTP REST to Node.js backend.

## Device APIs & Authentication
Each hardware unit must authenticate with:
- Header: `x-device-id: DEV_A204_01`
- Header: `x-api-key: device_api_secret_key_bit_iot_2026`

### Endpoints
1. `POST /api/v1/devices/heartbeat`: Periodic heartbeat ping (every 60s).
2. `POST /api/v1/attendance/recognize`: Frame transmission for attendance recognition.

## Development CLI Simulator Suite
Run the hardware simulator suite:
```bash
cd iot-simulator
npm start
```
The simulator tests:
1. Device Heartbeat
2. Valid Face Scan (Aarav Sharma - `7376221CS101`)
3. Duplicate Event Idempotency Check
4. Unknown Face Rejection
5. No Face Frame Rejection
6. Photo Spoof Attack (Liveness Failure)
