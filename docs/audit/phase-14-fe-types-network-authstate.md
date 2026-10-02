# Phase 14: Frontend — Types, Network Client & Auth State Engine

**Execution Date:** 2026-10-01  
**Auditor:** Antigravity Clean Architecture Sentinel  
**Target Repository:** `/Users/chandupa/lms-client`  
**Legacy Reference Repository:** `/Users/chandupa/tuition-frontend`  
**Files Audited (7 files):**
1. `src/types/axios.d.ts`
2. `src/types/quiz.ts`
3. `src/types/recordings.ts`
4. `src/types/user.ts`
5. `src/lib/axios.ts`
6. `src/lib/api.ts`
7. `src/lib/authState.ts`

---

## 1. Executive Summary & Architecture Overview

Phase 14 initiates the front-to-back audit of the modernized Next.js 16 / React 19 frontend application (`lms-client`). This phase evaluates the TypeScript type definitions, HTTP client architecture, proxy configurations, and reactive session state management.

### Architectural Highlights
- **Migration to HTTP-Only Cookie Authentication:** In legacy `tuition-frontend`, `lib/axios.ts` used `withCredentials: false` and manually injected JWT tokens extracted from `localStorage.getItem("token")` into authorization headers. In `lms-client`, `src/lib/axios.ts` operates with `withCredentials: true`, relying on secure, HTTP-Only browser cookies managed transparently by the browser.
- **Next.js API Gateway Reverse Proxy:** `next.config.ts` defines rewrite rules proxying `/api/:path*` to `process.env.API_ORIGIN || "http://localhost:4002/api/:path*"`. This eliminates cross-origin browser resource restrictions (CORS) and allows first-party cookie transport between frontend and backend.
- **Reactive Re-Login Interceptor:** `src/lib/axios.ts` intercepts HTTP 401 and 403 responses on protected endpoints, dispatching an event through `src/lib/authState.ts` (`openLoginDialog()`). This triggers the global `ReLoginDialog` overlay, allowing students to re-authenticate without losing uncommitted in-progress form inputs.
- **Orphaned Utilities & Empty Definitions:** `src/types/user.ts` was migrated as an empty 0-byte file. `src/lib/api.ts` is an obsolete 9-line `fetchData` helper that is not imported anywhere in the codebase.

---

## 2. Exhaustive Per-File Deep Dive

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PHASE 14: COMPONENT TOPOLOGY                                     │
├───────────────────────────────┬────────────────────────────────────────────────────────────────────────┤
│ Layer                         │ Files / Modules Audited                                                │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ TypeScript Definitions        │ axios.d.ts, quiz.ts, recordings.ts, user.ts                            │
│ Network Client                │ axios.ts, api.ts (orphaned)                                            │
│ Authentication State Emitter  │ authState.ts                                                           │
└───────────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

### File 1: `src/types/axios.d.ts`
- **Primary Responsibility:** TypeScript ambient module augmentation for Axios.
- **Implementation:**
  ```ts
  import "axios";
  declare module "axios" {
    export interface AxiosRequestConfig {
      showLoader?: boolean;
    }
  }
  ```
- **Usage:** Enables per-request opt-out or activation of the global UI loading indicator (`GlobalLoader.tsx`).

---

### File 2: `src/types/quiz.ts`
- **Primary Responsibility:** Comprehensive TypeScript contracts modeling the quiz domain.
- **Key Type Definitions:**
  - `QuestionType`: Union of `"mcq" | "true-false" | "fill-blank" | "multiple-select" | "slider" | "drag-drop"`.
  - `Question`: Full question structure containing `correct_answer`, `explanation`, `marks`, `sliderRange`, and `dragItems`.
  - `SafeQuestion`: Sanitized representation omitting answers and explanations for student play mode.
  - `QuizFormData` & `QuizMetadata`: Models quiz builder states, configuration parameters (`difficulty`, `time_limit_sec`, `matchmaking_enabled`), and question arrays.
  - `QuizForPlay`: Client-side model matching the backend payload returned by `getQuizByIdForPlay`.
  - `QuizSubmissionPayload`: Structure submitted on completion: `{ quizId, time_spent, answers: [{ question_id, answer, time_ms }] }`.
  - `LeaderboardParams` & `FirstAttemptRow`: DTOs for multi-window and first-attempt leaderboard queries.
- **Design Review:** Robust, high-fidelity type safety matching the MongoDB backend models from Phases 06 and 07.

---

### File 3: `src/types/recordings.ts`
- **Primary Responsibility:** Type declarations for recorded lecture sessions.
- **Contents:**
  ```ts
  export interface RecordedClassProps {
    title: string;
    video_url: string;
    uploaded_at: Date;
  }
  ```
- **Gaps:** Heavily truncated. Lacks definitions for complete recording documents (`_id`, `class_id`, `driveFileId`, `session_date`, `month_key`, `batch_name`, `provider`, `is_expired`) and streaming ticket responses (`ticket`, `iframeSrc`).

---

### File 4: `src/types/user.ts`
- **Primary Responsibility:** Intended home for user profile and identity types.
- **File State:** **0 BYTES (EMPTY FILE)**.
- **Defect:** Migrated as an empty placeholder from `tuition-frontend`. User profile types are instead defined inline or ad-hoc across services and components.

---

### File 5: `src/lib/axios.ts`
- **Primary Responsibility:** Centralized HTTP network client configured with interceptors and cookie forwarding.
- **Key Behaviors:**
  - `baseURL: "/api"`, `withCredentials: true`.
  - `PUBLIC_AUTH_PATHS`: Whitelist of unauthenticated endpoints (`/auth/login`, `/auth/register`, `/auth/verify-otp`, `/auth/forgot-password`, `/auth/refresh-token`, `/auth/profile`).
  - **Request Interceptor:** Evaluates URL against `PUBLIC_AUTH_PATHS`.
  - **Response Interceptor:** Catches 401 and 403 errors on non-public routes. If executing in the browser (`typeof window !== 'undefined'`), dispatches `openLoginDialog()`.
- **Design Review:** Seamlessly connects frontend requests to backend routes through the Next.js rewrite gateway.

---

### File 6: `src/lib/api.ts`
- **Primary Responsibility:** Legacy unauthenticated fetch wrapper.
- **Contents:**
  ```ts
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  export const fetchData = async (endpoint: string) => {
    const response = await fetch(`${backendUrl}/${endpoint}`);
    return response.json();
  };
  ```
- **Audit Finding:** **DEAD CODE**. Does not send credentials or auth headers. A global codebase search confirms that `fetchData` from `src/lib/api.ts` is never imported.

---

### File 7: `src/lib/authState.ts`
- **Primary Responsibility:** Lightweight reactive event emitter governing the re-authentication modal dialog.
- **Architecture:**
  - Pure JavaScript observer pattern without external library dependencies:
    ```ts
    let isLoginOpen = false;
    let listeners: Array<(isOpen: boolean) => void> = [];
    export function openLoginDialog() { ... }
    export function closeLoginDialog() { ... }
    export function subscribeToLoginDialog(listener: (isOpen: boolean) => void) { ... }
    ```
- **Role:** Subscribed to by `src/components/ui/auth/ReLoginDialog.tsx`. When a background API request fails with 401/403, the modal opens automatically over the current page.

---

## 3. Workflows & Sequence Diagrams

### 3.1 Network Interception & Non-Destructive Re-Authentication Flow
```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Page as React Page Component
    participant Client as src/lib/axios.ts
    participant NextGateway as Next.js API Rewrite (/api/*)
    participant Server as Express Backend (lms-server)
    participant Emitter as src/lib/authState.ts
    participant Modal as ReLoginDialog.tsx

    Student->>Page: Performs action (e.g., Submits Quiz / Downloads Recording)
    Page->>Client: API.post('/quizzes/submit', payload)
    Client->>NextGateway: POST /api/quizzes/submit (Cookie: token=expired)
    NextGateway->>Server: Proxies to http://localhost:4002/api/quizzes/submit
    Server-->>NextGateway: HTTP 401 Unauthorized (JWT Expired)
    NextGateway-->>Client: HTTP 401 Unauthorized
    
    Note over Client: Response Interceptor traps 401 on non-public route
    Client->>Emitter: openLoginDialog()
    Emitter->>Modal: Notify listeners (isLoginOpen = true)
    Modal-->>Student: Displays popup login dialog without page reload!
    
    Student->>Modal: Enters password & submits
    Modal->>Client: API.post('/auth/login', credentials)
    Client->>Server: HTTP 200 OK + Set-Cookie: token=fresh
    Modal->>Emitter: closeLoginDialog()
    Modal-->>Student: Modal closes; in-progress page state is preserved
```

---

## 4. Legacy Delta & Gaps

| Feature / Pattern | Legacy Repository (`tuition-frontend`) | Migrated Repository (`lms-client`) | Status / Assessment |
| :--- | :--- | :--- | :--- |
| **Auth Transport** | `localStorage.getItem("token")` manual header injection. | HTTP-Only cookies via `withCredentials: true`. | **MAJOR SECURITY UPGRADE**: Immune to XSS token theft. |
| **Reverse Proxy** | Custom rewrites in `next.config.ts`. | Centralized `/api/:path*` rewrite to `API_ORIGIN`. | **Standardized**: Handles first-party cookie transport cleanly. |
| **Session Expiry UX** | Hard page reloads or unhandled errors. | Reactive `ReLoginDialog` triggered via `authState.ts`. | **Modernized**: Non-destructive form preservation. |
| **User Type Definitions** | `types/user.ts` (0 bytes). | `src/types/user.ts` (0 bytes). | **Unresolved Debt**: Empty file migrated without types. |
| **Fetch Utility** | `lib/api.ts` (orphaned). | `src/lib/api.ts` (orphaned). | **Dead Code**: Should be safely eliminated during clean-up. |

---

## 5. Technical Debt & Critical Vulnerabilities Uncovered

### 1. [DEAD CODE] Orphaned `src/lib/api.ts`
- **Location:** `src/lib/api.ts`
- **Issue:** Exports a bare `fetchData` function with no credential support. It is not imported by any file in the application.
- **Remediation:** Remove `src/lib/api.ts` during clean refactor to prevent accidental usage.

### 2. [MISSING TYPINGS] Empty `src/types/user.ts`
- **Location:** `src/types/user.ts` (0 bytes)
- **Issue:** Core user entity types (`User`, `StudentProfile`, `UserRole`, `Permission`) are absent from the types catalog, forcing components to use `any` or redefine user shapes locally.
- **Remediation:** Populate `src/types/user.ts` with canonical interfaces matching backend `User.ts` and `StudentProfile.ts`.

### 3. [INCOMPLETE TYPINGS] `src/types/recordings.ts`
- **Location:** `src/types/recordings.ts`
- **Issue:** Only defines `RecordedClassProps`, omitting recording document shapes, provider unions, and streaming ticket types.
- **Remediation:** Expand `recordings.ts` to include full backend DTO interfaces.

---

## 6. Execution Verification Matrix

| Component | Target File | Line Count | Status | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| Type Augmentation | `src/types/axios.d.ts` | 10 | Audited | Compliant |
| Type Definitions | `src/types/quiz.ts` | 264 | Audited | Compliant & Comprehensive |
| Type Definitions | `src/types/recordings.ts` | 6 | Audited | Incomplete / Under-specified |
| Type Definitions | `src/types/user.ts` | 1 | Audited | Empty File (0 bytes) |
| Network Client | `src/lib/axios.ts` | 72 | Audited | Upgraded to HTTP-Only cookies |
| Network Client | `src/lib/api.ts` | 9 | Audited | Dead Code / Orphaned |
| State Emitter | `src/lib/authState.ts` | 31 | Audited | Compliant (Observer pattern) |

---
**Audit Complete — Phase 14 successfully logged.**
