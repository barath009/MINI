# BIT Smart Attendance System - API Reference Guide

## Base URL
`/api/v1`

## 1. Authentication
- `POST /auth/login` - Authenticate user credentials & return JWT tokens + profile details.
- `GET /auth/me` - Resolve current authenticated user profile.
- `POST /auth/change-password` - Update password.

## 2. Admin Endpoints (`ADMIN` Role Required)
- `GET /admin/dashboard` - Summary KPI counters & activity feeds.
- `GET /admin/analytics` - Aggregated 7-day attendance trends & department statistics.
- `GET /admin/students` / `POST /admin/students` - Student CRUD operations.
- `GET /admin/faculty` / `POST /admin/faculty` - Faculty CRUD operations.
- `POST /admin/allocations` - Assign faculty to student & subject.
- `GET /admin/departments` / `POST /admin/departments` - Department management.
- `GET /admin/sections` / `POST /admin/sections` - Section management.
- `GET /admin/subjects` / `POST /admin/subjects` - Subject management.
- `GET /admin/classrooms` / `POST /admin/classrooms` - Classroom management.
- `GET /admin/devices` / `POST /admin/devices` - IoT Device registration.
- `GET /admin/sessions` / `POST /admin/sessions` - Attendance Session CRUD.
- `POST /admin/sessions/:id/start` - Start attendance session.
- `POST /admin/sessions/:id/end` - End session & mark missing eligible students `ABSENT`.
- `POST /admin/biometrics/enroll` - Enroll face vector embedding.
- `GET /admin/audit` - View institutional audit logs.
- `GET /admin/settings` / `PUT /admin/settings` - System rule configuration.

## 3. Faculty Endpoints (`FACULTY` Role Required)
- `GET /faculty/dashboard` - Faculty workspace, active session, & live arrival feed.
- `GET /faculty/students` - View students allocated ONLY to this faculty (IDOR protected).
- `GET /faculty/attendance/:sessionId` - Session live attendance roster & confidence scores.
- `PUT /faculty/attendance/:id/override` - Audited manual attendance status correction.
- `GET /faculty/disputes` / `PUT /faculty/disputes/:id` - Review student disputes.

## 4. Student Endpoints (`STUDENT` Role Required)
- `GET /student/dashboard` - Attendance summary & subject breakdown.
- `GET /student/history` - Detailed attendance history satisfying "WHERE and WHEN" requirement.
- `GET /student/biometric-status` - Check face embedding registration status.
- `POST /student/disputes` / `GET /student/disputes` - Submit attendance correction request.

## 5. IoT Device Endpoints (Device Authentication Required)
- `POST /devices/heartbeat` - Send device heartbeat.
- `POST /attendance/recognize` - Send camera frame for face recognition & attendance creation.
