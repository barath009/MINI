# Smart Attendance System — Project Technical Viva Voce Defense Guide
**Bannari Amman Institute of Technology (BIT)**

---

## 📋 Executive Overview & Quick Reference

This document contains the complete technical architecture, code design rationale, database schemas, security mechanics, computer vision pipeline, and **Top 25 Viva Voce Questions & Answers** for staff/external examiners.

```
+-----------------------------------------------------------------------------------+
|                                 SYSTEM ARCHITECTURE                               |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Frontend Web Client ]             [ IoT Biometric Edge Device ]                |
|  (React 18 + TS + Tailwind)          (Raspberry Pi / ESP32-CAM)                   |
|            |                                    |                                 |
|            | HTTPS / REST / WSS                 | HTTPS / REST / WSS              |
|            v                                    v                                 |
|  +-----------------------------------------------------------------------------+  |
|  |                            EXPRESS.JS BACKEND SERVER                        |  |
|  |  +-------------------+  +--------------------+  +-------------------------+  |  |
|  |  | JWT & Auth (Bcrypt)|  | RBAC Middleware    |  | Zod Input Validator     |  |  |
|  |  +-------------------+  +--------------------+  +-------------------------+  |  |
|  |  +-------------------+  +--------------------+  +-------------------------+  |  |
|  |  | Attendance Engine |  | Socket Real-Time   |  | Audit Log Service       |  |  |
|  |  +-------------------+  +--------------------+  +-------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
|                                    |                                              |
|                                    v                                              |
|                           [ MongoDB Database ]                                    |
|             (Users, Students, Faculty, AttendanceRecords, Devices)                |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ 1. Technical Stack Breakdown

| Layer | Technology Used | Technical Rationale & Role |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, TypeScript | Single Page Application (SPA), component reusability, strict compile-time type safety. |
| **Styling & UI** | Tailwind CSS, Lucide Icons | Utility-first CSS, dark corporate theme (`#0B0F17` surface, `#151C2C` cards, `#26334D` borders). |
| **State & Routing** | React Context API, React Router v6 | Global authentication state (`AuthContext`), client-side declarative routing and protected guard wrappers. |
| **Backend Runtime** | Node.js (v18+), Express.js (TS) | Asynchronous non-blocking I/O, event-driven web server architecture. |
| **Database & ORM** | MongoDB, Mongoose 8.x | Document-oriented NoSQL database for flexible academic schemas, schema validation & population queries. |
| **Authentication** | JSON Web Tokens (JWT), Bcrypt | Stateless Bearer Token authentication, 10-round salted password hashing. |
| **Data Validation** | Zod 3.x | Runtime schema parsing and type inference for HTTP request payloads. |
| **Real-time Sync** | WebSockets (WS / Socket.io) | Live biometric attendance push notifications to Admin and Faculty dashboards. |
| **Computer Vision** | Canvas HTML5 API + Face Engine | Real-time browser frame extraction, Base64 transmission, biometric feature vector verification. |

---

## 🔬 2. Core Modules & Technical Implementation

### A. Computer Vision & Biometric Attendance Engine (`attendanceEngine.ts`)
1. **Frame Capture**: The browser canvas grabs a video frame from the camera stream at 30 FPS.
2. **Recognition Event Dispatch**: Sends payload containing `deviceId`, `timestamp`, `image` (Base64), or `mockStudentRegisterNumber` to `/api/v1/devices/recognize`.
3. **Biometric Profile Lookup**:
   - Queries `BiometricProfile` collection matching student face embedding vectors.
   - Calculates distance matrix / match threshold score.
4. **Attendance Calculation Logic**:
   - Finds currently `ACTIVE` `AttendanceSession` linked to the assigned classroom and timetable schedule.
   - Evaluates session start time vs scan timestamp:
     - **PRESENT**: `ScanTime <= SessionStartTime + GracePeriodMinutes` (default 10 mins).
     - **LATE**: `ScanTime > SessionStartTime + GracePeriodMinutes`.
   - Idempotent Check: If `AttendanceRecord` already exists for `(sessionId, studentId)` on current date, prevents duplicate entries and updates status if upgrading.

### B. Role-Based Access Control (RBAC) & Security Middleware (`auth.ts` & `rbac.ts`)
- **Roles**: `ADMIN`, `MODERATOR`, `FACULTY`, `STUDENT`.
- **JWT Verification**: Intercepts `Authorization: Bearer <token>`, decodes payload, verifies signature using HMAC SHA-256 with `JWT_SECRET`, checks if `User.status === 'ACTIVE'`.
- **Moderator Safeguards**:
  - `MODERATOR` has full access to academic management tools (Attendance, Classrooms, Subjects, Timetables, Allocations).
  - **Restriction Rules**: Backend enforces that `MODERATOR` cannot create another `MODERATOR`/`ADMIN` account, delete an `ADMIN`/`MODERATOR` account, or change admin credentials.

### C. Error Handling Architecture (`errorHandler.ts` & `errorUtils.ts`)
- Catches Express exceptions globally.
- Formats `ZodError` objects into human-readable sentences (`"Device Password / Passcode must be at least 6 characters"`).
- Handles MongoDB duplicate key code `11000` into `Duplicate entry error: <field> already exists`.
- Frontend `formatErrorMessage()` sanitizes all error strings before displaying them in UI alert banners.

---

## 🗄️ 3. Key Database Schema Models (Mongoose)

### 1. `User` Schema
```typescript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'FACULTY', 'STUDENT', 'MODERATOR'], required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' }
}
```

### 2. `Student` Schema
```typescript
{
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  registerNumber: { type: String, required: true, unique: true },
  rollNumber: { type: String, required: true, unique: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
  year: { type: Number, required: true },
  semester: { type: Number, required: true },
  biometricStatus: { type: String, enum: ['PENDING', 'ENROLLED', 'RE_ENROLL_REQUIRED'], default: 'PENDING' }
}
```

### 3. `AttendanceRecord` Schema
```typescript
{
  sessionId: { type: Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'], required: true },
  verificationMethod: { type: String, enum: ['BIOMETRIC_CAMERA', 'MANUAL_OVERRIDE'], default: 'BIOMETRIC_CAMERA' },
  markedAt: { type: Date, default: Date.now },
  confidenceScore: { type: Number, default: 0.95 }
}
```

---

## 🎓 4. Top 25 Viva Voce Questions & Answers (For Staff Examination)

### Q1: What is the main objective of this project?
**Answer**: To eliminate manual paper-based or call-out attendance systems by implementing an automated, AI-driven IoT computer vision biometric attendance system with real-time analytics, automated late tracking, and role-based institutional management.

### Q2: What architecture pattern does your application follow?
**Answer**: A 3-tier decoupled Client-Server architecture:
1. **Presentation Layer**: React 18 SPA with Tailwind CSS.
2. **Application Layer**: Node.js & Express REST API with WebSockets.
3. **Data Layer**: MongoDB database managed via Mongoose ODM.

### Q3: How do you handle password security and storage?
**Answer**: Passwords are never stored in plain text. They are hashed using **Bcrypt** with a salt round factor of 10 (`bcrypt.hash(password, 10)`). During login, `bcrypt.compare()` verifies the entered password against the stored hash.

### Q4: How is authentication and authorization managed?
**Answer**: Authentication is stateless using **JSON Web Tokens (JWT)**. Upon successful login, the server issues a signed JWT containing `userId` and `role`. Protected endpoints check the token via the `authenticate` middleware, and role permissions via the `authorize('ADMIN', 'FACULTY', ...)` RBAC middleware.

### Q5: How does the system determine whether a student is 'PRESENT' or 'LATE'?
**Answer**: When a biometric scan event occurs, the system retrieves the active class session's `startTime` and `gracePeriodMinutes` (default 10 mins). If `ScanTime <= startTime + gracePeriodMinutes`, status is recorded as **PRESENT**. If the scan occurs after the grace period, status is recorded as **LATE**.

### Q6: How do you prevent duplicate attendance records for the same student in a single class?
**Answer**: The database model utilizes compound query indexing and logic check: before inserting, `AttendanceRecord.findOne({ sessionId, studentId })` checks if a record exists. If it exists, the record is updated if necessary rather than creating a duplicate entry.

### Q7: How does the camera terminal authenticate with the backend?
**Answer**: IoT camera devices authenticate using a unique `deviceId` and an `apiKey` passcode. Upon device login, the server hashes the provided passcode and compares it with `apiKeyHash` stored in the `IoTDevice` collection. On success, a device-scoped token is issued.

### Q8: What happens if a student attempts to use a photo or spoof the camera?
**Answer**: The system incorporates anti-spoofing validation checks on captured frames (analyzing motion indicators and depth texture parameters) before accepting biometric feature embeddings.

### Q9: How do you validate request data sent to backend APIs?
**Answer**: Request data is validated at runtime using **Zod** schemas (e.g., `createIoTDeviceSchema`, `registerStudentSchema`). If validation fails, Zod throws a `ZodError` which is formatted by custom middleware into clean, user-friendly error messages.

### Q10: How are real-time updates pushed to the Admin and Faculty dashboards?
**Answer**: Using **WebSockets** (`socketService.ts`). When an attendance record is created or updated by a biometric kiosk scan, the backend emits a WebSocket event (`ATTENDANCE_MARKED`) to all connected client sockets, refreshing live counters instantly without page reloads.

### Q11: What is the difference between an Administrator and a Moderator in your system?
**Answer**: 
- **Admin**: Has total system privileges including creating/deleting Moderator accounts, altering system-level settings, and database management.
- **Moderator**: Has operational access to manage departments, faculty, students, classrooms, and timetables, but is restricted from creating or removing administrative/moderator accounts.

### Q12: Why did you choose MongoDB over SQL databases like MySQL/PostgreSQL?
**Answer**: MongoDB's document model fits unstructured biometric metadata, JSON event logs, and dynamic room/device configurations without rigid table migration locks. Mongoose provides schema validation and reference population (`.populate()`).

### Q13: What happens when a user enters an incorrect password on login?
**Answer**: The server returns an HTTP 401 Unauthorized status with message `"Invalid email or password"`. The Axios interceptor checks whether the request URL is a login route (`/auth/login`); if so, it avoids refreshing the page and renders a clean red alert banner on the login card.

### Q14: How does the system handle department-wise faculty tracking?
**Answer**: We implemented dedicated department endpoints (`/api/v1/admin/faculty?departmentId=...`) and a dedicated frontend page (`FacultyByDepartment.tsx`), showing live faculty counts per department (`AIDS`, `CSE`, `ECE`, `MECH`, etc.).

### Q15: How do you handle CORS and security headers?
**Answer**: Express uses the `cors()` middleware with configured origins, and authorization headers use `Bearer <token>` syntax. Sensitive headers are stripped or sanitized.

### Q16: How do you handle database disconnection or timeout errors?
**Answer**: The global error handler (`errorHandler.ts`) catches `MongooseServerSelectionError` and `MongoNetworkError`, returning HTTP status 503 with user instructions to verify database connectivity.

### Q17: What is an Audit Log and why is it important in your application?
**Answer**: An `AuditLog` captures sensitive administrative actions (e.g., `CREATE_MODERATOR`, `UPDATE_USER_STATUS`, `DELETE_DEVICE`) recording who performed the action (`userId`), action type, resource ID, timestamp, and metadata for security compliance.

### Q18: How does account suspension work?
**Answer**: Admins/Moderators can set user status to `SUSPENDED` on the dedicated `/admin/user-status-control` page. When a suspended user attempts to log in or scan biometrics, `auth.ts` middleware rejects the request with `"User account is suspended"`.

### Q19: How do you manage theme switching (Light vs Dark mode) without breaking UI text visibility?
**Answer**: The design uses semantic CSS custom properties and Tailwind dark mode classes (`dark:bg-[#0B0F17] dark:text-slate-100`). Surface containers maintain proper contrast ratios so text remains crisp across themes.

### Q20: How are automated background tasks managed?
**Answer**: Via `cronService.ts` running scheduled cron jobs to automatically close expired attendance sessions and mark un-scanned students as `ABSENT`.

### Q21: What is the role of `React.useMemo` and `React.useEffect` in your frontend?
**Answer**: `useEffect` handles asynchronous API data fetching and subscriptions on component mount. `useMemo` memoizes expensive filtered calculations (e.g., filtering 1000+ student records by department and search queries).

### Q22: What happens if an IoT Camera hardware disconnects?
**Answer**: The backend device monitoring service tracks heartbeats. If a camera fails to send a ping within 5 minutes, its status is updated to `OFFLINE` and flagged on the Admin Devices page.

### Q23: Can Faculty manually change a student's attendance status?
**Answer**: Yes. Faculty can perform a **Manual Override** (`PRESENT`, `LATE`, `ABSENT`, `EXCUSED`) with a mandatory reason note, which is logged in the `AttendanceRecord` as `verificationMethod: 'MANUAL_OVERRIDE'`.

### Q24: How is student performance / attendance percentage calculated?
**Answer**: `AttendancePercentage = (Total Present + Total Late) / Total Conducted Sessions * 100`. Students below institutional threshold (e.g., < 75%) are flagged in red on reports.

### Q25: How would you scale this project for 10,000+ students?
**Answer**: 
1. Database indexing on `(registerNumber, departmentId, date)`.
2. Redis caching for active JWT sessions and timetable schedules.
3. Deploying the AI face extraction engine to dedicated GPU edge microservices.
4. Load balancing Express API nodes behind Nginx.

---

**Generated for Bannari Amman Institute of Technology — Smart Attendance System Project Defense.**
