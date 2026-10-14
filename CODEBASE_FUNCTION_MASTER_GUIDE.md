# Smart Attendance System — Complete Function-by-Function Master Guide
**Bannari Amman Institute of Technology (BIT)**

---

## 📖 Executive Introduction

This master guide provides an exhaustive, line-by-line function dictionary and architectural walkthrough of the entire **Smart Attendance System** codebase. Use this reference for deep-dive technical reviews, software documentation submissions, and advanced viva voce defenses.

---

## 🏗️ 1. Complete System Flow & Execution Pipeline

```
+-------------------------------------------------------------------------------------------------------+
|                                    END-TO-END ATTENDANCE WORKFLOW                                      |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|  [ Camera Capture ] ---> [ Device Login ] ---> [ Recognition Request ] ---> [ Zod Schema Validation ] |
|   (30 FPS Canvas)       (JWT Device Token)     (/api/v1/devices/recognize)   (createIoTDeviceSchema) |
|                                                                                           |           |
|                                                                                           v           |
|  [ Attendance Record ] <--- [ Session Status ] <--- [ Attendance Engine ] <--- [ JWT Authentication ] |
|  (PRESENT / LATE)           (Grace Period Check)    (attendanceEngine.ts)      (auth.ts Middleware)   |
|         |                                                                                             |
|         v                                                                                             |
|  [ Socket.io Broadcast ] ---> [ React 18 Dashboard ] ---> [ Audit Log Recording ]                     |
|  (ATTENDANCE_MARKED)          (Live Attendance Stats)     (auditService.ts)                           |
+-------------------------------------------------------------------------------------------------------+
```

---

## 💻 2. Backend Controllers & Function Reference

### 📁 A. Admin Controller (`backend/src/controllers/adminController.ts`)

#### 1. `getDashboardData(req, res, next)`
- **Purpose**: Computes real-time overview metrics for the Admin Dashboard.
- **How it works**:
  - Uses `Promise.all()` to execute concurrent database queries:
    - `Student.countDocuments()`
    - `Faculty.countDocuments()`
    - `IoTDevice.countDocuments()`
    - `AttendanceSession.find({ status: 'ACTIVE' })`
    - `AttendanceRecord.find()` matching today's date range (`00:00:00` to `23:59:59`).
  - Aggregates count of `PRESENT`, `LATE`, `ABSENT` records today.
  - Computes `overallAttendancePercentage = (present + late) / totalToday * 100`.
- **Response**: Returns metrics object with live stats and active session rosters.

#### 2. `getAnalyticsData(req, res, next)`
- **Purpose**: Generates historical trend data and department attendance comparisons for reports.
- **How it works**:
  - Groups attendance records by `departmentId` using Mongoose aggregation pipeline (`$group`, `$match`).
  - Computes attendance rates across CSE, ECE, AIDS, MECH, EEE departments.
  - Returns monthly trend arrays for analytics chart components.

#### 3. `getStudents(req, res, next)` / `createStudent` / `updateStudent` / `deleteStudent`
- **`getStudents`**: Queries `Student.find().populate('userId departmentId sectionId')`. Supports optional query params `departmentId`, `sectionId`, `search`.
- **`createStudent`**: 
  1. Parses payload with `registerStudentSchema.parse(req.body)`.
  2. Checks for existing user email or register number.
  3. Hashes default initial password via `bcrypt.hash(password, 10)`.
  4. Creates `User` document with `role: 'STUDENT'`.
  5. Creates `Student` profile linking `userId`.
  6. Writes `CREATE_STUDENT` to `AuditLog`.
- **`updateStudent`**: Updates nested `User` (name, email) and `Student` (year, semester, department, section) properties atomically.
- **`deleteStudent`**: Deletes `Student` profile and associated `User` login document.

#### 4. `getFaculty(req, res, next)` / `createFaculty` / `updateFaculty` / `deleteFaculty`
- **`getFaculty`**: Accepts optional `req.query.departmentId`. Filters faculty roster by department when provided.
- **`createFaculty`**: Creates `User` document (`role: 'FACULTY'`), hashes password, creates `Faculty` profile with employee ID and designation.
- **`updateFaculty`**: Updates faculty designation, department allocation, and contact information.
- **`deleteFaculty`**: Removes faculty profile and unassigns active class allocations to prevent orphan dependencies.

#### 5. `getDepartments(req, res, next)` / `createDepartment` / `updateDepartment` / `deleteDepartment`
- **`getDepartments`**:
  - Retrieves all `Department` documents.
  - For each department, executes concurrent aggregations:
    - `Student.countDocuments({ departmentId: d._id })`
    - `Faculty.countDocuments({ departmentId: d._id })`
  - Attaches `studentCount` and `facultyCount` to each department object payload.
- **`updateDepartment`**: Updates department code (e.g. `AIDS`, `CSE`) and full name.
- **`deleteDepartment`**: Deletes department if no students or faculty remain assigned.

#### 6. `getDevices(req, res, next)` / `createDevice` / `updateDevice` / `deleteDevice`
- **`getDevices`**: Fetches all IoT hardware camera units populated with assigned `classroomId`.
- **`createDevice`**:
  1. Validates input using `createIoTDeviceSchema.parse(req.body)`.
  2. Hashes device passcode: `apiKeyHash = await bcrypt.hash(data.apiKey, 10)`.
  3. Saves `IoTDevice` document with initial `status: 'OFFLINE'` and `cameraStatus: 'OK'`.
- **`updateDevice`**: Updates device display name, assigned classroom, IP address, and optional new passcode.
- **`deleteDevice`**: Deletes device credentials from hardware registry.

#### 7. `getSessions` / `createSession` / `startSession` / `endSession` / `deleteSession`
- **`createSession`**: Validates session data (`facultyId`, `subjectId`, `classroomId`, `startTime`, `endTime`, `gracePeriodMinutes`).
- **`startSession`**: Sets session `status: 'ACTIVE'`, `actualStartTime: new Date()`, and broadcasts WebSocket alert.
- **`endSession`**: Sets session `status: 'COMPLETED'`, `actualEndTime: new Date()`, calculates absent students who failed to scan.

#### 8. `getModerators` / `createModerator` / `deleteModerator`
- **`createModerator`**: 
  - Verifies `req.user.role === 'ADMIN'`. If a `MODERATOR` calls this, throws `403 Forbidden`.
  - Creates user account with `role: 'MODERATOR'`.
- **`deleteModerator`**: Removes moderator account. Protected against deleting primary `ADMIN` or execution by non-Admins.

#### 9. `updateUserCredentials(req, res, next)`
- **Purpose**: Modifies login email/username, name, role, or password for any user account.
- **Security Logic**:
  - Checks if target user email is already in use by another user (`$ne: targetUser._id`).
  - Restricts `MODERATOR` users from modifying `ADMIN` or `MODERATOR` accounts or granting administrative roles.
  - Re-hashes password with `bcrypt.hash()` if a new password is provided.

#### 10. `updateUserStatus(req, res, next)`
- **Purpose**: Dedicated 1-click account status switcher (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
- **Logic**:
  - Validates `status` is one of `['ACTIVE', 'INACTIVE', 'SUSPENDED']`.
  - Restricts Moderators from suspending/modifying Admin/Moderator accounts.
  - Saves new status and records `UPDATE_USER_STATUS` in `AuditLog` with reason.

---

### 📁 B. Authentication Controller (`backend/src/controllers/authController.ts`)

#### 1. `login(req, res, next)`
- **Purpose**: Authenticates system users (Admin, Moderator, Faculty, Student).
- **Execution Flow**:
  1. Validates body using `loginSchema.parse(req.body)`.
  2. Queries `User.findOne({ email: email.toLowerCase() })`.
  3. If user not found, throws `AppError('Invalid email or password', 401)`.
  4. Compares password: `bcrypt.compare(password, user.passwordHash)`.
  5. Checks user status: If `user.status !== 'ACTIVE'`, throws `AppError('Account suspended or inactive', 403)`.
  6. Signs JWT: `jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })`.
  7. Updates `user.lastLoginAt = new Date()`.
  8. Returns JWT token and user profile object.

#### 2. `getMe(req, res, next)`
- **Purpose**: Returns profile of currently authenticated user using `req.user`.

---

### 📁 C. Hardware Device Controller (`backend/src/controllers/deviceController.ts`)

#### 1. `deviceLogin(req, res, next)`
- **Purpose**: Authenticates IoT camera hardware terminals.
- **Execution Flow**:
  1. Finds device: `IoTDevice.findOne({ deviceId })`.
  2. Compares passcode: `bcrypt.compare(password, device.apiKeyHash)`.
  3. Updates device status: `device.status = 'ONLINE'`, `device.lastHeartbeat = new Date()`.
  4. Signs device JWT token.

#### 2. `recognizeFace(req, res, next)`
- **Purpose**: Entry endpoint for camera face recognition events.
- **Execution Flow**:
  1. Parses payload with `recognizeAttendanceSchema`.
  2. Passes data to `attendanceEngine.processRecognitionEvent(payload)`.
  3. Returns recognized student details, attendance status (`PRESENT`/`LATE`), and confidence score.

---

### 📁 D. Attendance Engine Service (`backend/src/services/attendanceEngine.ts`)

#### 1. `processRecognitionEvent(eventData)`
- **Core Functionality**:
  1. **Identify Student**: Matches biometric face vector or `mockStudentRegisterNumber` to `Student` & `BiometricProfile`.
  2. **Locate Active Class**: Finds `AttendanceSession` where `classroomId == device.classroomId` and `status == 'ACTIVE'`.
  3. **Calculate Attendance Status**:
     ```typescript
     const scanTime = new Date();
     const sessionStart = new Date(session.actualStartTime || session.date);
     const graceDeadline = new Date(sessionStart.getTime() + session.gracePeriodMinutes * 60000);

     const status = scanTime <= graceDeadline ? 'PRESENT' : 'LATE';
     ```
  4. **Record Attendance**: Upserts `AttendanceRecord` document with `verificationMethod: 'BIOMETRIC_CAMERA'`.
  5. **Emit Real-Time Event**: Calls `socketService.emitAttendanceMarked({ session, student, record })`.

---

## 🛡️ 3. Security & Middleware Reference

### 1. `authenticate(req, res, next)` (`backend/src/middleware/auth.ts`)
- Extracts `Authorization` header: `Bearer <token>`.
- Verifies JWT with `jwt.verify(token, JWT_SECRET)`.
- Finds user in database and checks `user.status === 'ACTIVE'`.
- Attaches `req.user = user` and calls `next()`.

### 2. `authorize(...allowedRoles)` (`backend/src/middleware/rbac.ts`)
- Checks `allowedRoles.includes(req.user.role)`.
- If role not authorized, returns HTTP 403 Forbidden.

### 3. `errorHandler(err, req, res, next)` (`backend/src/middleware/errorHandler.ts`)
- Formats `ZodError` issues into human-readable sentences.
- Formats MongoDB duplicate key `11000` errors.
- Formats JSON error array strings into readable plain text.

---

## 🎨 4. Frontend Services & Utilities

### 1. `api` Axios Instance (`frontend/src/services/api.ts`)
- Intercepts requests to append `Authorization: Bearer <token>`.
- Intercepts 401 response errors. Excludes `/auth/login` and `/devices/login` from page refresh redirects to allow inline error display.

### 2. `formatErrorMessage(err, fallback)` (`frontend/src/utils/errorUtils.ts`)
- Extracts error message string from Axios error objects.
- Automatically parses stringified JSON Zod error arrays into clean human-readable text.

---

## 📊 Summary Table of All Backend Functions

| Controller / Service | Function Name | Endpoint / Trigger | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **adminController** | `getDashboardData` | `GET /admin/dashboard` | Compares live attendance stats, active sessions, and student counts. |
| **adminController** | `getAnalyticsData` | `GET /admin/analytics` | Returns department attendance comparisons and monthly trend data. |
| **adminController** | `getFaculty` | `GET /admin/faculty` | Fetches faculty list with optional `departmentId` filtering. |
| **adminController** | `getDepartments` | `GET /admin/departments` | Returns departments with live `studentCount` and `facultyCount`. |
| **adminController** | `updateUserCredentials`| `PUT /admin/users/:id/credentials` | Updates login email, username, and password with duplicate checks. |
| **adminController** | `updateUserStatus` | `PUT /admin/users/:id/status` | Toggles user account status (`ACTIVE`, `INACTIVE`, `SUSPENDED`). |
| **authController** | `login` | `POST /auth/login` | Validates credentials via Bcrypt and issues 24-hour signed JWT. |
| **deviceController** | `deviceLogin` | `POST /devices/login` | Authenticates IoT camera terminals using hashed device passcodes. |
| **deviceController** | `recognizeFace` | `POST /devices/recognize` | Processes camera frames and triggers attendance recognition pipeline. |
| **attendanceEngine** | `processRecognitionEvent`| Internal Service | Calculates `PRESENT` vs `LATE` status based on grace period and emits socket events. |
| **socketService** | `emitAttendanceMarked` | Internal Event | Pushes live attendance scan updates to active frontend dashboards. |

---

**Master Codebase Documentation — Bannari Amman Institute of Technology (BIT).**
