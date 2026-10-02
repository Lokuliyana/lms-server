# Phase 23: Frontend API Services: Identity, Users & Core Classes

**Phase**: 23 of 34  
**Layer**: Frontend (`lms-client`)  
**Scope**: 7 Files (Authentication & User API Service, Empty User Service Stub, Class Aggregator Barrel, Class CRUD Service, Class Application Service Duplicate, Class Entitlement Service Duplicate, Class Zoom Ticket Service Duplicate)  
**Status**: Completed  
**Timestamp**: 2026-10-01  

---

## 1. Executive Summary & Architecture Overview

Phase 23 audits the client-side network service layer governing user authentication, user management, course classes, admission applications, monthly entitlements, and Zoom meeting access. This audit reveals major architectural insights and extreme copy-paste code bloat:

1. **Monolithic Authentication & User API Service (`authService.ts`)**:
   - Comprehensive 118-line service encapsulating all identity operations: registration, OTP email verification, credentials login, profile fetches, password recovery (forgot, OTP reset, admin reset, change password), logout, token refresh, and RBAC role updates.
   - Manages an internal `storage` helper that persists the user object to `localStorage` while delegating token transmission to HTTP-only cookies managed by `@/lib/axios`.
2. **Orphaned 0-Byte Service (`userService.ts`)**:
   - `src/services/userService.ts` is a 0-byte empty file ported from legacy `tuition-frontend/services/userService.ts`. All user administration endpoints (`getAllUsers`, `getUserById`, `editUser`, `createUser`, `updateUserRole`, `createModerator`) were implemented directly inside `authService.ts` rather than `userService.ts`.
3. **Severe Code Duplication in Class Services Subsystem (`classService.ts`, `class/*`)**:
   - `classService.ts` is a 6-line barrel re-exporting from 4 sub-service files:
     ```typescript
     export * from "./class/classCrudService";
     export * from "./class/applicationService";
     export * from "./class/entitlementService";
     export * from "./class/zoomTicketService";
     ```
   - **Critical Architecture Defect**: Instead of modularizing each domain into separate focused files, the original 550-line monolithic `classService.ts` from legacy was duplicated 4 times across `classCrudService.ts` (552 lines), `applicationService.ts` (550 lines), `entitlementService.ts` (550 lines), and `zoomTicketService.ts` (550 lines). Each file contains the **entire 550 lines of duplicate code**, simply toggling the `export` keyword on a few target functions while keeping the rest as private duplicates. That represents **2,202 lines of code** where ~500 lines were required.

---

## 2. Phase 23 Target Files Matrix

| # | Target File | Path | Status | Summary / Core Role |
|---|---|---|---|---|
| 1 | `authService.ts` | `lms-client/src/services/authService.ts` | Audited | 118-line identity and user administration client service connecting to Axios API |
| 2 | `userService.ts` | `lms-client/src/services/userService.ts` | Audited | 0-byte unreferenced placeholder file ported from legacy |
| 3 | `classService.ts` | `lms-client/src/services/classService.ts` | Audited | 6-line barrel re-exporting class CRUD, applications, entitlements, and Zoom tickets |
| 4 | `classCrudService.ts` | `lms-client/src/services/class/classCrudService.ts` | Audited | 552-line class creation, query, batch parsing, and label normalization service |
| 5 | `applicationService.ts` | `lms-client/src/services/class/applicationService.ts` | Audited | 550-line duplicate file exporting `applyForClass`, `handleApplication`, `getApplications` |
| 6 | `entitlementService.ts` | `lms-client/src/services/class/entitlementService.ts` | Audited | 550-line duplicate file exporting monthly access checks, grants, and bulk grants |
| 7 | `zoomTicketService.ts` | `lms-client/src/services/class/zoomTicketService.ts` | Audited | 550-line duplicate file exporting `createMeetingTicket` for Zoom sessions |

---

## 3. Deep Dive Technical Deconstructions

### 3.1 `src/services/authService.ts`

* **Purpose & Architecture**:
  Centralized client-side service for identity, session lifecycle, and administrative user operations. Uses `@/lib/axios` instance.
* **Storage Helper**:
  ```typescript
  const storage = {
    set(token: string, user: any) {
      localStorage.setItem("user", JSON.stringify(user));
    },
    clear() {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    user(): any | null {
      try {
        return JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        return null;
      }
    },
  };
  ```
  Note: Token persistence to `localStorage` is intentionally commented out (`// localStorage.setItem("token", token)`), relying on HTTP-only cookie transport, while the serialized `user` object is stored for fast client reads.
* **Exported API Methods & Endpoint Matrix**:
  - `register(data: RegisterDto)`: `POST /auth/register`
  - `verifyOtp(data: VerifyOtpDto)`: `POST /auth/verify-otp`
  - `login(data)`: `POST /auth/login` -> updates `storage.set(token, user)`
  - `getProfile()`: `GET /auth/profile`
  - `getUserById(userId)`: `GET /auth/user/${userId}`
  - `editUser(userId, data)`: `PUT /auth/edit-user/${userId}`
  - `forgotPassword(email)`: `POST /auth/forgot-password`
  - `resetPasswordWithOTP(data)`: `POST /auth/reset-password`
  - `adminResetPassword(userId, data)`: `POST /auth/admin/reset-password/${userId}`
  - `changePassword(data)`: `POST /auth/change-password`
  - `logout()`: `POST /auth/logout` -> clears storage -> redirects to `/login`
  - `getAllUsers()`: `GET /users`
  - `refreshToken()`: `POST /auth/refresh-token`
  - `createModerator(data)`: `POST /users` with `{ ...data, role: "moderator" }`
  - `updateOwnProfile(data)`: `PUT /auth/edit-user/${user._id}`
  - `getRoles()`: `GET /permissions/roles`
  - `updateUserRole(userId, role_ids)`: `PUT /users/${userId}/roles`
  - `createUser(data)`: `POST /users`

---

### 3.2 `src/services/userService.ts`

* **Implementation**:
  0 bytes (empty file).
* **Analysis**:
  Carried over from `tuition-frontend/services/userService.ts` which was also 0 bytes. All methods that logically belong in `userService.ts` (`getAllUsers`, `createUser`, `updateUserRole`, `createModerator`, `editUser`) were clumped into `authService.ts`.

---

### 3.3 `src/services/classService.ts`

* **Implementation**:
  ```typescript
  export * from "./class/classCrudService";
  export * from "./class/applicationService";
  export * from "./class/entitlementService";
  export * from "./class/zoomTicketService";
  ```
* **Analysis**:
  Acts as an aggregator barrel for backwards compatibility with legacy imports (`import { getClasses } from "@/services/classService"`).

---

### 3.4 `src/services/class/classCrudService.ts` (and Duplicate Sub-Services)

* **Purpose & Logic**:
  Handles class CRUD operations, batch schedules, fees, and student enrollment records.
* **Class Creation & Payload Normalization (`createClass`)**:
  ```typescript
  export const createClass = async (classData: ClassPayload) => {
    const resolvedBatches =
      Array.isArray(classData.batches)
        ? classData.batches
        : Array.isArray(classData.classTime)
        ? classData.classTime.map(({ day, start, end }) => ({ day, start, end }))
        : [];

    const resolvedPrice =
      typeof classData.price === 'number'
        ? classData.price
        : typeof classData.classFee === 'number'
        ? classData.classFee
        : undefined;

    const payload = {
      title: classData.title,
      description: classData.description,
      subject: classData.subject,
      grade: classData.grade,
      type: classData.type,
      format: classData.format,
      image: classData.image,
      batches: resolvedBatches,
      price: resolvedPrice,
      start_date: classData.start_date,
      end_date: classData.end_date,
      created_by: classData.created_by,
    };

    const { data } = await API.post('/classes/create', payload);
    return Array.isArray(data) ? data : (data as any).data || data;
  };
  ```
  Gracefully accepts either `batches` or `classTime`, and either `price` or `classFee`, resolving frontend naming discrepancies before hitting the backend.
* **Class Transformation & Label Normalization (`getClasses`)**:
  Maps raw items through `formatGradeName` and `formatSubjectName`, attaching sanitized `labels: [{ value: "Grade 10", group: "grade" }, { value: "Science", group: "subject" }]`.
* **Application Methods (`applyForClass`, `handleApplication`, `getApplications`)**:
  - `applyForClass`: Rejects base64 data URIs (`data:`); sends `POST /classes/apply`.
  - `handleApplication`: `POST /classes/handle` with `application_Id` and status (`approved` | `rejected`).
  - `getApplications`: Builds comprehensive query params (`class_id`, `status`, `student_id`, `search`, `class_search`, `applied_from`, `applied_to`, `page`, `limit`, `sortBy`, `sortOrder`, `managedOnly`).
* **Entitlement Methods (`grantMonthlyEntitlement`, `bulkGrantMonthToUsers`, `listMyMonthKeys`, `userCanAccessMonth`)**:
  - Enforces 24-character hexadecimal ObjectId regex validation (`is24Hex`) and month key regex validation (`^\d{4}-(0[1-9]|1[0-2])$`).
  - Issues entitlement verification and grants against `/classes/:id/entitlements/*`.
* **Zoom Meeting Access (`createMeetingTicket`)**:
  - Issues `POST /meetings/ticket` with `{ classId, mode: 'join' | 'start' }`. Returns `{ ticket, redirect }`.

---

## 4. Legacy Delta & Gaps

| Feature / Pattern | Legacy (`tuition-frontend`) | Target (`lms-client`) | Gap / Architectural Assessment |
|---|---|---|---|
| **`authService.ts`** | Combined auth & user methods | Combined auth & user methods | 100% parity; preserved legacy implementation. |
| **`userService.ts`** | 0-byte empty file | 0-byte empty file | Dead file carried over unchanged. |
| **`classService.ts` Structure** | 1 single file (`services/classService.ts`, 550 lines) | 1 barrel + 4 identical 550-line copies in `services/class/` | **Extreme Code Duplication**: 4 identical copies created during an incomplete refactoring attempt. |
| **Payload Normalization** | Strict batch schema | Normalized `batches` vs `classTime` and `price` vs `classFee` | Improved frontend resilience against schema drift. |
| **ObjectId Validation** | Ad-hoc checks | Enforced regex validation (`is24Hex`, `isMonthKey`) | Hardened defensive client validation before dispatching requests. |

---

## 5. Critical Findings & Technical Debt Summary

1. **Extreme Copy-Paste Code Duplication in `services/class/` (High Priority)**:
   - `classCrudService.ts` (552 lines), `applicationService.ts` (550 lines), `entitlementService.ts` (550 lines), and `zoomTicketService.ts` (550 lines) are 4 copies of the exact same 550-line file.
   - Any bug fix or modification made to one file will diverge from the other 3 unless synchronized.
   - **Recommendation**: Refactor `services/class/` so that each sub-service contains ONLY its domain functions, or collapse them back into a single clean `classService.ts`.
2. **Orphaned Dead File (`userService.ts`) (Low Priority)**:
   - `src/services/userService.ts` is 0 bytes and completely empty. All user management functions should either be moved here from `authService.ts`, or `userService.ts` should be deleted.

---

## 6. Verification & Sign-Off Checklist
- [x] All 7 Phase 23 files inspected down to Axios URLs, payload normalizations, and regex guards.
- [x] Uncovered the 2,200-line 4x duplication in `src/services/class/`.
- [x] Verified authentication and OTP payload types in `authService.ts`.
- [x] Verified defensive `is24Hex` and `isMonthKey` validators.
