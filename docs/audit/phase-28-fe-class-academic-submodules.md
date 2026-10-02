# Phase 28 Audit Dossier: Frontend Class Academic Submodules (Attendance, Grades & Tasks)

## 1. Module Overview & Architectural Context

Phase 28 audits the academic execution, evaluation, and homework management submodules embedded in the course detail view (`/classes/[id]`). It covers student attendance logging, exam gradebooks, quiz grids, assignment creation/submission, centralized homework downloads, enrollment payment modals, and course form definitions.

### Target Scope (7 Files)
1. `src/components/ui/class-view/class-attendance.tsx` — Student attendance log and privileged roll-call register.
2. `src/components/ui/class-view/class-grades.tsx` — Student exam report cards, instructor score sheet, and CSV export.
3. `src/components/ui/class-view/class-quizzes.tsx` — Responsive course quiz catalog cards with difficulty and timer badges.
4. `src/components/ui/class-view/class-assignments.tsx` — Assignment distribution, student file uploads, and teacher management.
5. `src/components/ui/class-view/AssignmentsDownloadAndView.tsx` — Centralized multi-class submission review and batch file downloader.
6. `src/components/ui/class-view/apply-class.tsx` — Course admission modal supporting offline bank slip uploads and instant online Stripe/PayHere checkout.
7. `src/components/ui/class-view/class-form.tsx` — Orphaned Server Action class authoring form (coexisting alongside active `ClassForm.tsx`).

---

## 2. Exhaustive Per-File Reverse Engineering

---

### File 1: `src/components/ui/class-view/class-attendance.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-attendance.tsx`
- **Role:** Interactive attendance tracker supporting student history views and privileged instructor roll-call session logging.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `attendanceService`, `Button`, `Input`, `Card`, `Badge`, Lucide icons.
- **Data Model & Type Contracts:**
  - `AttendanceSheet`: `{ _id, classId, date, sessionTitle, sessionType, records: StudentAttendanceEntry[], notes? }`.
  - Statuses: `"present" | "absent" | "late" | "excused"`.
  - Types: `"lecture" | "tutorial" | "revision" | "exam" | "other"`.
- **Dual-Mode Architecture:**
  - **Student View (`!isPrivileged`):**
    - 4 Top Metric Cards: Overall Attendance Rate percentage (with dynamic progress bar), Present count, Late count, Absent count.
    - Session Attendance Log: Chronological list of recorded sessions with date, title, session type badge, and personal status badge (`Present`, `Late`, `Absent`, `Excused`).
  - **Privileged Instructor View (`isPrivileged`):**
    - Top stats: Class attendance rate, recorded sessions, total present marks, total absences.
    - Sheet header controls: Date input, Session title input, Type selector, bulk action buttons ("All Present", "All Absent"), "Save Sheet" button.
    - Live Counter: Real-time badges showing count of present, late, absent, and excused students in current roster.
    - Roster Table: Per-student status toggle buttons and private note input.
    - Past Sessions Drawer: History list enabling teachers to reload past attendance sheets for auditing or correction (`loadPastSession`).
- **Legacy Delta:**
  - **Net-new module in `lms-client`**: No equivalent existed in legacy `tuition-frontend`. Aligns with `attendanceController.ts` audited in Phase 08.

---

### File 2: `src/components/ui/class-view/class-grades.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-grades.tsx`
- **Role:** Comprehensive academic grading ledger, report card generator, and examination management suite.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `gradeService`, `Button`, `Input`, `Card`, `Badge`, Lucide icons.
- **Grading Scale Algorithm:**
  $$\text{Grade} = \begin{cases} \text{A+} & \text{percentage} \ge 85 \\ \text{A} & \text{percentage} \ge 75 \\ \text{B} & \text{percentage} \ge 65 \\ \text{C} & \text{percentage} \ge 55 \\ \text{S} & \text{percentage} \ge 40 \\ \text{F} & \text{otherwise} \end{cases}$$
- **Dual-Mode Architecture:**
  - **Student View (`!isPrivileged`):**
    - Displays official report card cards: Exam title, date, term/month badge, letter grade badge, numerical score out of max marks, percentage, class rank (`#1/45`), class benchmarks (average and highest marks), and personalized teacher remarks.
  - **Privileged Instructor View (`isPrivileged`):**
    - Exam Creator: Exam Title, Date, Max Marks, Pass Marks, Term/Month, "Published to Students" visibility toggle.
    - Live Analytics: Computed average score, pass rate percentage, and roster total.
    - Interactive Score Table: Input marks per student with automatic real-time percentage and grade calculation.
    - Exam Ledger Table: Displays recorded exams with Publish/Unpublish toggle (`gradeService.togglePublish`), CSV gradebook download (`gradeService.exportCsvUrl`), and Edit action (`loadExamForEditing`).
- **Legacy Delta:**
  - **Net-new module in `lms-client`**: Implements examination grading capabilities missing in legacy `tuition-frontend`.

---

### File 3: `src/components/ui/class-view/class-quizzes.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-quizzes.tsx`
- **Role:** Course quiz gallery displaying active assessment challenges associated with the class.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `HiAcademicCap`, `HiClock`, `HiDocumentText`, `HiPlay`, `framer-motion`, `Link`.
- **Card Structure & Capabilities:**
  - Staggered entrance animation via Framer Motion.
  - Top status pill ("Active" vs "Closed").
  - Subject and Difficulty badges (`Easy` / `Medium` / `Hard`).
  - Question count and formatted time limit (`formatTime(sec)`).
  - Primary CTA button routing to `/quizzes/${q._id}` (disabled if closed).
- **Legacy Delta:**
  - 100% byte-for-byte identical with legacy `tuition-frontend/components/ui/class-view/class-quizzes.tsx`.

---

### File 4: `src/components/ui/class-view/class-assignments.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-assignments.tsx`
- **Role:** Complete homework and assignment distribution module. Handles teacher assignment authoring, student file submissions, and due-date tracking.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `assignmentService`, `mediaService`, `date-fns`, `useAuth`, Dev UI components.
- **Shared Upload Architecture (`InstantUploader`):**
  - Manages image and PDF uploads up to 10MB (`MAX_MB = 10`, `ACCEPT = "image/*,application/pdf"`).
  - Integrates with `mediaService.uploadMedia` with real-time percentage progress bar.
- **Modal Workflows:**
  - `CreateAssignmentModal`: Teachers specify title, description, attachments, and automatic 7-day forward due date (`addDays(new Date(), 7)`).
  - `SubmitModal`: Students upload homework solutions directly to `ownerType = "answer"` with instantaneous submission creation (`upsertSubmission`).
- **Compact Sidebar Mode:**
  - Supports `compact = true` prop for condensed embedding inside `ClassSidebar.tsx`.
- **Legacy Delta:**
  - Broadened `isTeacher` authorization to explicitly include `"admin"` role: `(role === "teacher" || role === "admin") || role === "moderator"`.
  - Added skeleton loading state replacing simple text.

---

### File 5: `src/components/ui/class-view/AssignmentsDownloadAndView.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/AssignmentsDownloadAndView.tsx`
- **Role:** Central administrative submission dashboard for reviewing, filtering, and downloading all submitted student assignments across all classes.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `assignmentService.listAllSubmissions`, `framer-motion`, Dev UI components, Lucide icons.
- **Features & Workflows:**
  - Dual layout switcher: Grid card view vs compact List row view.
  - Multi-criteria filtering: Search query, Class dropdown, and Assignment dropdown.
  - Metric Cards: Total Submissions, Unique Students, Total Files, Unique Assignments.
  - Automated Batch Downloader (`handleDownload`):
    - Fetches binary blobs and generates sanitized download filenames:
      `${safeFileName(class)} - ${safeFileName(student)} - ${safeFileName(assignment)} - ${idx+1}.${ext}`.
- **Legacy Delta:**
  - 100% byte-for-byte identical with legacy `tuition-frontend/components/ui/class-view/AssignmentsDownloadAndView.tsx`.

---

### File 6: `src/components/ui/class-view/apply-class.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/apply-class.tsx`
- **Role:** Admission and enrollment modal dialog (`PaymentProofModal`).
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `classService.applyForClass`, `mediaService.uploadMedia`, `API` (`@/lib/axios`), `use-toast`.
- **Dual Payment Pathways:**
  1. **Offline Bank Slip Upload:**
     - Validates file format (Images/PDF) and size (10MB).
     - Uploads slip to storage bucket via `uploadMedia(f, "enrollment", classId)`.
     - Calls `applyForClass(classId, uploadedUrl, requestedMonth)` creating a pending application.
     - Invokes `onSuccess(requestedMonth)` to trigger persistent pending card in sidebar.
  2. **Instant Online Payment (`handlePayOnline` — Net-New):**
     - Sends `POST /payments/checkout` with `{ classId, monthKey: requestedMonth }`.
     - Immediately redirects user to Stripe / PayHere hosted checkout gateway.
- **Legacy Delta:**
  - Added the **"Pay Online (Instant)"** button and checkout integration, connecting with backend payment controllers audited in Phase 11.

---

### File 7: `src/components/ui/class-view/class-form.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-form.tsx`
- **Role:** Course authoring form built using `react-hook-form`, `zod`, and React 19 `useActionState`.
- **Architectural Analysis & Casing Risk:**
  - **100% Dead / Orphaned Code:** Grep confirmed 0 imports for `class-form.tsx` across the codebase.
  - **Severe Name Collision Hazard:**
    - Active form: `src/components/ui/class-view/ClassForm.tsx` (capitalized, 461 lines) — imported by `admin/classes/add/page.tsx` and `admin/classes/edit/[id]/client.tsx`.
    - Orphaned form: `src/components/ui/class-view/class-form.tsx` (lowercase, 288 lines) — unreferenced.
    - On case-insensitive operating systems (macOS APFS / Windows NTFS), these two files collide, causing potential build inconsistencies and import ambiguity.
  - Preserved under the Zero-Loss Rule with high-priority technical debt logging.

---

## 3. Cross-Cutting Analysis & Contract Reconciliations

### 3.1 Academic Management Subsystem Alignment

| Component | Express Route | Controller Action | Status |
| :--- | :--- | :--- | :--- |
| `class-attendance.tsx` | POST `/attendance`, GET `/attendance/class/:id` | `attendanceController.markAttendance` | 🟢 Validated |
| `class-grades.tsx` | POST `/grades`, PUT `/grades/:id/publish` | `gradeController.recordResults`, `togglePublish` | 🟢 Validated |
| `class-quizzes.tsx` | GET `/classes/:id/quizzes` | `quizController.getClassQuizzes` | 🟢 Validated |
| `class-assignments.tsx` | POST `/assignments/:id/submit` | `assignmentController.submit` | 🟢 Validated |
| `apply-class.tsx` | POST `/payments/checkout` | `paymentController.createCheckoutSession` | 🟢 Validated |
| `class-form.tsx` | None (Orphaned) | None | ⚪ Dead Code |

---

## 4. Key Findings & Critical Risks

1. **Dangerous Casing Collision (`ClassForm.tsx` vs `class-form.tsx`):**
   - Two files differing only by casing exist in `src/components/ui/class-view/`. `ClassForm.tsx` is the production form, whereas `class-form.tsx` is orphaned dead code that risks filesystem overwrites.
2. **Major Net-New Academic Capabilities:**
   - `class-attendance.tsx` and `class-grades.tsx` represent substantial additions that provide complete roll-call management and examination grading ledgers with automatic percentage, rank, and grade calculation.
3. **Instant Online Payment Integration in `apply-class.tsx` (`apply-class.tsx:133-143`):**
   - Students can bypass manual slip verification and pay directly via Stripe/PayHere through `POST /payments/checkout`.
4. **Sanitized Batch File Downloader (`AssignmentsDownloadAndView.tsx:146-167`):**
   - Formats clean, collision-free local filenames for bulk grading downloads.
