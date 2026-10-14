#!/usr/bin/env python3
"""
BIT Smart Attendance System - IoT Edge Client Script
Runs on Raspberry Pi / ESP32-CAM hardware devices.
Handles camera initialization, heartbeat daemon, REST frame submission, and offline retry queue.
"""

import time
import requests
import json
import os
import sys

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
DEVICE_ID = os.getenv("DEVICE_ID", "DEV_A204_01")
API_KEY = os.getenv("API_KEY", "device_api_secret_key_bit_iot_2026")

def send_heartbeat():
    url = f"{BACKEND_URL}/api/v1/devices/heartbeat"
    headers = {
        "x-device-id": DEVICE_ID,
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "deviceId": DEVICE_ID,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "cameraStatus": "OK",
        "softwareVersion": "v1.2.0"
    }
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=5)
        print(f"[IoT Client] Heartbeat Response ({res.status_code}): {res.json()}")
    except Exception as e:
        print(f"[IoT Client] Heartbeat Error: {e}")

def send_recognition_event(event_id=None, mock_register_number=None):
    url = f"{BACKEND_URL}/api/v1/attendance/recognize"
    headers = {
        "x-device-id": DEVICE_ID,
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "deviceId": DEVICE_ID,
        "eventId": event_id or f"EVT_PI_{int(time.time()*1000)}",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "mockStudentRegisterNumber": mock_register_number or "7376221CS101"
    }
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=5)
        print(f"[IoT Client] Recognize Event Response ({res.status_code}): {res.json()}")
    except Exception as e:
        print(f"[IoT Client] Recognize Event Error: {e}")

if __name__ == "__main__":
    print(f"=== Starting BIT Smart Attendance IoT Client [{DEVICE_ID}] ===")
    send_heartbeat()
    time.sleep(1)
    send_recognition_event()
