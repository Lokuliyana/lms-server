# Phase 27 Audit Dossier: Frontend Student Class Detail Hub & Layout Framework

## 1. Module Overview & Architectural Context

Phase 27 evaluates the primary course viewing environment in `lms-client` (`/classes/[id]`). This interface serves as the central hub where students and instructors interact with course curricula, live Zoom meetings, video lecture recordings, quizzes, attendance logs, and examination records.

### Target Scope (7 Files)
1. `src/app/classes/[id]/page.tsx` — Next.js dynamic route handler and data hydration container.
2. `src/components/ui/class-view/class-page.tsx` — Responsive 2-column master layout grid for class views.
3. `src/components/ui/class-view/class-header.tsx` — Course hero banner, media presentation, metadata badges, and batch statistics.
4. `src/components/ui/class-view/class-sidebar.tsx` — Financial enrollment state machine, live meeting launcher, schedule projections, and assignment drawer.
5. `src/components/ui/class-view/class-tabs.tsx` — Dynamic animated tab switcher (`Recordings`, `Quizzes`, `Attendance`, `Exams`) and month filtering.
6. `src/components/ui/class-view/class-syllabus.tsx` — Standalone week-by-week curriculum timeline component (orphaned / unmounted).
7. `src/components/ui/class-view/class-recordings.tsx` — Video lecture gallery with automatic Drive/YouTube thumbnail extraction and admin controls.

---

## 2. Exhaustive Per-File Reverse Engineering

---

### File 1: `src/app/classes/[id]/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/classes/[id]/page.tsx`
- **Role:** Route entrypoint for individual course pages. Handles parameter extraction, asynchronous data hydration via `getClassById`, loading skeleton presentation, and 404 redirections.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `useParams`, `useRouter`, `getClassById` (`classService`), `DetailLoader`, `ClassClientPage`.
- **Hydration Lifecycle:**
  - Extracts `id` from route params (normalizing array params if present).
  - Fetches class record via `getClassById(id)`.
  - If class record is `null` or `undefined`, immediately redirects to `/404` via `router.replace("/404")`.
  - While request is in flight, displays `<DetailLoader />`.
- **Legacy Delta:**
  - Functionally identical to legacy `tuition-frontend/app/classes/[id]/page.tsx`.

---

### File 2: `src/components/ui/class-view/class-page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-page.tsx`
- **Role:** Master layout container coordinating child class widgets.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `ClassHeader`, `ClassSidebar`, `ClassTabs`, `authService`, `getClassById`.
- **State & Permissions Computation:**
  - On mount/prop change, inspects stored user:
    ```typescript
    const user = authService.getStoredUser();
    const isTeacher = (user?.role === "teacher" || user?.role === "admin");
    const isEnrolled = classData?.enrolledUsers?.includes(user?._id);
    classData.isPaid = isTeacher || isEnrolled;
    ```
  - Exposes `refetch()` callback to re-query `getClassById(updatedData._id)` whenever payments or applications are submitted in the sidebar.
- **Layout Grid:**
  - Responsive 3-column desktop layout (`grid-cols-1 lg:grid-cols-3 gap-8`):
    - **Main Column (`lg:col-span-2 space-y-8`):** Renders `<ClassHeader />` followed by `<ClassTabs />`.
    - **Sidebar Column (`lg:col-span-1`):** Renders sticky `<ClassSidebar />`.
- **Legacy Delta:**
  - Updated `isTeacher` evaluation to include `"admin"` role, resolving permission lockout issues present in legacy.

---

### File 3: `src/components/ui/class-view/class-header.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-header.tsx`
- **Role:** Course hero banner displaying banner media, grade/subject badges, title, description, and academic metrics.
- **Dependencies:** `next/image`, `HiAcademicCap`, `HiUserGroup`, `HiClock`, `HiCalendar`, `Badge`.
- **Image Resolution:**
  - Supports absolute HTTP URLs, relative paths, local server uploads (`${NEXT_PUBLIC_IMAGE_BASE_URL}/...`), and placeholder fallbacks.
- **Duration Calculator:**
  - Parses batch start/end strings (`HH:mm`) and calculates session duration formatted as `${hours}h ${minutes}m`.
- **Metric Cards Grid:**
  - 4-item statistical summary grid:
    1. **Duration:** e.g., "2h 30m".
    2. **Batches:** Number of active weekly session batches.
    3. **Format:** Physical / Online / Hybrid format.
    4. **Class Type:** e.g., "REGULAR", "REVISION", "PAPER".
- **Legacy Delta:**
  - Restyled metric cards to modern soft borders and indigo icons matching the unified design system.

---

### File 4: `src/components/ui/class-view/class-sidebar.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-sidebar.tsx`
- **Role:** Core enrollment and financial state machine. Controls access gates, live Zoom meeting access, weekly scheduling projections, and assignment summaries.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:**
  - UI: `Button`, `Card`, `Separator`, `DropdownMenu`.
  - Hooks: `useAuth`, `useRouter`, `useState`, `useMemo`.
  - Services: `createMeetingTicket` (`classService`).
  - Child Dialogs: `PaymentProofModal` (from `apply-class.tsx`), `AuthPromptModal`, `ClassAssignments`.
- **Financial & Access State Machine:**
  - Evaluates current access status across multiple flags:
    - `thisMonthPermission`: Boolean indicating active access for current month.
    - `hasPendingThisMonth`: True if payment slip has been submitted and is awaiting admin approval.
    - `hasAnyAccess`: True if user has historical enrollment in previous months.
  - Dynamically displays one of four mutually exclusive action cards:
    1. **Pending Approval Card (`SHOW_PENDING_CARD`):** Rendered when payment proof has been submitted for the current month. Disables re-submission.
    2. **Renew Access Card (`SHOW_RENEW_CARD`):** Rendered for existing students whose subscription has expired for the current calendar month.
    3. **Join Class Card (`SHOW_ENROLL_CARD`):** Rendered for un-enrolled students or guests, showing fee and CTA buttons.
    4. **Previous Month Card:** Dropdown allowing students to purchase archival access to any of the past 6 months.
- **Live Session Launcher & Zoom Deep Linking:**
  - Projects upcoming sessions using Colombo timezone (`Asia/Colombo`, GMT+5:30) and detects if the 24-hour meeting window is open.
  - Automatically converts meeting URLs to native Zoom deep links on mobile devices (`zoomus://zoom.us/join?...`).
- **Assignment Drawer Integration:**
  - If user is privileged or enrolled (`canSeeAssignments`), renders compact `ClassAssignments`. Otherwise displays an amber locked card.

---

### File 5: `src/components/ui/class-view/class-tabs.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-tabs.tsx`
- **Role:** Interactive sub-navigation bar controlling view tabs for class resources.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:**
  - Animation: `framer-motion` (`motion`, `AnimatePresence`).
  - Icons: `HiVideoCamera`, `HiDocumentText`, `CalendarCheck`, `Award`.
  - Submodules: `ClassRecordings`, `ClassQuizzes`, `ClassAttendance`, `ClassGrades`, `EmptyCard`.
  - UI: `Select` (month selector).
- **Tab Architecture:**
  - Modern animated pill bar with Framer Motion spring layout transitions (`layoutId="active-tab"`).
  - 4 Active Tabs:
    1. **Recordings (`HiVideoCamera`):** Lists lecture recordings, filtered by month dropdown.
    2. **Quizzes (`HiDocumentText`):** Displays active quizzes associated with this class.
    3. **Attendance (`CalendarCheck`):** Session attendance register and personal student stats.
    4. **Exams (`Award`):** Class examination marks and performance ranking.
- **Legacy Delta:**
  - Legacy `tuition-frontend` only had 2 tabs: Recordings and Quizzes.
  - `lms-client` added **Attendance** and **Exams**, integrating the academic management suite audited in Phase 08 and Phase 24.

---

### File 6: `src/components/ui/class-view/class-syllabus.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-syllabus.tsx`
- **Role:** Visual syllabus timeline component displaying week numbers, lesson titles, topic pill lists, and durations.
- **Architectural Analysis & Defect:**
  - **100% Dead / Orphaned Code:** Grep verification across `src/` reveals that `ClassSyllabus` is **never imported or mounted anywhere in `lms-client`**.
  - `ClassTabs.tsx` only defines tabs for recordings, quizzes, attendance, and grades. Syllabus was omitted during tab refactoring.
  - Preserved under the Zero-Loss Rule.

---

### File 7: `src/components/ui/class-view/class-recordings.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/class-recordings.tsx`
- **Role:** Grid presentation for recorded video lectures.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `useRouter`, `useAuth`, `deleteRecording`, `EmptyCard`, `Link`, React Icons.
- **Automated Thumbnail Extraction Engine:**
  - Evaluates `driveFileId`, `video_url`, or `driveUrl`:
    - Regex matching for Google Drive IDs: `/d/([a-zA-Z0-9_-]+)/` or `id=([a-zA-Z0-9_-]+)`.
    - Regex matching for YouTube IDs: `youtube.com/...v=([a-zA-Z0-9_-]{11})` or `youtu.be/([a-zA-Z0-9_-]{11})`.
  - Automatically computes thumbnail preview URLs:
    - YouTube: `https://img.youtube.com/vi/${fileId}/mqdefault.jpg`.
    - Google Drive: `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`.
- **Administrative Video Controls:**
  - For teachers and administrators, displays hovering edit (`/admin/recording/edit/${r._id}`) and delete buttons on each card.
- **Smart CTA Empty State:**
  - If no recordings exist, renders `<EmptyCard />` with an action button that programmatically scrolls the viewport to the sidebar enrollment button (`[data-enroll-btn="true"]`) and simulates a click to launch the payment modal.

---

## 3. Cross-Cutting Analysis & Contract Reconciliations

### 3.1 Class Detail View Component Tree

```
classes/[id]/page.tsx
 └── ClassClientPage (class-page.tsx)
      ├── ClassHeader (class-header.tsx)
      ├── ClassTabs (class-tabs.tsx)
      │    ├── ClassRecordings (class-recordings.tsx)
      │    ├── ClassQuizzes (class-quizzes.tsx)
      │    ├── ClassAttendance (class-attendance.tsx)
      │    └── ClassGrades (class-grades.tsx)
      └── ClassSidebar (class-sidebar.tsx)
           ├── PaymentProofModal (apply-class.tsx)
           ├── AuthPromptModal
           └── ClassAssignments (compact)
```

---

## 4. Key Findings & Critical Risks

1. **Orphaned Syllabus Component (`src/components/ui/class-view/class-syllabus.tsx`):**
   - 74 lines of fully styled syllabus timeline UI is completely orphaned because `ClassTabs.tsx` does not include a syllabus tab.
2. **Substantial Feature Expansion Over Legacy:**
   - `ClassTabs.tsx` was expanded from 2 tabs (Recordings, Quizzes) to 4 tabs, seamlessly integrating the net-new `Attendance` and `Exams` modules.
3. **Smart Enrollment Bridge in `class-recordings.tsx` (`class-recordings.tsx:75-80`):**
   - The empty recording state includes an interactive CTA (`"Enroll to Unlock"`) that automatically locates `[data-enroll-btn="true"]` in the DOM, scrolls to it smoothly, and triggers the payment proof dialog.
4. **Resilient Video Thumbnail Fallbacks:**
   - Multi-regex parser extracts IDs from Google Drive URLs and YouTube links, providing high-resolution cover art with fallback gradient overlays.
