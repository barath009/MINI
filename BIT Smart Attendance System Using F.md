# BIT SMART ATTENDANCE SYSTEM

## COMPLETE FULL-STACK IMPLEMENTATION PROMPT FOR GOOGLE ANTIGRAVITY

---

# 1. PROJECT TITLE

Build a complete full-stack web application named:

**BIT Smart Attendance System Using Face Recognition and IoT Devices**

Short product name:

**BIT Smart Attendance**

Subtitle:

**Face Recognition & IoT Attendance Management**

---

# 2. IMPORTANT EXECUTION INSTRUCTION

This is NOT a UI-only project.

This is NOT a static React dashboard.

This is NOT a prototype containing fake buttons and hardcoded attendance data.

Build a complete working application containing:

* React frontend
* Node.js backend
* Express.js REST API
* MongoDB database
* Mongoose ODM
* JWT authentication
* bcrypt password hashing
* Role-based access control
* Python face-recognition microservice
* OpenCV
* Face embedding / recognition model
* Raspberry Pi / ESP32-CAM integration architecture
* IoT device authentication
* Device heartbeat
* Attendance session management
* Timetable management
* Faculty-student allocation
* Biometric enrollment
* Facial recognition
* Liveness / anti-spoofing architecture
* Attendance engine
* Realtime Socket.IO updates
* Student dashboard
* Faculty dashboard
* Administration dashboard
* Reports
* Notifications
* Attendance dispute workflow
* Manual attendance correction
* Audit logs
* Responsive design
* Development IoT simulator
* Testing
* Docker support
* Documentation

The complete system must be runnable locally.

---

# 3. MOST IMPORTANT SYSTEM FLOW

The complete working flow must be:

CAMERA

↓

RASPBERRY PI / ESP32-CAM

↓

SECURE DEVICE API

↓

NODE.JS / EXPRESS BACKEND

↓

PYTHON FACE RECOGNITION SERVICE

↓

FACE MATCH + CONFIDENCE + LIVENESS

↓

ATTENDANCE RULE ENGINE

↓

MONGODB

↓

SOCKET.IO

↓

ADMIN DASHBOARD

*

FACULTY DASHBOARD

*

STUDENT DASHBOARD

Do not break this architecture by putting attendance business logic inside the frontend.

---

# 4. SINGLE SOURCE OF TRUTH

**MongoDB must be the only persistent database for this application.**

Do NOT use:

* Firebase
* Firebase Firestore
* Firebase Realtime Database
* Firebase Authentication
* MySQL
* PostgreSQL
* Supabase as the primary database

MongoDB is the application's source of truth.

Use Socket.IO only for realtime delivery.

Use MongoDB for persistence.

Use Node.js for business logic.

Use Python for face recognition.

Use React for the interface.

---

# 5. TECHNOLOGY STACK

## Frontend

Use:

* React
* TypeScript
* Vite
* React Router
* Tailwind CSS
* Axios
* React Hook Form
* Zod
* TanStack Query
* Socket.IO Client
* Recharts

## Backend

Use:

* Node.js
* Express.js
* TypeScript
* Mongoose
* JWT
* bcrypt
* Socket.IO
* Zod
* Helmet
* Rate limiting
* Structured logging

## Database

Use:

* MongoDB
* Mongoose

## Face Recognition

Use:

* Python
* FastAPI or Flask
* OpenCV
* ArcFace / FaceNet / compatible production-oriented embedding model

Keep recognition service separate from Node backend.

## IoT

Support:

* Raspberry Pi
* ESP32-CAM

Use:

* HTTP/REST initially
* MQTT as an optional future extension

## Infrastructure

Use:

* Docker
* docker-compose
* .env configuration

---

# 6. THREE USER ROLES

Implement exactly three primary roles:

1. ADMINISTRATION
2. FACULTY
3. STUDENT

All users authenticate through the same application.

After authentication, the server determines the role.

Do not allow a user to simply select:

Admin

Faculty

Student

from a dropdown and gain access.

Role must come from the authenticated account.

---

# 7. ROLE-BASED ACCESS CONTROL

Implement backend RBAC.

Possible permissions include:

ADMIN_DASHBOARD_VIEW

ADMIN_STUDENT_CREATE

ADMIN_STUDENT_UPDATE

ADMIN_FACULTY_CREATE

ADMIN_ASSIGN_STUDENT

ADMIN_SUBJECT_MANAGE

ADMIN_TIMETABLE_MANAGE

ADMIN_CLASSROOM_MANAGE

ADMIN_DEVICE_MANAGE

ADMIN_SESSION_MANAGE

ADMIN_ATTENDANCE_VIEW

ADMIN_REPORT_VIEW

ADMIN_BIOMETRIC_MANAGE

ADMIN_AUDIT_VIEW

FACULTY_DASHBOARD_VIEW

FACULTY_STUDENT_VIEW

FACULTY_ATTENDANCE_VIEW

FACULTY_ATTENDANCE_OVERRIDE

FACULTY_REPORT_VIEW

STUDENT_DASHBOARD_VIEW

STUDENT_ATTENDANCE_VIEW

STUDENT_PROFILE_VIEW

STUDENT_DISPUTE_CREATE

Backend authorization is mandatory.

Hiding frontend buttons is NOT sufficient security.

---

# 8. ADMINISTRATION ROLE

Administration has institution-level control.

Administration can:

* Add students
* Add faculty
* Edit students
* Edit faculty
* Deactivate users
* Reactivate users
* Assign students to faculty
* Assign students to subjects/sections
* Manage departments
* Manage sections
* Manage subjects
* Manage timetable
* Manage academic periods
* Manage classrooms
* Register IoT devices
* Assign devices to classrooms
* Monitor device health
* Enroll student biometrics
* Re-enroll student biometrics
* Manage attendance sessions
* View institution-wide attendance
* View analytics
* Generate reports
* Export reports
* Configure attendance rules
* Configure recognition thresholds
* View recognition events
* View audit logs
* Manage notifications
* Manage system settings

Only administration can create a new student.

Only administration can create a new faculty account.

Only administration controls official student-faculty allocation.

---

# 9. ADMIN DASHBOARD

Route:

/admin/dashboard

Display:

* Total Students
* Active Students
* Total Faculty
* Active Faculty
* Total Departments
* Total Subjects
* Active Sessions
* Present Today
* Absent Today
* Late Today
* Overall Attendance Percentage
* Online Devices
* Offline Devices
* Pending Biometric Enrollments
* Failed Recognition Attempts
* Low Attendance Students

Also display:

* Recent attendance events
* Recent recognition events
* Recent administrative actions
* Device alerts

---

# 10. ADMIN ANALYTICS

Create charts for:

* Daily attendance trend
* Weekly attendance trend
* Monthly attendance trend
* Department attendance
* Year-wise attendance
* Section-wise attendance
* Subject attendance
* Faculty attendance
* Classroom attendance
* Present vs absent
* Late arrivals
* Low attendance distribution
* Device online/offline statistics
* Recognition success/failure

Do not hardcode chart data.

Every chart must use API/database data.

---

# 11. ADMIN STUDENT MANAGEMENT

Route:

/admin/students

Display:

* Student ID
* Register Number
* Name
* Department
* Year
* Semester
* Section
* Email
* Phone
* Faculty
* Biometric Status
* Account Status

Actions:

* View
* Edit
* Enroll Face
* Re-enroll Face
* Assign Faculty
* Deactivate
* Reactivate
* Reset Password

Use pagination.

Use server-side search.

Use filtering.

---

# 12. ADMIN ADD STUDENT

Only ADMINISTRATION may create a student.

Fields:

* Full name
* Register number
* Roll number
* College email
* Personal email
* Phone
* Department
* Year
* Semester
* Section
* Academic year
* Joining date
* Initial account status
* Password setup

Validation:

* Register number unique
* Roll number unique where applicable
* Email unique
* Valid email
* Valid phone
* Valid department
* Valid section

Do not allow duplicate students.

---

# 13. ADMIN FACULTY MANAGEMENT

Route:

/admin/faculty

Display:

* Faculty ID
* Employee ID
* Name
* Department
* Designation
* Email
* Phone
* Subjects
* Assigned Students
* Status

Actions:

* View
* Edit
* Deactivate
* Reactivate
* Reset password

---

# 14. FACULTY RESPONSIBILITIES

Faculty can:

* View assigned students
* View assigned subjects
* View assigned sections
* View timetable
* View active sessions
* Monitor live attendance
* View attendance history
* View attendance analytics
* Correct attendance through an audited workflow
* Review attendance disputes
* Receive relevant notifications

Faculty cannot:

* Add students
* Delete students
* Add faculty
* Reassign students
* Change official timetable
* Change official classroom mapping
* Manage biometric enrollment unless explicitly authorized

---

# 15. FACULTY DASHBOARD

Route:

/faculty/dashboard

Display:

* Faculty name
* Employee ID
* Today's classes
* Current active class
* Assigned students
* Present today
* Absent today
* Late today
* Attendance percentage
* Live attendance count
* Recent arrivals
* Classroom device status
* Low attendance students

---

# 16. FACULTY STUDENTS

Route:

/faculty/students

Faculty must ONLY see students allocated to them.

Fields:

* Name
* Register Number
* Department
* Year
* Section
* Subject
* Today's Attendance
* Overall Attendance
* Last Attendance Time

Do not permit a faculty member to modify the URL and access another faculty member's students.

---

# 17. FACULTY ATTENDANCE

Route:

/faculty/attendance/:sessionId

Display:

* Subject
* Faculty
* Section
* Classroom
* Date
* Start Time
* End Time
* Session Status
* Total Students
* Present
* Absent
* Late
* Attendance Percentage

Student table:

* Name
* Register number
* Status
* Entry time
* Recognition confidence
* Attendance method

---

# 18. FACULTY MANUAL ATTENDANCE OVERRIDE

Faculty can manually correct attendance ONLY through an audited workflow.

Reasons may include:

* Camera failure
* Face recognition failure
* Network failure
* Student present but not recognized
* Device issue

Manual correction must require:

* Reason
* Remark
* Actor
* Timestamp
* Previous status
* New status

Create an audit log for every change.

Do not silently overwrite original attendance information.

---

# 19. STUDENT ROLE

Students have mostly read-only access.

Students can view:

* Own dashboard
* Own attendance
* Own attendance percentage
* Own subjects
* Own faculty information
* Own attendance history
* Own notifications
* Own biometric enrollment status
* Own attendance disputes

Students cannot:

* Edit attendance
* Change faculty
* Change subject
* Change allocation
* Change timetable
* Access another student's information
* Access faculty pages
* Access administration pages

---

# 20. STUDENT DASHBOARD

Route:

/student/dashboard

Display:

* Student name
* Register number
* Department
* Year
* Section
* Assigned faculty
* Overall attendance
* Present count
* Absent count
* Late count
* Today's attendance
* Current class
* Recent attendance
* Low attendance warning
* Notifications

---

# 21. STUDENT ATTENDANCE HISTORY

Route:

/student/history

Show:

* Date
* Subject
* Faculty
* Classroom
* Time
* Status
* Attendance method

Filters:

* Date
* Subject
* Faculty
* Month
* Status

---

# 22. STUDENT "WHERE AND WHEN" REQUIREMENT

The student must be able to clearly see:

WHERE attendance was recorded.

WHEN attendance was recorded.

FOR WHICH SUBJECT.

WITH WHICH FACULTY.

Example:

Subject:
Database Management Systems

Faculty:
Demo Faculty

Room:
A204

Date:
12 Aug 2026

Time:
09:03 AM

Status:
Present

---

# 23. STUDENT ATTENDANCE ANALYTICS

Display:

* Overall percentage
* Subject-wise percentage
* Weekly percentage
* Monthly percentage
* Present vs absent
* Late arrivals
* Attendance trend

Do not hardcode attendance thresholds.

---

# 24. ATTENDANCE THRESHOLD

Make the threshold configurable.

Example:

Safe:

> = 75%

Warning:

65%–74.99%

Critical:

< 65%

These values must be stored in system settings.

Do not hardcode values throughout frontend code.

---

# 25. FACULTY-STUDENT ALLOCATION

Administration controls allocation.

A faculty can have:

* Multiple students
* Multiple sections
* Multiple subjects

A student can have:

* Multiple faculty members
* Multiple subjects

because different subjects can be handled by different faculty.

Therefore, do NOT model student-faculty relationship as a single permanent field only.

Create allocation entities.

---

# 26. ALLOCATION HISTORY

Store allocation history.

Fields:

* Student
* Faculty
* Subject
* Section
* Academic year
* Semester
* Start date
* End date
* Status

Historical allocation data should remain available for old attendance records.

---

# 27. SUBJECT MANAGEMENT

Administration can create:

* Subject code
* Subject name
* Department
* Semester
* Credits
* Status

---

# 28. TIMETABLE MANAGEMENT

Administration can create:

* Day of week
* Period number
* Subject
* Faculty
* Section
* Classroom
* Start time
* End time
* Academic year
* Semester

---

# 29. PERIOD-BASED ATTENDANCE

Attendance must be session/period based.

Do NOT create only one attendance record per student per day.

A student can have:

08:45 AM → Mathematics

09:40 AM → Physics

10:40 AM → Programming

Each subject/session must have its own attendance.

---

# 30. ATTENDANCE SESSION

Create an attendance session containing:

* Session ID
* Subject
* Faculty
* Section
* Classroom
* Date
* Start time
* End time
* Status
* Grace period
* Academic year
* Semester

Possible statuses:

* SCHEDULED
* ACTIVE
* COMPLETED
* CANCELLED

---

# 31. SESSION VALIDATION

Automated attendance must only be accepted when:

Session is ACTIVE.

Device belongs to session classroom.

Student belongs to session allocation.

Subject matches session.

Faculty matches session.

Attendance window is valid.

---

# 32. ATTENDANCE WINDOW

Make timing configurable.

Example:

Class starts:

09:00

Grace period:

10 minutes

09:00–09:10:

PRESENT

After 09:10:

LATE

After session completion:

No automated attendance

Do not hardcode this behavior.

---

# 33. ABSENT CALCULATION

When a session ends:

Find all eligible students.

Find students who have valid attendance.

Students without attendance become:

ABSENT

Do NOT mark absent if:

* Student was not allocated
* Student was inactive
* Student was withdrawn
* Student was not eligible
* Session was cancelled

---

# 34. CORE ATTENDANCE ENGINE

Create a backend service:

AttendanceService

Responsibilities:

1. Validate device.
2. Validate device-room mapping.
3. Validate session.
4. Validate timetable.
5. Validate student.
6. Validate faculty.
7. Validate subject.
8. Validate allocation.
9. Validate face recognition.
10. Validate confidence.
11. Validate liveness.
12. Validate attendance window.
13. Prevent duplicate attendance.
14. Create attendance.
15. Create recognition event.
16. Create audit event where applicable.
17. Emit Socket.IO event.

---

# 35. FACE BIOMETRIC ENROLLMENT

When administration adds a student:

Start biometric enrollment.

Use browser webcam.

Capture 5–10 samples.

Recommended captures:

* Front
* Slight left
* Slight right
* Slight up
* Slight down
* Normal lighting
* Mild natural variations

---

# 36. FACE CAPTURE VALIDATION

Reject:

* No face
* Multiple faces
* Excessive blur
* Severe darkness
* Overexposure
* Face too small
* Heavy occlusion

Display useful instructions:

"Look directly at the camera."

"Move closer."

"Ensure sufficient lighting."

"Only one person should be visible."

---

# 37. BIOMETRIC STORAGE

Do not expose embeddings to normal APIs.

Create a dedicated:

biometricProfiles

collection.

Store:

* Student ID
* Protected embedding/reference
* Model version
* Enrollment version
* Quality score
* Status
* Enrollment date
* Updated date

Biometric information must be protected.

Avoid unnecessary permanent storage of raw face images.

---

# 38. FACE RECOGNITION SERVICE

Create a separate Python service.

Recommended:

FastAPI

or

Flask

Suggested endpoints:

POST /health

POST /face/detect

POST /face/enroll

POST /face/recognize

POST /face/verify

POST /face/liveness

---

# 39. FACE RECOGNITION PIPELINE

Input:

Image

Recognition service must:

1. Decode image.
2. Validate input.
3. Detect face.
4. Count faces.
5. Check quality.
6. Align face.
7. Generate embedding.
8. Compare against enrolled embeddings.
9. Calculate similarity/confidence.
10. Perform liveness where enabled.
11. Return structured result.

---

# 40. FACE RECOGNITION RESPONSE

Return:

* matched
* studentId
* confidence
* faceDetected
* faceCount
* qualityScore
* livenessPassed
* modelVersion
* processingTime
* reason

Do not return sensitive biometric vectors to the frontend.

---

# 41. UNKNOWN FACE

If no match:

Do not mark attendance.

Create recognition event:

UNKNOWN_FACE

Display appropriate status to authorized users.

---

# 42. LOW CONFIDENCE

If confidence is below threshold:

Do not mark attendance.

Create:

LOW_CONFIDENCE

Recognition must never randomly guess a student.

---

# 43. MULTIPLE FACES

If multiple faces are detected:

Do not randomly mark attendance.

Either process faces individually when safe,

or reject the frame when reliable identification is impossible.

---

# 44. LIVENESS / ANTI-SPOOFING

Implement a modular liveness architecture.

Possible approaches:

* Blink
* Head movement
* Short challenge
* Model-based liveness
* Depth camera in future

The system should reduce:

* Printed photo spoofing
* Phone-screen spoofing
* Simple replay attempts

Never claim perfect anti-spoofing.

---

# 45. IOT DEVICE MANAGEMENT

Each device must have:

* Device ID
* Device name
* Device type
* Classroom
* IP address
* MAC address if available
* API credential
* Status
* Camera status
* Firmware version
* Last heartbeat
* Created time
* Updated time

---

# 46. RASPBERRY PI / ESP32 ARCHITECTURE

Preferred:

Raspberry Pi + camera

because it can support heavier processing.

ESP32-CAM can act as:

* Camera
* Trigger device
* Sensor controller
* Network capture device

The system should support both.

---

# 47. IOT DEVICE WORKFLOW

Camera captures frame.

Device sends:

* deviceId
* eventId
* timestamp
* image

Backend authenticates device.

Backend determines active session.

Backend calls face service.

Face service returns match.

Backend validates attendance rules.

Backend stores attendance.

Backend emits realtime event.

---

# 48. DEVICE HEARTBEAT

Every device must send periodic heartbeat.

Heartbeat payload:

* deviceId
* timestamp
* roomId
* cameraStatus
* softwareVersion
* networkStatus

Store:

lastHeartbeat

If heartbeat is missed:

Mark:

OFFLINE

---

# 49. DEVICE STATUS

Support:

ONLINE

OFFLINE

DEGRADED

MAINTENANCE

Show status in admin dashboard.

---

# 50. DEVICE API

Create:

POST /api/v1/devices/heartbeat

POST /api/v1/devices/status

POST /api/v1/attendance/recognize

POST /api/v1/devices/events

Every device endpoint must require device authentication.

---

# 51. IOT CLIENT

Create:

iot-client/

Include:

camera.py

device_config.py

heartbeat.py

recognition_client.py

offline_queue.py

logger.py

main.py

The client should support:

* Camera initialization
* Frame capture
* Backend communication
* Heartbeat
* Retry
* Offline queue
* Event ID
* Logging

---

# 52. IOT SIMULATOR

Create:

iot-simulator/

The simulator must support:

* Device registration
* Heartbeat
* Send recognized face
* Unknown face
* Low confidence
* Multiple-face event
* Liveness failure
* Duplicate request
* Device offline simulation

Use the same backend APIs as a physical device.

Do not create a separate fake attendance pathway.

---

# 53. DEVELOPMENT FACE MODE

Create configuration:

FACE_RECOGNITION_MODE=mock

and:

FACE_RECOGNITION_MODE=real

Mock mode is only for development/testing.

Production mode must use the real recognition service.

---

# 54. DATABASE ARCHITECTURE

Use MongoDB only.

Use Mongoose.

Collections:

users

students

faculty

departments

sections

subjects

facultySubjectAssignments

studentFacultyAssignments

classAllocations

timetables

classrooms

iotDevices

biometricProfiles

attendanceSessions

attendanceRecords

recognitionEvents

notifications

attendanceDisputes

auditLogs

systemSettings

---

# 55. USER MODEL

Fields:

_id

name

email

passwordHash

role

phone

status

createdAt

updatedAt

lastLoginAt

---

# 56. STUDENT MODEL

Fields:

_id

userId

rollNumber

registerNumber

departmentId

sectionId

year

semester

academicYear

biometricStatus

enrollmentDate

status

---

# 57. FACULTY MODEL

Fields:

_id

userId

employeeId

departmentId

designation

status

---

# 58. CLASS ALLOCATION MODEL

Fields:

_id

facultyId

studentId

subjectId

sectionId

academicYear

semester

startDate

endDate

status

---

# 59. SUBJECT MODEL

Fields:

_id

code

name

departmentId

semester

credits

status

---

# 60. TIMETABLE MODEL

Fields:

_id

subjectId

facultyId

sectionId

classroomId

dayOfWeek

periodNumber

startTime

endTime

academicYear

semester

status

---

# 61. CLASSROOM MODEL

Fields:

_id

building

roomNumber

floor

capacity

status

---

# 62. IOT DEVICE MODEL

Fields:

_id

deviceId

deviceName

deviceType

classroomId

ipAddress

macAddress

apiKeyHash

status

cameraStatus

firmwareVersion

lastHeartbeat

createdAt

updatedAt

---

# 63. BIOMETRIC PROFILE MODEL

Fields:

_id

studentId

protectedEmbedding

embeddingReference

modelVersion

enrollmentVersion

qualityScore

enrollmentStatus

enrolledAt

updatedAt

---

# 64. ATTENDANCE SESSION MODEL

Fields:

_id

subjectId

facultyId

sectionId

classroomId

date

startTime

endTime

status

gracePeriodMinutes

academicYear

semester

createdAt

updatedAt

---

# 65. ATTENDANCE RECORD MODEL

Fields:

_id

studentId

sessionId

subjectId

facultyId

sectionId

classroomId

deviceId

date

timestamp

status

markedBy

recognitionMethod

confidenceScore

eventId

createdAt

updatedAt

---

# 66. ATTENDANCE UNIQUE INDEX

Create a MongoDB unique index equivalent to:

studentId + sessionId

This is mandatory.

A student must NOT receive duplicate attendance for the same session.

The database must protect against concurrent requests.

---

# 67. RECOGNITION EVENT MODEL

Fields:

_id

eventId

deviceId

studentId

timestamp

faceDetected

faceCount

confidence

qualityScore

livenessPassed

result

failureReason

modelVersion

processingTime

---

# 68. NOTIFICATION MODEL

Fields:

_id

userId

title

message

type

priority

readStatus

createdAt

---

# 69. ATTENDANCE DISPUTE MODEL

Fields:

_id

studentId

attendanceId

reason

evidenceReference

status

submittedAt

reviewedBy

reviewedAt

reviewRemark

---

# 70. AUDIT LOG MODEL

Fields:

_id

actorId

action

targetEntity

targetId

details

timestamp

ipAddress

userAgent

---

# 71. SYSTEM SETTINGS MODEL

Store configurable values such as:

* Attendance threshold
* Warning threshold
* Critical threshold
* Recognition threshold
* Liveness threshold
* Grace period
* Session duration
* Device heartbeat timeout
* Notification frequency
* Face quality threshold

---

# 72. REQUIRED MONGODB INDEXES

Create indexes for:

students.registerNumber

students.userId

students.departmentId

students.sectionId

faculty.employeeId

faculty.userId

attendanceRecords.studentId

attendanceRecords.sessionId

attendanceRecords.subjectId

attendanceRecords.facultyId

attendanceRecords.classroomId

attendanceRecords.deviceId

attendanceRecords.date

attendanceRecords.timestamp

iotDevices.deviceId

iotDevices.classroomId

iotDevices.lastHeartbeat

recognitionEvents.deviceId

recognitionEvents.studentId

recognitionEvents.timestamp

notifications.userId

notifications.readStatus

auditLogs.actorId

auditLogs.timestamp

---

# 73. MONGODB AGGREGATION

Use aggregation pipelines for analytics.

Examples:

Daily attendance

Weekly attendance

Monthly attendance

Subject attendance

Faculty attendance

Department attendance

Section attendance

Student attendance

Low attendance

Present/absent/late

Device health

Recognition success/failure

Do not load massive datasets into Node.js unnecessarily.

---

# 74. DATABASE TRANSACTIONS

Use MongoDB transactions where multiple writes must be consistent.

Attendance creation should safely coordinate:

* Attendance
* Recognition event
* Audit event where needed
* Related updates

Use database constraints to prevent duplicate attendance.

---

# 75. AUTHENTICATION

Use:

JWT

Refresh tokens

bcrypt

Secure cookies where appropriate

Token expiration

Refresh rotation

Logout

Password change

Password reset architecture

Do not store plain passwords.

---

# 76. AUTH API

POST /api/v1/auth/login

POST /api/v1/auth/logout

POST /api/v1/auth/refresh-token

GET /api/v1/auth/me

POST /api/v1/auth/change-password

---

# 77. ADMIN API

POST /api/v1/admin/students

GET /api/v1/admin/students

GET /api/v1/admin/students/:id

PUT /api/v1/admin/students/:id

DELETE /api/v1/admin/students/:id

POST /api/v1/admin/faculty

GET /api/v1/admin/faculty

PUT /api/v1/admin/faculty/:id

POST /api/v1/admin/allocations

PUT /api/v1/admin/allocations/:id

DELETE /api/v1/admin/allocations/:id

---

# 78. ADMIN SUBJECT API

POST /api/v1/admin/subjects

GET /api/v1/admin/subjects

PUT /api/v1/admin/subjects/:id

DELETE /api/v1/admin/subjects/:id

---

# 79. ADMIN TIMETABLE API

POST /api/v1/admin/timetable

GET /api/v1/admin/timetable

PUT /api/v1/admin/timetable/:id

DELETE /api/v1/admin/timetable/:id

---

# 80. ADMIN CLASSROOM API

POST /api/v1/admin/classrooms

GET /api/v1/admin/classrooms

PUT /api/v1/admin/classrooms/:id

DELETE /api/v1/admin/classrooms/:id

---

# 81. ADMIN SESSION API

POST /api/v1/admin/sessions

GET /api/v1/admin/sessions

GET /api/v1/admin/sessions/:id

PUT /api/v1/admin/sessions/:id

POST /api/v1/admin/sessions/:id/start

POST /api/v1/admin/sessions/:id/end

---

# 82. ADMIN DEVICE API

POST /api/v1/admin/devices

GET /api/v1/admin/devices

GET /api/v1/admin/devices/:id

PUT /api/v1/admin/devices/:id

POST /api/v1/admin/devices/:id/disable

GET /api/v1/admin/devices/status

---

# 83. FACULTY API

GET /api/v1/faculty/students

GET /api/v1/faculty/classes

GET /api/v1/faculty/attendance

GET /api/v1/faculty/attendance/:id

PUT /api/v1/faculty/attendance/:id/override

GET /api/v1/faculty/analytics

GET /api/v1/faculty/reports

GET /api/v1/faculty/disputes

PUT /api/v1/faculty/disputes/:id

---

# 84. STUDENT API

GET /api/v1/student/profile

GET /api/v1/student/attendance

GET /api/v1/student/attendance/summary

GET /api/v1/student/subjects

GET /api/v1/student/notifications

GET /api/v1/student/biometric-status

POST /api/v1/student/disputes

GET /api/v1/student/disputes

---

# 85. DEVICE API

POST /api/v1/devices/heartbeat

POST /api/v1/devices/status

POST /api/v1/attendance/recognize

POST /api/v1/devices/events

---

# 86. FACE SERVICE API

POST /face/detect

POST /face/enroll

POST /face/recognize

POST /face/verify

POST /face/liveness

GET /health

---

# 87. API RESPONSE FORMAT

Success:

{
"success": true,
"message": "Attendance recorded successfully",
"data": {}
}

Error:

{
"success": false,
"message": "Attendance already recorded",
"errorCode": "ATTENDANCE_DUPLICATE"
}

Use appropriate HTTP status codes.

---

# 88. REALTIME SOCKET.IO

Use Socket.IO.

Events:

attendance.created

attendance.updated

attendance.corrected

notification.created

device.online

device.offline

recognition.failed

session.started

session.ended

---

# 89. REALTIME SECURITY

Authenticate Socket.IO clients.

Do not broadcast every attendance event to every browser.

Students receive only their relevant events.

Faculty receive events for their assigned sessions.

Admin can receive institution-wide events.

---

# 90. NOTIFICATION SYSTEM

Store notifications in MongoDB.

Socket.IO immediately delivers new notifications.

Workflow:

MongoDB notification created

↓

Socket.IO event

↓

Authorized client receives event

↓

Notification remains stored in MongoDB

Therefore offline users can still see notifications when they return.

---

# 91. LOW ATTENDANCE NOTIFICATIONS

Create a scheduled backend job.

Calculate attendance.

If student falls below configured threshold:

Create notification.

Avoid duplicate notifications.

Faculty sees relevant student alerts.

Admin sees institution-level defaulters.

---

# 92. ATTENDANCE DISPUTE WORKFLOW

Student submits dispute.

Faculty/admin receives dispute.

Review:

* Attendance
* Session
* Reason
* Evidence reference

Decision:

APPROVED

or

REJECTED

Every action is audited.

---

# 93. STUDENT ATTENDANCE CONFIRMATION

When attendance is recorded:

Student receives:

"Attendance recorded at 09:03 AM in A204."

---

# 94. FACULTY LIVE ATTENDANCE

When recognition succeeds:

Faculty dashboard updates without page refresh.

Display:

Student

Register Number

Time

Room

Subject

Status

---

# 95. ADMIN LIVE MONITORING

Admin can see:

Active sessions

Present count

Recognition events

Device status

Attendance events

System health

---

# 96. FRONTEND ROUTES

/login

/admin/dashboard

/admin/students

/admin/faculty

/admin/allocations

/admin/departments

/admin/sections

/admin/subjects

/admin/timetable

/admin/classrooms

/admin/devices

/admin/sessions

/admin/attendance

/admin/reports

/admin/biometric

/admin/audit

/admin/notifications

/admin/settings

/faculty/dashboard

/faculty/classes

/faculty/students

/faculty/attendance/:sessionId

/faculty/analytics

/faculty/reports

/faculty/disputes

/faculty/notifications

/student/dashboard

/student/history

/student/subjects

/student/analytics

/student/notifications

/student/profile

/student/biometric-status

/student/disputes

---

# 97. ADMIN NAVIGATION

Dashboard

Students

Faculty

Assignments

Departments

Sections

Subjects

Timetable

Classrooms

Devices

Sessions

Attendance

Reports

Biometric

Audit Logs

Notifications

Settings

---

# 98. FACULTY NAVIGATION

Dashboard

My Classes

My Students

Attendance

Analytics

Reports

Disputes

Notifications

Profile

---

# 99. STUDENT NAVIGATION

Dashboard

My Attendance

Subjects

Analytics

Notifications

Profile

Biometric Status

Disputes

---

# 100. LOGIN EXPERIENCE

Create professional unified login.

Fields:

College Email / Username

Password

Login

Forgot Password

No role selection.

After login:

Admin → Admin Dashboard

Faculty → Faculty Dashboard

Student → Student Dashboard

---

# 101. UI DESIGN

Design should look like a professional campus-management product.

Use:

* Clean typography
* Consistent spacing
* Cards
* Tables
* Charts
* Badges
* Responsive sidebar
* Top navbar
* Profile menu
* Notification center
* Search
* Filters
* Dialogs

Avoid excessive gradients and excessive animations.

---

# 102. RESPONSIVE DESIGN

Support:

320px

375px

390px

430px

768px

1024px

1280px

1440px

1920px

No horizontal page overflow.

On mobile:

* Sidebar collapses
* Tables become cards or scroll safely
* Filters stack
* Forms become one-column
* Charts resize
* Modals fit
* Buttons remain touch-friendly

---

# 103. ACCESSIBILITY

Use:

Semantic HTML

Proper labels

Keyboard navigation

Visible focus

Accessible dialogs

Readable typography

Good contrast

Status should not rely on color alone.

---

# 104. LOADING STATES

Implement:

Skeleton loaders

Table loading

Chart loading

Button loading

Page loading

Recognition loading

Camera loading

---

# 105. EMPTY STATES

Implement:

No students

No attendance

No sessions

No devices

No notifications

No reports

No biometric enrollment

No disputes

---

# 106. ERROR STATES

Handle:

400

401

403

404

409

422

429

500

503

Do not expose backend stack traces.

---

# 107. SEARCH AND FILTERING

Student:

Name

Register number

Department

Year

Section

Faculty

Status

Attendance:

Date

Subject

Faculty

Section

Classroom

Status

Faculty:

Name

Employee ID

Department

---

# 108. PAGINATION

Use server-side pagination.

Support:

page

pageSize

search

sortBy

sortOrder

filters

---

# 109. REPORTS

Reports:

Daily attendance

Weekly attendance

Monthly attendance

Department attendance

Year attendance

Section attendance

Subject attendance

Faculty attendance

Student attendance

Classroom attendance

Low-attendance list

Late arrivals

Recognition events

Device activity

---

# 110. EXPORT

Support:

CSV

Excel-compatible export

PDF report generation

Use live MongoDB data.

---

# 111. REPORT FILTERS

Allow:

Date range

Department

Year

Section

Subject

Faculty

Classroom

Status

---

# 112. AUDIT LOGS

Audit:

* Student created
* Faculty created
* Assignment changed
* Biometric enrolled
* Biometric re-enrolled
* Attendance corrected
* Device created
* Device disabled
* Session changed
* User deactivated
* Password reset
* Dispute reviewed

---

# 113. SECURITY

Implement:

* bcrypt
* JWT
* Refresh token rotation
* Authorization middleware
* Helmet
* CORS
* Rate limiting
* Secure cookies where applicable
* Device credentials
* Input validation
* Audit logging
* HTTPS production configuration

---

# 114. IDOR PROTECTION

Test:

Student A cannot access Student B.

Faculty A cannot access Faculty B's students.

Faculty cannot edit another faculty's attendance.

Student cannot access admin routes.

Student cannot access faculty routes.

---

# 115. DEVICE SECURITY

Device authentication required.

Never trust deviceId alone.

Do not allow arbitrary attendance submissions.

Store protected credentials.

Use API credential rotation architecture.

---

# 116. IMAGE SECURITY

Validate:

* MIME
* Extension
* File size
* Resolution

Do not store uploaded images in public web folders.

---

# 117. BIOMETRIC SECURITY

Do not expose:

* Face embeddings
* Private biometric vectors
* Internal biometric service data

Do not return them in:

* Student API
* Faculty API
* Student list
* Attendance list

Use dedicated internal service access.

---

# 118. TIMEZONE

Store timestamps consistently.

Use UTC internally when appropriate.

Display campus timezone:

Asia/Kolkata

The backend is authoritative for attendance time.

---

# 119. SERVER TIME

Do not trust device-reported time for the final attendance timestamp.

The backend determines the official timestamp.

---

# 120. ATTENDANCE IDEMPOTENCY

Every recognition request must contain unique:

eventId

Submitting the same event more than once must not create duplicate attendance.

---

# 121. ERROR CODES

Create standardized errors:

AUTH_INVALID

AUTH_FORBIDDEN

USER_INACTIVE

STUDENT_NOT_FOUND

FACULTY_NOT_FOUND

SESSION_INVALID

SESSION_INACTIVE

DEVICE_UNAUTHORIZED

DEVICE_OFFLINE

FACE_NOT_DETECTED

MULTIPLE_FACES

FACE_UNKNOWN

FACE_LOW_CONFIDENCE

LIVENESS_FAILED

ATTENDANCE_DUPLICATE

ATTENDANCE_REJECTED

---

# 122. DEVELOPMENT SEED DATA

Create fake development data:

1 Admin

2–3 Faculty

10–20 Students

3 Departments

Multiple Sections

5+ Subjects

3 Classrooms

3 IoT Devices

Multiple Timetable entries

Multiple Sessions

Sample attendance

Sample notifications

Sample disputes

Use fake data only.

---

# 123. DEMO CREDENTIALS

Provide development credentials in README.

Clearly label:

DEVELOPMENT ONLY

Never use these credentials for production.

---

# 124. DEMO CLASS

Create a sample development class:

Subject:

Database Management Systems

Faculty:

Demo Faculty

Room:

A204

Section:

Demo Section

Use dynamic/current development dates rather than permanently hardcoded attendance dates.

---

# 125. DEMO WORKFLOW

Admin logs in.

Admin creates a student.

Admin creates faculty.

Admin assigns student.

Admin creates subject.

Admin creates timetable.

Admin creates classroom.

Admin registers device.

Admin enrolls student's face.

Admin creates session.

Faculty opens session.

Student dashboard is opened in another browser.

IoT simulator sends face event.

Face is recognized.

Attendance is created.

Faculty receives realtime update.

Student receives realtime update.

Admin analytics update.

Session ends.

Absent records are generated.

Report is generated.

---

# 126. FRONTEND STRUCTURE

Use:

frontend/

src/

components/

layouts/

pages/

pages/admin/

pages/faculty/

pages/student/

features/

services/

hooks/

context/

types/

lib/

utils/

routes/

assets/

---

# 127. BACKEND STRUCTURE

Use:

backend/

src/

config/

controllers/

routes/

services/

middleware/

validators/

models/

database/

modules/

utils/

types/

errors/

jobs/

---

# 128. FACE SERVICE STRUCTURE

Use:

face-recognition-service/

app/

routes/

services/

models/

utils/

config/

tests/

requirements.txt

Dockerfile

---

# 129. IOT CLIENT STRUCTURE

Use:

iot-client/

camera/

network/

recognition/

queue/

config/

logging/

tests/

---

# 130. IOT SIMULATOR STRUCTURE

Use:

iot-simulator/

src/

config/

device/

recognition/

scenarios/

tests/

---

# 131. DATABASE STRUCTURE

Use:

database/

seed/

scripts/

migrations-or-index-setup/

---

# 132. DOCKER COMPOSE

docker-compose should contain:

frontend

backend

mongodb

face-recognition-service

iot-simulator

Do NOT add:

* mysql
* postgres
* firebase services

---

# 133. MONGODB CONFIGURATION

Use:

MONGODB_URI=mongodb://localhost:27017/bit-smart-attendance

MONGODB_DB_NAME=bit-smart-attendance

Support Docker MongoDB URI as well.

---

# 134. ENVIRONMENT VARIABLES

Create:

.env.example

Include:

MONGODB_URI

MONGODB_DB_NAME

JWT_SECRET

JWT_REFRESH_SECRET

FACE_SERVICE_URL

FACE_SERVICE_API_KEY

DEVICE_API_SECRET

SOCKET_URL

APP_TIMEZONE

FACE_RECOGNITION_MODE

RECOGNITION_THRESHOLD

LIVENESS_THRESHOLD

ATTENDANCE_GRACE_PERIOD

LOW_ATTENDANCE_THRESHOLD

---

# 135. NO FIREBASE

Search the project after implementation.

Confirm there is no:

firebase dependency

firebase-admin dependency

Firestore integration

Realtime Database integration

Firebase authentication

Firebase configuration

If any exists, remove it unless explicitly required by another future feature.

---

# 136. README

Create a detailed README including:

Project overview

Features

Architecture

Technology stack

Installation

MongoDB setup

Environment setup

Database initialization

Seed data

Frontend startup

Backend startup

Face service startup

IoT simulator

Docker

Testing

Demo credentials

Hardware integration

Troubleshooting

Security notes

Deployment

---

# 137. ARCHITECTURE DOCUMENT

Create:

docs/architecture.md

Include Mermaid diagrams.

Show:

React

Node.js

MongoDB

Face Recognition Service

IoT Device

Socket.IO

Browser clients

---

# 138. ATTENDANCE SEQUENCE DIAGRAM

Create Mermaid sequence diagram:

Student/Camera

↓

IoT Device

↓

Backend

↓

Face Service

↓

Attendance Service

↓

MongoDB

↓

Socket.IO

↓

Faculty Browser

↓

Student Browser

Show:

Success

Duplicate

Unknown face

Low confidence

Liveness failed

---

# 139. SECURITY DOCUMENT

Create:

docs/security.md

Explain:

Authentication

Authorization

Device security

Biometric protection

API security

Rate limiting

Audit logs

Secrets

Data retention

---

# 140. FACE RECOGNITION DOCUMENT

Create:

docs/face-recognition.md

Explain:

Enrollment

Embedding generation

Recognition

Confidence

Liveness

Unknown face

Low confidence

Model versioning

Threshold configuration

Privacy considerations

---

# 141. IOT DOCUMENT

Create:

docs/iot.md

Explain:

Raspberry Pi setup

ESP32-CAM architecture

Camera capture

Device authentication

Heartbeat

Recognition API

Offline queue

Simulator

Hardware replacement path

---

# 142. API DOCUMENT

Create:

docs/api.md

Document:

Authentication

Admin APIs

Faculty APIs

Student APIs

Device APIs

Face APIs

Request payloads

Response payloads

Errors

Authorization

---

# 143. DEPLOYMENT DOCUMENT

Create:

docs/deployment.md

Explain:

Build

Docker

MongoDB

Environment variables

Face service

Backend

Frontend

IoT configuration

Production HTTPS

Secrets

---

# 144. TESTING

Create automated tests.

## Backend tests

Test:

Authentication

Authorization

Students

Faculty

Assignments

Timetable

Sessions

Attendance

Devices

Notifications

Disputes

Reports

Audit

## Face tests

Test:

No face

One face

Multiple faces

Known face

Unknown face

Low confidence

Liveness failure

Poor-quality image

Invalid request

## Frontend tests

Test:

Login

Role redirect

Protected routes

Student creation

Faculty creation

Assignment

Attendance display

Realtime updates

Notifications

Mobile navigation

---

# 145. SECURITY TESTS

Test:

Invalid JWT

Expired JWT

Wrong role

IDOR

Unauthorized device

Malformed request

Rate limiting

Duplicate event

Inactive device

Inactive student

---

# 146. END-TO-END TEST

Test this exact sequence:

1. Admin logs in.
2. Admin creates student.
3. Admin creates faculty.
4. Admin assigns student.
5. Admin creates subject.
6. Admin creates timetable.
7. Admin creates classroom.
8. Admin registers device.
9. Admin enrolls face.
10. Admin creates session.
11. Faculty opens session.
12. IoT simulator sends image.
13. Face service detects face.
14. Face service recognizes student.
15. Backend validates confidence.
16. Backend validates liveness.
17. Backend validates session.
18. Backend validates timetable.
19. Backend validates classroom.
20. Backend validates allocation.
21. Backend validates device.
22. Backend checks duplicate.
23. Attendance is created.
24. MongoDB stores attendance.
25. Socket.IO emits event.
26. Faculty receives event.
27. Student receives event.
28. Admin analytics update.
29. Student sees room.
30. Student sees time.
31. Student sees subject.
32. Student sees faculty.
33. Duplicate recognition does not duplicate attendance.
34. Unknown face does not create attendance.
35. Low-confidence recognition does not create attendance.
36. Unauthorized device does not create attendance.
37. Inactive student does not create attendance.
38. Session ends.
39. Eligible missing students become absent.
40. Reports update.

---

# 147. MANUAL OVERRIDE TEST

Simulate camera failure.

Faculty opens attendance.

Faculty manually marks student present.

Faculty enters reason.

Attendance is corrected.

Audit record is created.

Student sees updated result where appropriate.

---

# 148. DISPUTE TEST

Student:

Creates dispute.

Faculty:

Receives dispute.

Faculty:

Approves or rejects.

System:

Creates audit event.

If approved:

Attendance is corrected.

---

# 149. DEVICE FAILURE TEST

Stop heartbeat.

Device becomes offline.

Admin sees offline.

Faculty assigned to that room sees device warning.

Attendance from disabled device is rejected.

---

# 150. FACE SERVICE FAILURE TEST

Stop face service.

Recognition request fails.

Attendance is NOT created.

System logs recognition failure.

UI displays meaningful error.

---

# 151. NETWORK FAILURE TEST

Disconnect IoT simulator.

Queue event.

Restore network.

Synchronize.

Prevent duplicates.

---

# 152. RESPONSIVE TESTING

Test:

390 × 844

768 × 1024

1440 × 900

Verify:

No horizontal overflow.

No broken tables.

No clipped modals.

No hidden buttons.

No unreadable charts.

---

# 153. PERFORMANCE

Optimize:

MongoDB indexes

MongoDB aggregations

Pagination

Query projections

React code splitting

Lazy loading

Image compression

Controlled camera frame rate

Embedding cache where appropriate

---

# 154. SCALABILITY

The architecture should support future expansion to:

Multiple departments

Multiple buildings

Hundreds/thousands of students

Multiple IoT devices

Multiple concurrent classrooms

Multiple faculty sessions

The code should not assume only one classroom or one faculty.

---

# 155. LOGGING

Use structured logs.

Include:

Timestamp

Service

Request ID

User ID where appropriate

Device ID

Endpoint

Duration

Result

Error code

Never log:

Passwords

Biometric vectors

Sensitive private tokens

Unnecessary camera images

---

# 156. HEALTH CHECKS

Backend:

GET /health

Face service:

GET /health

MongoDB:

Database health check

IoT:

Heartbeat

Admin dashboard should show service health.

---

# 157. SOFT DELETE

Prefer soft deletion for historical entities.

Use:

status

isActive

or

deletedAt

for:

Students

Faculty

Devices

Subjects

Classrooms

Do not destroy historical attendance unnecessarily.

---

# 158. DATA RETENTION

Attendance should remain according to institutional requirements.

Recognition event retention can be shorter.

Raw face images should not be stored forever unless explicitly required.

Make retention configurable.

---

# 159. NO HARDCODED BUSINESS DATA

Do NOT hardcode:

Students

Faculty

Attendance

Dashboard numbers

Device statuses

Charts

Reports

Subject percentages

All real data must come through backend/MongoDB.

Development seed data is acceptable.

---

# 160. NO FAKE FUNCTIONALITY

Do not leave required buttons saying:

Coming Soon

Not Implemented

Required workflows must work.

If physical hardware is unavailable:

Implement a real IoT simulator using the exact device API.

If production face recognition cannot run locally:

Implement real recognition service architecture plus development mock mode.

---

# 161. WINDOWS COMPATIBILITY

The primary development machine may be Windows.

Provide:

PowerShell-friendly commands.

Docker option.

Avoid requiring only Linux commands without alternatives.

---

# 162. DEVELOPMENT COMMANDS

Create a simple documented workflow.

Prefer:

npm run dev

or a project-level orchestration command.

The developer should not need to manually start a large number of processes every time.

---

# 163. BUILD CHECK

Before completion:

Run frontend build.

Run backend build.

Run Python tests.

Run MongoDB connection.

Verify indexes.

Run seed.

Run unit tests.

Run integration tests.

Run end-to-end tests.

---

# 164. BROWSER VERIFICATION

Use browser testing to verify:

Admin login

Student creation

Faculty creation

Allocation

Biometric enrollment

Subject

Timetable

Classroom

Device

Session

Recognition

Attendance

Faculty realtime update

Student realtime update

Admin analytics

Reports

Notifications

Disputes

---

# 165. FINAL UI QUALITY

The product should feel like a genuine campus software system.

Avoid:

* Generic dashboard clutter
* Random colors
* Excessive gradients
* Excessive animation
* Inconsistent components
* Unnecessary popups

Prioritize:

* Clarity
* Speed
* Accessibility
* Consistency
* Responsive design
* Professional appearance

---

# 166. FINAL PROJECT BRANDING

Use:

BIT Smart Attendance

Subtitle:

Face Recognition & IoT Attendance Management

Create a simple professional logo treatment.

Do not over-design the branding.

---

# 167. ADMIN MOST IMPORTANT INFORMATION

Admin dashboard should immediately show:

* Present today
* Absent today
* Active sessions
* Offline devices
* Low attendance students
* Pending biometric enrollment
* Recent recognition activity

---

# 168. FACULTY MOST IMPORTANT INFORMATION

Faculty dashboard should immediately show:

* Current class
* Present count
* Absent count
* Live feed
* Device status
* Low attendance students

---

# 169. STUDENT MOST IMPORTANT INFORMATION

Student dashboard should immediately show:

* Overall attendance
* Today's classes
* Today's attendance
* Subject attendance
* Warnings
* Recent records

---

# 170. FINAL APPLICATION DATA FLOW

Final production architecture:

CAMERA

↓

IOT DEVICE

↓

DEVICE AUTHENTICATION

↓

NODE / EXPRESS API

↓

PYTHON FACE RECOGNITION

↓

RECOGNITION RESULT

↓

ATTENDANCE RULE ENGINE

↓

MONGODB

↓

SOCKET.IO

↓

ADMIN

*

FACULTY

*

STUDENT

---

# 171. FINAL ACCEPTANCE REQUIREMENTS

The application is incomplete unless all of these work:

Frontend

Backend

MongoDB

Authentication

RBAC

Admin

Faculty

Student

Student creation

Faculty creation

Assignment

Subject

Timetable

Classroom

Device

Heartbeat

Biometric enrollment

Face recognition

Liveness architecture

Session management

Attendance engine

Duplicate prevention

Realtime updates

Reports

Notifications

Manual correction

Attendance dispute

Audit logs

Responsive UI

Testing

Documentation

Docker

IoT simulator

---

# 172. IMPORTANT HARDWARE REQUIREMENT

The final project must support:

1. Real Raspberry Pi / camera path

2. Real ESP32-CAM-compatible architecture

3. Development IoT simulator

The simulator must use the same backend API contract as real hardware.

Do NOT build two different attendance systems.

---

# 173. IMPORTANT FACE RECOGNITION REQUIREMENT

Do NOT fake face recognition using:

image filename

student ID in request

hardcoded mapping

manual student selection

The real recognition pipeline must work from face images.

Mock mode is allowed ONLY for development/testing.

---

# 174. IMPORTANT DATABASE REQUIREMENT

MongoDB is the ONLY persistent database.

Do not add Firebase.

Do not add MySQL.

Do not add PostgreSQL.

Do not create unnecessary database duplication.

Socket.IO is not a database.

---

# 175. IMPORTANT BUSINESS LOGIC REQUIREMENT

The backend is the final authority.

The frontend cannot directly mark attendance.

The IoT device cannot directly insert attendance.

The face service cannot directly decide attendance.

The correct flow is:

Face service identifies candidate.

↓

Backend validates business rules.

↓

Backend creates attendance.

---

# 176. IMPORTANT SECURITY REQUIREMENT

The following must NEVER happen:

Student accessing another student's attendance.

Faculty accessing another faculty's students.

Student changing attendance.

Faculty changing allocation.

Unknown device creating attendance.

Inactive device creating attendance.

Inactive student receiving attendance.

Duplicate recognition creating duplicate attendance.

Client-controlled timestamp becoming official attendance time.

Client-controlled classroom becoming official attendance location.

---

# 177. ANTIGRAVITY WORKING METHOD

First inspect the current workspace.

Determine existing project structure.

Do NOT blindly delete existing work.

Create an implementation plan.

Then implement phase-by-phase.

After each major feature:

Run it.

Build it.

Test it.

Debug it.

Continue only after fixing obvious issues.

---

# 178. IMPLEMENTATION PHASES

PHASE 1:

Workspace inspection and architecture.

PHASE 2:

React project setup.

PHASE 3:

Node/Express backend.

PHASE 4:

MongoDB + Mongoose models.

PHASE 5:

Indexes and seed data.

PHASE 6:

Authentication.

PHASE 7:

RBAC.

PHASE 8:

Admin APIs.

PHASE 9:

Faculty APIs.

PHASE 10:

Student APIs.

PHASE 11:

Departments/sections/subjects.

PHASE 12:

Timetable.

PHASE 13:

Classrooms.

PHASE 14:

Sessions.

PHASE 15:

Attendance service.

PHASE 16:

Face recognition service.

PHASE 17:

Biometric enrollment.

PHASE 18:

IoT device APIs.

PHASE 19:

IoT simulator.

PHASE 20:

Socket.IO.

PHASE 21:

Admin dashboard.

PHASE 22:

Faculty dashboard.

PHASE 23:

Student dashboard.

PHASE 24:

Reports.

PHASE 25:

Notifications.

PHASE 26:

Disputes.

PHASE 27:

Audit.

PHASE 28:

Security testing.

PHASE 29:

Responsive testing.

PHASE 30:

Docker.

PHASE 31:

End-to-end verification.

---

# 179. FINAL ANTIGRAVITY INSTRUCTION

Act as:

* Senior Full-Stack Engineer
* Senior React Engineer
* Node.js Engineer
* MongoDB Engineer
* Python Computer Vision Engineer
* IoT Engineer
* Security Engineer
* QA Engineer
* DevOps Engineer
* UI/UX Engineer

Do not merely explain what should be built.

Build it.

Run it.

Test it.

Debug it.

Verify it.

Use the requirements in this prompt as the source of truth.

Make sensible implementation decisions without repeatedly asking for approval.

When a requirement depends on hardware, provide both:

REAL HARDWARE INTEGRATION

and

DEVELOPMENT SIMULATOR

At the end, perform the complete acceptance test.

---

# 180. FINAL END-TO-END ACCEPTANCE TEST

The final system must successfully demonstrate:

ADMIN LOGIN

↓

CREATE STUDENT

↓

CREATE FACULTY

↓

ASSIGN STUDENT TO FACULTY/SUBJECT/SECTION

↓

CREATE CLASSROOM

↓

CREATE SUBJECT

↓

CREATE TIMETABLE

↓

REGISTER IOT DEVICE

↓

ENROLL STUDENT FACE

↓

CREATE ATTENDANCE SESSION

↓

START SESSION

↓

CAMERA CAPTURES FACE

↓

IOT DEVICE SENDS IMAGE

↓

BACKEND AUTHENTICATES DEVICE

↓

FACE SERVICE DETECTS FACE

↓

FACE SERVICE CREATES EMBEDDING

↓

FACE SERVICE MATCHES STUDENT

↓

CONFIDENCE VALIDATED

↓

LIVENESS VALIDATED

↓

TIMETABLE VALIDATED

↓

CLASSROOM VALIDATED

↓

FACULTY VALIDATED

↓

STUDENT ALLOCATION VALIDATED

↓

DUPLICATE CHECK

↓

ATTENDANCE CREATED IN MONGODB

↓

RECOGNITION EVENT STORED

↓

SOCKET.IO EVENT SENT

↓

FACULTY DASHBOARD UPDATES

↓

STUDENT DASHBOARD UPDATES

↓

ADMIN ANALYTICS UPDATE

↓

STUDENT SEES:

SUBJECT

FACULTY

ROOM

DATE

TIME

STATUS

↓

SESSION ENDS

↓

MISSING ELIGIBLE STUDENTS BECOME ABSENT

↓

REPORT UPDATES

↓

AUDIT LOGS REMAIN AVAILABLE

---

# 181. FINAL QUALITY GATE

Before saying:

"Project completed"

you MUST verify:

* No TypeScript compilation errors
* No Python syntax errors
* No broken imports
* No broken routes
* MongoDB successfully connects
* Mongoose models work
* Indexes are created
* Authentication works
* RBAC works
* Admin works
* Faculty works
* Student works
* Face enrollment works
* Recognition service works
* IoT simulator works
* Attendance works
* Duplicate prevention works
* Realtime updates work
* Reports work
* Notifications work
* Disputes work
* Manual correction works
* Audit logs work
* Responsive design works
* No Firebase remains
* No MySQL remains
* No PostgreSQL remains
* No hardcoded production attendance data remains
* No unauthorized access remains
* End-to-end acceptance test passes

Only after those checks should the project be considered complete.
