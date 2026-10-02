# Phase 20: Frontend Design System Loaders, Skeletons & Card Sections

**Phase**: 20 of 34  
**Layer**: Frontend (`lms-client`)  
**Scope**: 7 Files (Quiz Submission Calculating Loader, Detail Page Skeleton Loader, Grid Section Skeleton Loader, Reusable Section Header Banner, Legacy Sub-Section Stub, Master Card Section Wrapper, Atomic Skeleton Primitive)  
**Status**: Completed  
**Timestamp**: 2026-10-01  

---

## 1. Executive Summary & Architecture Overview

Phase 20 audits the reusable presentation scaffolding, skeleton states, and section wrapper primitives in `lms-client`. These components establish the baseline design system across dashboards, class detail hubs, quiz taking flows, and admin portals:

1. **Submission & Async Feedback Loaders (`calculating-loader.tsx`)**:
   - `CalculatingLoader`: Fullscreen modal overlay (`fixed inset-0 z-50 bg-white/80 backdrop-blur-sm`) featuring multi-layer CSS pulsing background blobs, an animated brain icon (`lucide-react/Brain`), floating sparkles, and gradient heading text. Active exclusively during quiz submission evaluation in `/quizzes/[id]/take/page.tsx`.
2. **Skeleton & Placeholder Design System (`skeleton.tsx`, `detail-loader.tsx`, `section-loader.tsx`)**:
   - `Skeleton`: Atomic shadcn/ui primitive generating `animate-pulse rounded-md bg-slate-200/50` blocks.
   - `DetailLoader`: Page-level loader generating mock title, description, video hero rectangle (300px), and paragraph skeletons. Used across `/recordings/[id]`, `/classes/[id]`, and `/quizzes/[id]/take`.
   - `SectionLoader`: Section-level loader simulating a user profile or category header (avatar + title) followed by a 3-column responsive card grid. Used across `/classes`, `/dashboard`, and `/quizzes`.
3. **Structured Content Framing (`section-header.tsx`, `card-section.tsx`, `sub-section.tsx`)**:
   - `SectionHeader`: Standardized top-of-page banner combining an icon box (`w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600`), title, description, and an actions slot for buttons and filters.
   - `CardSection`: Master dashboard container wrapping sections in a bordered card with gradient accent divider line, "View All" link with responsive text hiding, and mobile edge-to-edge padding overrides.
   - `sub-section.tsx`: An orphaned duplicate of `CardSection` copied from the legacy codebase that is completely unimported in the active application.

---

## 2. Phase 20 Target Files Matrix

| # | Target File | Path | Status | Summary / Core Role |
|---|---|---|---|---|
| 1 | `calculating-loader.tsx` | `lms-client/src/components/reusable/calculating-loader.tsx` | Audited | Fullscreen quiz submission calculating overlay with brain icon and sparkles |
| 2 | `detail-loader.tsx` | `lms-client/src/components/reusable/detail-loader.tsx` | Audited | Page-level skeleton loader for class, recording, and quiz detail views |
| 3 | `section-loader.tsx` | `lms-client/src/components/reusable/section-loader.tsx` | Audited | 3-column responsive card grid skeleton loader for dashboard sections |
| 4 | `section-header.tsx` | `lms-client/src/components/reusable/section-header.tsx` | Audited | Reusable page header with icon badge, title, subtitle, and action buttons |
| 5 | `sub-section.tsx` | `lms-client/src/components/reusable/sub-section.tsx` | Audited | Orphaned legacy duplicate of `CardSection`; unreferenced across codebase |
| 6 | `card-section.tsx` | `lms-client/src/components/reusable/card-section.tsx` | Audited | Master card wrapper with gradient divider line and mobile-optimized padding |
| 7 | `skeleton.tsx` | `lms-client/src/components/ui/skeleton.tsx` | Audited | Atomic animated pulse skeleton placeholder primitive |

---

## 3. Deep Dive Technical Deconstructions

### 3.1 `src/components/reusable/calculating-loader.tsx`

* **Purpose & Architecture**:
  Client-side overlay rendering a high-impact calculating visual while the quiz evaluation pipeline processes submissions asynchronously.
* **DOM Structure & Visual Effects**:
  ```tsx
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
    <div className="relative">
      {/* Pulsing background blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-400/20 rounded-full animate-ping" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-purple-400/20 rounded-full animate-pulse delay-75" />
      
      {/* Main Icon */}
      <div className="relative z-10 bg-white p-4 rounded-full shadow-xl border border-slate-100">
        <Brain className="w-12 h-12 text-indigo-600 animate-pulse" />
      </div>

      {/* Floating sparkles */}
      <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
      <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-pink-400 animate-bounce delay-150" />
    </div>

    <div className="mt-8 space-y-2 text-center">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
        Calculating Results...
      </h3>
      <p className="text-slate-500 font-medium">Analyzing your answers</p>
    </div>
  </div>
  ```
* **Active Consumption**:
  Imported directly in `src/app/quizzes/[id]/take/page.tsx:36` and returned when `isSubmitting === true`.

---

### 3.2 `src/components/reusable/detail-loader.tsx`

* **Purpose & Architecture**:
  Composite loading placeholder for single-entity detail pages.
* **Layout Structure**:
  - Maximum width container (`max-w-4xl mx-auto p-6 space-y-8 py-12`).
  - Header block: Title skeleton (`h-10 w-3/4 sm:w-1/2`) and subtitle (`h-6 w-full sm:w-2/3`).
  - Content block: Media container placeholder (`h-[300px] w-full rounded-2xl`) followed by three body text lines (`h-4`).
* **Active Consumption**:
  Imported in `src/app/recordings/[id]/page.tsx`, `src/app/classes/[id]/page.tsx`, and `src/app/quizzes/[id]/take/page.tsx`.

---

### 3.3 `src/components/reusable/section-loader.tsx`

* **Purpose & Architecture**:
  Grid-level skeleton loader for catalog lists and dashboard section widgets.
* **Layout Structure**:
  - Header profile skeleton: Circular skeleton (`h-12 w-12 rounded-full`) with two stacked title bars (`w-[250px]` and `w-[200px]`).
  - Responsive 3-card grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4`):
    - Loops over `[1, 2, 3]`.
    - Renders a preview card thumbnail (`h-[125px] rounded-xl`) with two lines of body text skeletons.
* **Active Consumption**:
  Imported in `src/app/classes/page.tsx`, `src/app/dashboard/page.tsx`, and `src/app/quizzes/page.tsx`.

---

### 3.4 `src/components/reusable/section-header.tsx`

* **Purpose & Architecture**:
  Standardized hero banner component used across admin management and student catalog pages.
* **Interface**:
  ```typescript
  interface SectionHeaderProps {
    title: ReactNode;
    description: ReactNode;
    icon?: LucideIcon;
    actions?: ReactNode;
  }
  ```
* **Styling & Layout**:
  - Encased in a modern rounded card: `bg-white border border-slate-200/80 px-5 py-5 rounded-2xl shadow-xs`.
  - Icon container: Square rounded badge (`w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600`). Defaults icon to `LayoutDashboard`.
  - Responsive flex orientation: Stacks vertically on small viewports (`flex-col gap-5`) and expands to row with right-aligned action buttons on desktop (`md:flex-row md:items-center md:justify-between`).

---

### 3.5 `src/components/reusable/sub-section.tsx`

* **Purpose & Architecture**:
  A 53-line component defining a `CardSection` wrapper backed by `@/components/dev/card` and `@/components/dev/button`.
* **Architectural Status**:
  **Orphaned Dead Code**.
  - Despite being named `sub-section.tsx`, it exports a component named `CardSection`.
  - The actual production `CardSection` used across the application is located in `src/components/reusable/card-section.tsx`.
  - A codebase-wide grep confirms zero imports referencing `sub-section`.

---

### 3.6 `src/components/reusable/card-section.tsx`

* **Purpose & Architecture**:
  The production standard container for dashboard sections and catalog groups.
* **Key Enhancements over Legacy `sub-section.tsx`**:
  - Gradient Accent Divider: Features an elegant middle-ground divider:
    ```tsx
    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent ml-4 rounded" />
    ```
  - Mobile Padding Normalization: `CardContent` has `px-0` on mobile and `sm:px-6` on tablet/desktop (`pt-0 pb-6 px-0 sm:px-6`), allowing child carousels or cards to bleed cleanly to screen edges on mobile devices.
  - Dedicated `actions` slot alongside the standard `onViewAll` button.
* **Active Consumption**:
  Imported across 5 major production pages (`/classes`, `/admin/dashboard`, `/dashboard`, `/quizzes`, and `create-quiz-form`).

---

### 3.7 `src/components/ui/skeleton.tsx`

* **Purpose & Architecture**:
  The fundamental animated pulse element for the entire UI design system.
* **Implementation**:
  ```typescript
  import { cn } from "@/lib/utils";

  function Skeleton({
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) {
    return (
      <div
        className={cn("animate-pulse rounded-md bg-slate-200/50", className)}
        {...props}
      />
    );
  }

  export { Skeleton };
  ```
* **Performance**:
  Leverages pure CSS keyframe pulse animation (`@keyframes pulse`), causing zero JavaScript execution overhead during loading states.

---

## 4. Legacy Delta & Gaps

| Feature / Component | Legacy (`tuition-frontend`) | Target (`lms-client`) | Gap / Architectural Assessment |
|---|---|---|---|
| **`calculating-loader.tsx`** | Identical 34 lines | Identical 34 lines | 100% parity; active during quiz submission. |
| **`detail-loader.tsx`** | Identical 26 lines | Identical 26 lines | 100% parity; page-level detail skeleton. |
| **`section-loader.tsx`** | Identical 29 lines | Identical 29 lines | 100% parity; 3-column card grid skeleton. |
| **`section-header.tsx`** | Identical 45 lines | Identical 45 lines | 100% parity; standardized page header banner. |
| **`sub-section.tsx`** | 53 lines (deprecated) | 53 lines (unreferenced) | Orphaned legacy code carried over into target codebase. |
| **`card-section.tsx`** | Basic card section | Upgraded card with gradient divider and mobile edge-to-edge padding | Visual upgrade for responsive mobile experience. |
| **`skeleton.tsx`** | Standard Tailwind pulse | Standard Tailwind pulse | 100% parity; atomic primitive. |

---

## 5. Critical Findings & Technical Debt Summary

1. **Orphaned Duplicate Component (`sub-section.tsx`) (Low Priority)**:
   - `sub-section.tsx` exports `CardSection` with an older implementation. It is never imported anywhere and should be deleted to eliminate naming and file confusion.
2. **Missing Accessible ARIA Labels on Skeletons (Low Priority)**:
   - Skeletons in `detail-loader.tsx` and `section-loader.tsx` omit `aria-busy="true"` and `aria-live="polite"` on parent containers, leaving screen readers unaware of ongoing loading transitions.

---

## 6. Verification & Sign-Off Checklist
- [x] All 7 Phase 20 files inspected down to CSS keyframes, JSX layout trees, and responsive breakpoints.
- [x] Confirmed `CalculatingLoader` active role in `/quizzes/[id]/take/page.tsx`.
- [x] Verified widespread usage of `DetailLoader`, `SectionLoader`, `SectionHeader`, and `CardSection`.
- [x] Documented orphaned status and name collision in `sub-section.tsx`.
