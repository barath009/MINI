# BIT Smart Attendance System - Security Architecture & RBAC

## 1. Authentication & Session Management
- **JWT & Password Security**: User passwords are encrypted using `bcrypt` (salt rounds: 10). Authentication issues signed JWT access tokens (1-day expiration) and refresh tokens (7-day expiration).
- **Unified Login**: A single login endpoint (`/api/v1/auth/login`) authenticates all roles. User roles are resolved server-side from MongoDB records and cannot be spoofed by client inputs.

## 2. Role-Based Access Control (RBAC) Matrix
- **ADMIN**:
  - Full institutional authority: Student/Faculty CRUD, Allocations, Department/Section/Subject/Classroom/Timetable management, IoT Device registration, Biometric enrollment, Session controls, System Settings, Audit Logs.
- **FACULTY**:
  - Scoped access: View assigned classes & allocated students, monitor active session attendance, apply audited manual overrides, review attendance disputes.
  - **IDOR Protection**: Faculty queries filter strictly by `facultyId`. Faculty members cannot access students or sessions assigned to other faculty members.
- **STUDENT**:
  - Scoped read-only access: View personal attendance percentage, detailed "WHERE and WHEN" history, subject breakdown, biometric status, and submit attendance disputes.
  - Students cannot access faculty or administrative endpoints.

## 3. Device Authentication & IoT Security
- Requests from hardware devices require `x-device-id` and `x-api-key` headers.
- API keys are hashed with `bcrypt` in the `IoTDevice` model.
- Disabled or `MAINTENANCE` devices are automatically blocked from submitting attendance.

## 4. Biometric Data Privacy
- Raw camera face images are discarded immediately after vector embedding generation.
- Face profiles are stored as 128-dimensional floating point math vectors (`protectedEmbedding`) in a dedicated `biometricProfiles` MongoDB collection.
- Raw embedding vectors are stripped from standard student listing APIs to prevent privacy leaks.

## 5. Audit Logging
- Every critical state change (Manual Attendance Overrides, Student/Faculty Creation, Device Registration, Dispute Reviews, Settings Updates) generates an immutable `AuditLog` entry containing `actorId`, `action`, `targetEntity`, `details`, `ipAddress`, and timestamp.
