# Phase 22: Frontend Content Editors & Public Landing Experience

**Phase**: 22 of 34  
**Layer**: Frontend (`lms-client`)  
**Scope**: 7 Files (Floating Bubble Text Editor, In-Line Visual CMS Text Editor, Croppable Visual CMS Image Editor, Bento Grid Hero Marketing Component, Public Landing Hero Stub, Popular Classes Landing Stub, Root Landing Page Server Component)  
**Status**: Completed  
**Timestamp**: 2026-10-01  

---

## 1. Executive Summary & Architecture Overview

Phase 22 audits the visual CMS in-line editing engines and the public landing page experience in `lms-client`. The application defines high-fidelity visual authoring components alongside public landing pages, but uncovers severe integration breakdowns:

1. **Broken In-Line CMS Mutation Pipeline (`editable-content.tsx`, `editable-image.tsx`)**:
   - Both `EditableContent` and `EditableImage` dispatch mutations to `POST /api/admin/content` using browser `fetch`.
   - **Critical Architecture Failure**: In legacy `tuition-frontend`, `/app/api/admin/content/route.ts` was a local Next.js Route Handler using `fs.writeFileSync` to write updates directly to `lib/content-v2.json`. In the migrated `lms-client`, Next.js API route handlers were omitted entirely (`src/app/api` does not exist), and backend customization was migrated to MongoDB (`/api/customization/settings` in `lms-server`). Consequently, **100% of visual in-line content edits fail with 404 Not Found**.
2. **Admin Role Lockout from Visual CMS (`editable-content.tsx:39`, `editable-image.tsx:63`)**:
   - Both components parse `localStorage.getItem("user")` and check `user.role === "teacher"`. Administrators (`role === "admin"`) are omitted, locking out system admins from editing text and images in edit mode.
3. **Rich Text Formatting Engines (`text-editor.tsx`)**:
   - A 316-line dynamic Quill editor (`theme="bubble"`) featuring a floating toolbar positioned relative to the selection cursor (`editor.getBounds()`). Includes full header, color, highlight, and alignment controls.
4. **Landing Page Architecture & Component Disconnect (`page.tsx`, `hero-marketing.tsx`, `LandingHero.tsx`, `PopularClasses.tsx`)**:
   - Root `src/app/page.tsx` is a Next.js Server Component that reads authentication cookies and redirects authenticated users to their respective dashboards (`/admin/dashboard` for teachers/admins, `/dashboard` for students).
   - For unauthenticated guests, `page.tsx` renders minimal 18-line stubs (`LandingHero.tsx` and `PopularClasses.tsx` with mock skeleton cards), while the comprehensive 245-line Bento marketing component (`HeroMarketing.tsx`) is displaced into `/dashboard/page.tsx`.

---

## 2. Phase 22 Target Files Matrix

| # | Target File | Path | Status | Summary / Core Role |
|---|---|---|---|---|
| 1 | `text-editor.tsx` | `lms-client/src/components/ui/text-editor.tsx` | Audited | 316-line dynamic bubble Quill editor with selection-following floating toolbar |
| 2 | `editable-content.tsx` | `lms-client/src/components/admin/editable-content.tsx` | Audited | In-line CMS text component with inline contentEditable mode and rich text mode (**Broken: 404**) |
| 3 | `editable-image.tsx` | `lms-client/src/components/admin/editable-image.tsx` | Audited | In-line CMS image replacement modal with `react-easy-crop` and Cloudinary uploader (**Broken: 404**) |
| 4 | `hero-marketing.tsx` | `lms-client/src/components/ui/hero-marketing.tsx` | Audited | 245-line Bento marketing hero: value prop, credibility stats, upcoming session widget |
| 5 | `LandingHero.tsx` | `lms-client/src/components/ui/landing/LandingHero.tsx` | Audited | 18-line minimal placeholder landing hero for unauthenticated visitors |
| 6 | `PopularClasses.tsx` | `lms-client/src/components/ui/landing/PopularClasses.tsx` | Audited | 18-line mock server component rendering 3 hardcoded skeleton class boxes |
| 7 | `page.tsx` | `lms-client/src/app/page.tsx` | Audited | Server-side auth gate redirecting logged-in users and rendering landing stubs |

---

## 3. Deep Dive Technical Deconstructions

### 3.1 `src/components/ui/text-editor.tsx`

* **Purpose & Architecture**:
  Client-side rich text editor using `react-quill-new` configured in bubble mode (`theme="bubble"`, `ssr: false`). Replaces the native Quill toolbar with a custom animated floating bubble that follows the user's cursor selection.
* **Selection Mathematics & Floating Positioning**:
  ```typescript
  const handleSelectionChange = (range: any, source: any, editor: any) => {
    if (range && range.length > 0) {
      const bounds = editor.getBounds(range.index, range.length);
      const top = bounds.top - 60; // 60px above selection
      const left = bounds.left + bounds.width / 2; // Horizontally centered

      setToolbarPos({ top, left });
      setShowToolbar(true);
      setFormats(editor.getFormat(range));
    } else {
      setShowToolbar(false);
      setShowColorPicker(false);
      setShowHighlightPicker(false);
    }
  };
  ```
* **Formatting Palette**:
  - Headers: Heading 1 (`H1`), Heading 2 (`H2`), Normal Text.
  - Basic Styles: Bold, Italic, Underline.
  - Colors: 12-swatch grid (`#000000` through `#ec4899`).
  - Highlighting: 6-swatch pastel background grid.
  - Alignment: Left, Center. Bullet lists.

---

### 3.2 `src/components/admin/editable-content.tsx`

* **Purpose & Architecture**:
  In-line visual CMS text editor component wrapping arbitrary DOM elements (`h1`, `p`, `span`, `div`). When `isEditMode === true` and the user is authorized, hovering over text reveals a pencil edit badge. Clicking enters in-place editing.
* **Dual Editing Modes**:
  1. **Inline Plain Text Mode (`!hasHtml`)**:
     - Uses native browser `contentEditable` on a `<span>`.
     - Maintains all parent typography classes (`text-5xl font-extrabold text-slate-900`) during typing without layout distortion.
     - Automatically moves cursor to the end of the string using `document.createRange()`.
     - Displays floating micro action buttons (Save checkmark, Cancel X).
  2. **Rich Text Mode (`hasHtml`)**:
     - Switches to `TextEditor` with floating formatting toolbar.
* **Critical Bugs & Failures**:
  1. **404 Save Failure**: Lines 77-86 execute `fetch("/api/admin/content", { method: "POST", ... })`. In Next.js App Router, `/api/admin/content` does not exist. All save attempts fail and throw error toasts.
  2. **Admin User Lockout**: Lines 39-41 inspect `storedUser.role === "teacher"`. Administrators (`user.role === "admin"`) are denied editing permissions.
  3. **Direct LocalStorage Access**: Bypasses `useAuth()` or `useAuthContext()`.

---

### 3.3 `src/components/admin/editable-image.tsx`

* **Purpose & Architecture**:
  Visual CMS image component. When `isEditMode === true`, clicking the image opens a modal dialog equipped with `react-easy-crop` and zoom controls.
* **Upload & Mutation Lifecycle**:
  1. User selects a local image file via `<input type="file" accept="image/*" />`.
  2. Renders in `<Cropper>` with specified aspect ratio (default `16/9`) and zoom slider (1x to 3x).
  3. Clicking "Save Changes" crops the canvas via `getCroppedImg(selectedFile, croppedAreaPixels)`.
  4. Direct multipart upload to Cloudinary: `POST https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`.
  5. Dispatches `fetch("/api/admin/content", { method: "POST", body: JSON.stringify({ key: configKey, value: newImageUrl }) })`.
* **Critical Bugs & Failures**:
  - Same phantom endpoint bug: Fails with 404 Not Found at step 5.
  - Same admin lockout bug: Checks only `user.role === "teacher"`.

---

### 3.4 `src/components/ui/hero-marketing.tsx`

* **Purpose & Architecture**:
  High-conversion marketing Bento hero component (245 lines).
* **Content Hierarchy**:
  - **Left Column**:
    - Credibility badge with shield icon.
    - Master headline incorporating dynamic `teacherName` from `BrandingContext`.
    - Native Sinhala mission quote with left indigo accent border.
    - Verified metric statistics strip: 1,250+ verified students, 98.6% district pass rate, 24/7 HD replays.
    - Responsive CTA buttons (`Join Class` or `Continue Learning` depending on auth state).
  - **Right Column (Bento Cards)**:
    - **Live Session Card**: Next scheduled class widget with pulsing green indicator (`animate-ping`), countdown timer, class topic, time slot, and interactive materials checklist.
    - **Instructor Card**: High-resolution educator portrait (`heroImage1`), qualifications (`B.Sc. Eng (Hons)`), and experience badge (`10+ Years Experience`).
* **Active Mounting Location**:
  Currently displaced into `src/app/dashboard/page.tsx:97` rather than the public root homepage.

---

### 3.5 `src/components/ui/landing/LandingHero.tsx` & `src/components/ui/landing/PopularClasses.tsx`

* **Implementation**:
  - `LandingHero.tsx` (18 lines): Generic headline ("The Future of Learning"), generic description, and a single static link to `/login`.
  - `PopularClasses.tsx` (18 lines): Async server component rendering three gray placeholder skeleton boxes labeled "Example Class 1", "Example Class 2", and "Example Class 3". Hardcoded comment reads `// In a real app, this would fetch from the backend`.
* **Analysis**:
  These two components are unfinished boilerplate stubs that degrade the public-facing landing experience.

---

### 3.6 `src/app/page.tsx`

* **Purpose & Architecture**:
  The Next.js 16 Server Component serving the root route `/`.
* **Session Evaluation & Redirection Logic**:
  ```typescript
  async function getUserSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    
    try {
      const res = await fetch(`${process.env.API_ORIGIN || "http://127.0.0.1:4002/api"}/auth/profile`, {
        headers: { Cookie: `token=${token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
  ```
* **Routing Decision**:
  - If authenticated:
    - `role === "teacher" || role === "admin"` -> Server redirects to `/admin/dashboard`.
    - Otherwise -> Server redirects to `/dashboard`.
  - If unauthenticated:
    - Renders `<LandingHero />` and `<PopularClasses />`.
* **Deficiency**:
  The fallback URL `http://127.0.0.1:4002/api` defaults to port 4002 instead of backend port 4000.

---

## 4. Legacy Delta & Gaps

| Feature / Pattern | Legacy (`tuition-frontend`) | Target (`lms-client`) | Gap / Architectural Assessment |
|---|---|---|---|
| **CMS Content Persistence** | Next.js API route `/api/admin/content/route.ts` writing to `lib/content-v2.json` | Next.js API route omitted; backend uses `/api/customization/settings` | **Critical Breaking Regression**: Visual CMS save fails with 404 in target application. |
| **In-Line CMS Role Check** | Checked `role === "teacher"` | Checked `role === "teacher"` | Inherited legacy defect locking out `admin` users from visual editing. |
| **Rich Text Editor** | Identical bubble Quill | Identical bubble Quill | 100% parity; preserved floating selection toolbar. |
| **Public Landing Page** | Rich marketing layout | Minimal stubs (`LandingHero`, `PopularClasses`) | Regression: Public landing page is downgraded to unfinished placeholders while rich marketing hero is hidden in `/dashboard`. |

---

## 5. Critical Findings & Technical Debt Summary

1. **Dead In-Line CMS Mutation Endpoint (Critical Priority)**:
   - Both `EditableContent.tsx:77` and `EditableImage.tsx:123` post to `/api/admin/content`. This route does not exist anywhere in `lms-client` or `lms-server`. Saving any visual edit produces an immediate HTTP 404 error.
   - **Resolution**: Route requests to `lms-server`'s `PUT /api/customization/settings` via `@/lib/axios` or create a Next.js App Router route handler at `src/app/api/admin/content/route.ts` that bridges mutations to the backend.
2. **Admin Role Lockout from CMS (High Priority)**:
   - `EditableContent.tsx:39` and `EditableImage.tsx:63` strictly check `user.role === "teacher"`. System administrators (`role === "admin"`) are blocked from editing.
3. **Unfinished Public Landing Page (Medium Priority)**:
   - `src/app/page.tsx` renders bare stubs `LandingHero` and `PopularClasses` (with placeholder `Example Class 1..3`) instead of consuming `HeroMarketing` and querying live popular classes from `/api/classes`.
4. **Port Fallback Mismatch (`page.tsx:12`) (Low Priority)**:
   - Hardcoded server-side fallback `http://127.0.0.1:4002/api` clashes with backend port `4000`.

---

## 6. Verification & Sign-Off Checklist
- [x] All 7 Phase 22 files inspected down to Quill event handlers, cropping canvases, and server cookies.
- [x] Uncovered the root cause of the broken visual CMS editing pipeline (`/api/admin/content` 404).
- [x] Identified administrative role lockout in both `EditableContent` and `EditableImage`.
- [x] Documented landing page stub degradation and session redirection flows.
