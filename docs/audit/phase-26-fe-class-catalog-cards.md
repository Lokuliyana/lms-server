# Phase 26 Audit Dossier: Frontend Class Catalog, Class Cards & Hook Abstraction

## 1. Module Overview & Architectural Context

Phase 26 audits the primary public and authenticated course discovery interfaces in `lms-client`. It evaluates the class catalog page, grade-level grouping filters, class card presentation widgets, live Zoom session calculators, empty state containers, and utility helpers.

### Target Scope (7 Files)
1. `src/hooks/useClass.ts` — Intended class data fetching hook abstraction (currently a 0-byte stub).
2. `src/app/classes/page.tsx` — Full course catalog page with dynamic filters, quick grade pills, enrollment view toggles, and grade grouping.
3. `src/components/reusable/classCard.tsx` — Rich course presentation card featuring signed image resolution, live session status detection, meeting window calculations, and mobile Zoom deep links.
4. `src/components/ui/class-view/empty-card.tsx` — Reusable empty state and locked course banner card with configurable call-to-action handlers.
5. `src/components/ui/class-view/theme-provider.tsx` — Misplaced and unreferenced `next-themes` provider wrapper.
6. `src/utils/datetime.ts` — Standalone session scheduling and timezone utility (unreferenced copy of inline date math in `ClassCard.tsx`).
7. `src/utils/upload-class.tsx` — Unreferenced client-side direct Cloudinary file uploader component.

---

## 2. Exhaustive Per-File Reverse Engineering

---

### File 1: `src/hooks/useClass.ts`
- **Path:** `/Users/chandupa/lms-client/src/hooks/useClass.ts`
- **Role:** Originally intended to be a reusable hook for class data fetching, caching, and state management.
- **Current State:** **0 bytes (completely empty file)**.
- **Architectural Analysis & Zero-Loss Assessment:**
  - In both legacy `tuition-frontend/hooks/useClass.ts` and `lms-client/src/hooks/useClass.ts`, this file is 0 bytes.
  - No file across the entire application imports or references `useClass`.
  - Class fetching is implemented imperatively inside individual page components (`classes/page.tsx`, `dashboard/page.tsx`, etc.) via direct calls to `classService`.
  - Per the Zero-Loss Rule, cataloged as an empty placeholder artifact.

---

### File 2: `src/app/classes/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/classes/page.tsx`
- **Role:** Main public and student course catalog. Provides multi-faceted filtering (subject, grade, enrollment status), quick-select grade pills, and courses grouped by academic grade.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:**
  - Next.js: `useSearchParams`, `useRouter`, `Head` (from `next/head`).
  - Hooks: `useAuth`, `useCustomization`, `useState`, `useEffect`, `useMemo`.
  - Services: `getClasses`, `getMyEnrolledClasses` (`classService`).
  - Components: `ClassCard`, `SectionHeader`, `FilterDropdown`, `Button`, `SectionLoader`, `EditableContent`.
  - Formatters: `formatGradeName`, `formatSubjectName`.
- **State & URL Synchronization:**
  - Synchronizes filter state bidirectionally with URL query parameters:
    - `subject`: `?subject=...`
    - `grade`: `?grade=...`
    - `view`: `?view=enrolled`
  - Uses `router.push('/classes?...', { scroll: false })` to preserve viewport scroll position on filter selection.
  - Maintains `enrolledStatusMap` to track whether the logged-in student has active enrollment and paid monthly access (`hasAccessThisMonth`).
- **Data Grouping & Quick Filter Mechanics:**
  - `quickGradeOptions`: Extracts grades from `CustomizationContext`, strips `"Grade "` prefix, deduplicates, and sorts numerically (e.g., 6 through 13).
  - `groupedByGrade`: Groups filtered classes into an associative dictionary: `Record<string, ClassData[]>`.
  - Section headers display grade labels along with dynamic count badges (`${classList.length} classes`).
- **Empty State Fallback:**
  - When no classes match filters, renders a centered card with `Clear All Filters` and `View All Classes` action buttons.
- **Legacy Delta & Identified Defects:**
  - **Defect — Deprecated `next/head` in App Router (`classes/page.tsx:18, 260-269`):** Renders `<Head>` from `next/head` inside a client component in Next.js 14 App Router, which is ignored and logs console warnings.
  - **CMS Route 404:** References `pages.classes.*` in `<EditableContent>`, which fails due to missing `POST /api/admin/content`.
  - **Migration Enhancements:** Added dynamic `useCustomization()` subject/grade name formatting, responsive quick-select grade pill bar, and integrated enrolled status checking.

---

### File 3: `src/components/reusable/classCard.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/reusable/classCard.tsx`
- **Role:** Flagship course presentation card. Renders class media, titles, schedules, live session statuses, Zoom meeting integration, and instructor administration controls.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:**
  - Services: `createMeetingTicket`, `deleteClassApi` (`classService`), `getSignedUrl` (`mediaService`).
  - Next.js: `Image`, `useRouter`.
  - Hooks: `useAuth`, `useState`, `useEffect`, `useMemo`.
  - Formatters: `formatGradeName`, `formatSubjectName`.
- **Media Resolution Pipeline:**
  - Supports HTTP URLs, Cloudinary public paths, Supabase/S3 signed URLs (`getSignedUrl`), and local server uploads (`NEXT_PUBLIC_IMAGE_BASE_URL` fallback `http://localhost:5000/uploads`).
  - Handles expired signed URLs gracefully via `handleImageError`, automatically refreshing signed tokens with a cache-busting nonce.
- **Session Scheduling & Timezone Engine (`Asia/Colombo`):**
  - Configured constants: `MEETING_TZ = "Asia/Colombo"`, `MEETING_TZ_OFFSET = "+05:30"`, `MEETING_WINDOW_HOURS = 24`.
  - Automatically parses weekly batch slots (`days`, `start_time`, `end_time`) and computes the next upcoming session over a 42-day forward projection window.
  - Detects midnight crossing (`isCrossingMidnight`) to adjust end date boundaries.
  - Identifies if a class is currently active (`isLiveNow`) or starting soon within the 24-hour meeting window (`meetingWindow.isOpen`).
- **Live Meeting Launcher & Mobile Deep Linking:**
  - `handleMeetingClick`: Calls `createMeetingTicket(id, mode)` where mode is `"start"` for teachers/admins and `"join"` for enrolled students.
  - **Mobile Zoom App Deep Link Support (`classCard.tsx:423-441`):**
    - Detects iOS/Android user agents (`/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)`).
    - Parses Zoom join/start links and converts them into native `zoomus://` deep links:
      `zoomus://zoom.us/${action}?confno=${meetingId}&pwd=${pwd}&zak=${zak}`.
    - Falls back to `window.open` or `window.location.href` on desktop.
- **Instructor Action Suite:**
  - Instructors and system administrators receive direct "Edit Details" (`/admin/classes/edit/${id}`) and "Delete Class" (`deleteClassApi(id)`) buttons.

---

### File 4: `src/components/ui/class-view/empty-card.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/empty-card.tsx`
- **Role:** Empty state container for locked or empty class modules (syllabus, assignments, recordings, attendance).
- **Dependencies:** `HiLockClosed` from `react-icons/hi2`, `Button` from `@/components/ui/button`.
- **Props Interface:**
  - `title: string`
  - `message: string`
  - `icon?: React.ReactNode` (default: `<HiLockClosed className="w-8 h-8 text-slate-400" />`)
  - `actionText?: string`
  - `onActionClick?: () => void`
  - `actionHref?: string`
- **Rendering Logic:**
  - Renders a horizontal flex container with icon avatar, title, and descriptive message.
  - Renders an action button if `actionText` and either `actionHref` (using `asChild` link) or `onActionClick` are provided.
- **Legacy Delta:**
  - Legacy `tuition-frontend` had a basic static card without action buttons. `lms-client` added interactive CTA buttons and modernized soft border styles.

---

### File 5: `src/components/ui/class-view/theme-provider.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/class-view/theme-provider.tsx`
- **Role:** Generic `next-themes` `ThemeProvider` wrapper.
- **Code Breakdown:**
  ```typescript
  'use client'
  import * as React from 'react'
  import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'
  export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
  }
  ```
- **Architectural Analysis & Defect:**
  - **Misplaced & Orphaned Component:** This file is located in `src/components/ui/class-view/` rather than `src/components/` or `src/providers/`.
  - Grep verification across `src/` proves that **no component or layout imports this file**.
  - The root layout (`src/app/layout.tsx`) does not utilize `ThemeProvider`.
  - Cataloged as an orphaned misfiled utility.

---

### File 6: `src/utils/datetime.ts`
- **Path:** `/Users/chandupa/lms-client/src/utils/datetime.ts`
- **Role:** Timezone and session time calculation functions (`minutesFromHHMM`, `isCrossingMidnight`, `weekdayLowerInTZ`, `ymdInTZ`, `getNextSessionStartISO`).
- **Architectural Analysis & Redundancy:**
  - This file was created to extract session date calculations, but was never actually imported.
  - `ClassCard.tsx` contains a duplicate, inline implementation of these identical functions (`minutesFromHHMM`, `isCrossingMidnight`, `weekdayLowerInTZ`, `ymdInTZ`, `getUpcomingSessions`).
  - Grep confirmed 0 imports for `src/utils/datetime.ts`.

---

### File 7: `src/utils/upload-class.tsx`
- **Path:** `/Users/chandupa/lms-client/src/utils/upload-class.tsx`
- **Role:** Standalone client-side Cloudinary file uploader component using `axios.post` directly to `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`.
- **Architectural Analysis & Redundancy:**
  - Grep confirmed 0 imports for `UploadClassImage` or `upload-class.tsx`.
  - In `lms-client`, file uploads are handled through the backend `mediaService.uploadMedia` endpoint (`POST /api/media/upload`) or via `EditableImage.tsx`. Direct unauthenticated client uploads to Cloudinary are orphaned and bypass backend tenancy controls.

---

## 3. Cross-Cutting Analysis & Contract Reconciliations

### 3.1 Course Catalog Architecture Matrix

| Component / File | Role | Integration Target | Status |
| :--- | :--- | :--- | :--- |
| `useClass.ts` | Data Fetching Hook | None (0 bytes) | ⚪ Empty Stub |
| `classes/page.tsx` | Catalog View | `classService.getClasses`, `getMyEnrolledClasses` | 🟢 Active |
| `classCard.tsx` | Course Presentation | `createMeetingTicket`, `mediaService.getSignedUrl` | 🟢 Active |
| `empty-card.tsx` | Fallback Banner | Class module detail views | 🟢 Active |
| `theme-provider.tsx` | Dark/Light Themes | None (Orphaned in `class-view/`) | ⚪ Dead Code |
| `datetime.ts` | Timezone Calculations| None (Duplicated inline in `classCard.tsx`) | ⚪ Dead Code |
| `upload-class.tsx` | Cloudinary Uploader | None (Bypassed by `mediaService`) | ⚪ Dead Code |

---

## 4. Key Findings & Critical Risks

1. **Four Dead / Orphaned Files in a Single Subsystem (57% Dead Code Ratio in Phase):**
   - `src/hooks/useClass.ts` (0 bytes, unreferenced).
   - `src/components/ui/class-view/theme-provider.tsx` (misplaced, unreferenced).
   - `src/utils/datetime.ts` (unreferenced duplicate of `ClassCard` logic).
   - `src/utils/upload-class.tsx` (unreferenced direct Cloudinary uploader).
2. **Next.js `<Head>` Deprecation in `classes/page.tsx` (`classes/page.tsx:18, 260-269`):**
   - Uses `import Head from "next/head"` inside a `"use client"` App Router page, failing to populate document metadata and generating Next.js warnings.
3. **Advanced Mobile Zoom Deep Linking in `ClassCard.tsx` (`classCard.tsx:423-441`):**
   - Implements native protocol parsing (`zoomus://zoom.us/join?confno=...`) for mobile devices, significantly improving student live session joining ergonomics.
4. **Dynamic Image Token Refreshing in `ClassCard.tsx` (`classCard.tsx:240-250`):**
   - Automatically re-requests signed media URLs upon `onError` image events, preventing broken image placeholders when presigned URLs expire.
