# Phase 25 Audit Dossier: Frontend Dashboards, Profiles & Info Hub

## 1. Module Overview & Architectural Context

Phase 25 examines the user dashboard, personal profile workflows, public educator biography ("About / Info"), and user management components in `lms-client`. This module connects the identity services (`authService`, `useAuth`) and course discovery services (`classService`, `quizService`) with the primary student landing experience and administration views.

### Target Scope (7 Files)
1. `src/app/dashboard/page.tsx` — Main student landing dashboard, class cards, quiz previews, and contact launcher.
2. `src/app/dashboard/profile/page.tsx` — Student personal profile overview and enrolled class listing.
3. `src/app/user/[id]/page.tsx` — Full-featured user profile view, self-service profile updates, password changes, and administrative RBAC role assignment.
4. `src/app/info/page.tsx` — Educator biography, credentials, student achievement showcase, and public institutional portfolio.
5. `src/components/ui/user/UserCard.tsx` — Compact user data summary widget.
6. `src/components/ui/user/UserForm.tsx` — Comprehensive user creation/edition dialog form with inline administrative password reset and role elevation.
7. `src/utils/cropImage.ts` — HTML5 Canvas image cropping and rotation utility for user avatars and banners.

---

## 2. Exhaustive Per-File Reverse Engineering

---

### File 1: `src/app/dashboard/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/dashboard/page.tsx`
- **Role:** Central landing hub for authenticated students and guest visitors. Displays personalized greetings, enrolled classes with access status, recommended catalog classes, and interactive quizzes.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:**
  - Hooks: `useAuth`, `useRouter`, `useState`, `useEffect`.
  - Reusable Components: `SectionHeader`, `CardSection`, `SectionLoader`, `ClassCard`, `QuizCard`, `HeroMarketing`, `EditableContent`.
  - Services: `getClasses`, `getMyEnrolledClasses` (`classService`), `getAllQuizzesForPlay` (`quizService`).
  - Libraries: `framer-motion`, `react-icons/fa` (`FaWhatsapp`), `next/head` (`Head`).
  - Config: `siteConfig`, `pagesConfig` from `@/lib/site-config`.
- **State Architecture:**
  - `classes: any[]` — List of all published classes.
  - `enrolledClasses: any[]` — Classes the current student is enrolled in.
  - `quizzes: any[]` — Available quizzes for play.
  - `isGuest: boolean` — Derived from `!user`.
  - `displayName: string | undefined` — Formatted user display name (`user.full_name` || `user.fullName` || combined first/last name).
  - `loading: boolean` — Network request pending state.
- **Data Fetching Lifecycle:**
  - Triggers on `[user, authLoading]`.
  - Parallel batch fetching:
    ```typescript
    const promises = [getClasses(), getAllQuizzesForPlay()];
    if (user) promises.push(getMyEnrolledClasses());
    const results = await Promise.all(promises);
    ```
  - Gracefully falls back to empty arrays on network errors.
- **Rendered Sections:**
  1. `HeroMarketing`: Passes `isGuest` and `displayName` to render promotional or welcome messages.
  2. `Enrolled Classes`: Rendered only for authenticated users who have enrolled classes. Renders `ClassCard` with `isEnrolled={true}` and `hasAccessThisMonth={c.hasAccessThisMonth}`.
  3. `Popular Classes`: Displays first 3 classes from catalog (`classes.slice(0, 3)`).
  4. `Quizzes`: Displays first 3 quizzes (`quizzes.slice(0, 3)`).
  5. `Floating WhatsApp Action Button`: Fixed floating circular button with pulsating box-shadow animation.
- **Legacy Delta & Identified Defects:**
  - **Migration improvement:** Legacy `tuition-frontend/app/dashboard/page.tsx` read `localStorage.getItem("user")` directly on window; `lms-client` properly uses `useAuth()` with `authLoading` guards.
  - **Defect — Deprecated `next/head` in Next.js App Router (`page.tsx:16, 81-93`):**
    - The component imports `Head` from `next/head` and renders `<Head>` tags inside a `"use client"` App Router page. In Next.js 13+ App Router, `next/head` is not supported in the `app` directory and causes console warnings or silent failures. Metadata should be managed via root/layout metadata or page metadata.
  - **Defect — Hardcoded External Contact (`page.tsx:239`):**
    - `href="https://wa.me/+94706844133"` hardcodes a specific Sri Lankan phone number instead of utilizing `siteConfig.footer.social.whatsapp` or tenant customization settings.
  - **CMS Route 404:** Multiple `EditableContent` wrappers point to `pages.dashboard.*`, but the backend route handler `POST /api/admin/content` is absent.

---

### File 2: `src/app/dashboard/profile/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/dashboard/profile/page.tsx`
- **Role:** Dedicated student profile overview and class enrollment status page.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:** `useAuth`, `getMyEnrolledClasses`, `Skeleton`, `Link`.
- **State Architecture:**
  - `user`: From `useAuth()`.
  - `classes: any[]`: Enrolled classes returned from `getMyEnrolledClasses()`.
  - `loading`: Auth loading state.
- **Layout & Structure:**
  - Skeleton loading screen while auth is resolving.
  - Authentication guard: displays `"Please log in."` if `!user`.
  - Personal Information card: Full Name, Email, Phone, and Role.
  - Enrolled Classes card: List of enrolled courses with links to `/classes/${cls._id}`.
- **Legacy Delta:**
  - In legacy `tuition-frontend`, `app/dashboard/profile/page.tsx` was an empty stub (0 bytes). Fully realized in `lms-client`.

---

### File 3: `src/app/user/[id]/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/user/[id]/page.tsx`
- **Role:** Comprehensive profile hub supporting self-service profile editing, password changes, and administrative RBAC role assignments and password resets.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:**
  - Next.js: `useParams`, `useRouter`.
  - Animation: `framer-motion` (`motion`, `AnimatePresence`).
  - UI Components: `Input`, `Label`, `Button`, `Select`, `Textarea`, `Card`, `Badge`, `Avatar`.
  - Services: `authService`.
  - Hooks: `useAuth`, `toast`.
- **RBAC & Authorization Matrix:**
  - `isOwnProfile = currentUser?._id === userId`
  - `canResetPassword = isTeacher || isModerator`
  - Teachers/moderators can view and reset passwords for other users.
  - Privileged callers can reassign user roles via dynamic dropdown.
- **Form Data Model (`mapUserToForm`):**
  - Common: `full_name`, `email`, `phone`.
  - Student: `school`, `grade`, `birth_date` (ISO date formatted to `YYYY-MM-DD`), `ol_year`, `al_year`.
  - Teacher: `bio`, `qualifications`.
- **Operations & API Interactions:**
  1. `authService.getUserById(userId)`: Hydrates user details and mapped form fields.
  2. `authService.getRoles()`: Populates role selector for privileged admins.
  3. `authService.updateUserRole(userId, [roleId])`: Immediately updates RBAC role assignments.
  4. `authService.adminResetPassword(userId, { newPassword, confirmPassword })`: Privileged password override without requiring old password.
  5. `authService.changePassword({ oldPassword, newPassword, confirmPassword })`: Self-service password change verifying current password.
  6. `authService.editUser(userId, payload)`: Saves modified profile data with sanitized payload fields.
- **Legacy Delta & Enhancements:**
  - Replaced raw `localStorage` eviction in `handleLogout` with central `useAuth().logout()`.
  - Added dedicated **Role Management** sidebar section allowing instantaneous RBAC adjustments.

---

### File 4: `src/app/info/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/info/page.tsx`
- **Role:** Public institution and educator portfolio showcasing instructor qualifications, academic timeline, student achievements, and course features.
- **Client/Server Type:** Client Component (`"use client"`).
- **Dependencies:**
  - Next.js: `Image`, `useMemo`.
  - Components: `Button`, `EditableContent`, `EditableImage`.
  - Context & Config: `useCustomization`, `getPagesConfig`, `getSiteConfig`.
- **Customization Context Integration:**
  - Hydrates page configuration dynamically:
    ```typescript
    const { siteSettings, pagesSettings, subjects, grades } = useCustomization();
    const pagesConfig = useMemo(() => getPagesConfig({ site: siteSettings, pages: pagesSettings, subjects, grades }), [siteSettings, pagesSettings, subjects, grades]);
    ```
- **SEO & Structured Data:**
  - Injects Google-compliant Schema.org `Person` JSON-LD structured data into the document head.
- **Modular Component Breakdown:**
  - `Pill`: Soft badge wrapper with subtle border and drop shadow.
  - `StatCard`: Animated statistics card displaying numerical milestones and Lucide icons.
  - `TimelineItem`: Vertical chronological pathway connecting education and experience nodes.
  - `HeroHeading`: Editable title and subtitle banner.
  - `AboutPortfolioPage`: Main grid assembling:
    - Results and rankings banner (16:9 aspect ratio image).
    - Teacher bio section (3:4 portrait, pills, introduction, social media links).
    - Institutional quote card.
    - Educational timeline (university, degree milestones, 4:5 image).
    - Key features grid ("What students get").
    - Statistics metrics grid.
- **Legacy Delta:**
  - Legacy `tuition-frontend` used a static Server Component reading directly from static `site-config.ts`.
  - `lms-client` converted the page to a dynamic client component bound to the MongoDB customization context (`useCustomization()`), enabling instant real-time visual branding updates.

---

### File 5: `src/components/ui/user/UserCard.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/user/UserCard.tsx`
- **Role:** Compact card component for displaying user summaries in admin directories or modal dialogs.
- **Dependencies:** `Button` from `@/components/dev/button`.
- **Props:** `{ user: any; onEdit?: () => void }`.
- **Structure:**
  - Full Name (`h3 font-semibold`).
  - Email (`text-sm text-gray-500`).
  - Phone (`text-xs`).
  - Role pill (`text-xs bg-gray-100 rounded`).
  - Optional "Edit" button if `onEdit` callback is provided.
- **Legacy Delta:**
  - 100% byte-for-byte identical with legacy `tuition-frontend/components/ui/user/UserCard.tsx`.

---

### File 6: `src/components/ui/user/UserForm.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/user/UserForm.tsx`
- **Role:** Comprehensive reusable user creation and modification form. Handles role-specific profile fields, role promotion/demotion, and administrative password resets.
- **Dependencies:**
  - UI: `Input`, `Label`, `Button`, `Select`, `Textarea`.
  - Hooks: `useAuth`, `toast`.
  - Services: `authService`.
  - Icons: Lucide icon set.
- **Mode & State Detection:**
  - `isNew = !initialData?._id`: Toggles between User Creation mode (requiring email and password) and User Edit mode.
  - `canResetPassword = !isNew && (isTeacher || isModerator)`.
  - `canChangeRole = isTeacher || isNew`.
  - `readOnly = isModerator && isEditingTeacher`: Enforces security hierarchy where moderators cannot edit teachers.
- **Data Normalization (`shapePayload`):**
  - Common: `full_name`, `phone`, `role`.
  - On creation: adds `email`, `password`.
  - Student: appends `school`, `grade`, `birth_date`, `home_address`.
  - Teacher: appends `bio`, `qualifications`.
- **Embedded Capabilities:**
  - `handleRoleChangeOnly`: Allows changing a user's role independently without saving the entire form.
  - `handleResetPassword`: Inline password reset form for administrators with confirmation validation.
- **Legacy Delta:**
  - 100% byte-for-byte identical with legacy `tuition-frontend/components/ui/user/UserForm.tsx`.

---

### File 7: `src/utils/cropImage.ts`
- **Path:** `/Users/chandupa/lms-client/src/utils/cropImage.ts`
- **Role:** Client-side HTML5 canvas image processing utility used for image cropping, rotation, and JPEG blob export.
- **Dependencies:** Browser Canvas API (`HTMLImageElement`, `HTMLCanvasElement`, `CanvasRenderingContext2D`).
- **Core Algorithms:**
  - `createImage(url)`: Loads an image asynchronously with `crossOrigin = "anonymous"`.
  - `getRadianAngle(degree)`: Converts angle to radians.
  - `rotateSize(width, height, rotation)`: Computes transformed bounding box dimensions:
    $$\text{width} = |\cos(\theta) \cdot w| + |\sin(\theta) \cdot h|$$
    $$\text{height} = |\sin(\theta) \cdot w| + |\cos(\theta) \cdot h|$$
  - `getCroppedImg(imageSrc, pixelCrop, rotation, flip)`:
    - Centers and rotates the image on an intermediate bounding canvas.
    - Extracts cropped pixel data using `ctx.getImageData()`.
    - Renders final cropped pixels onto a target canvas matching `pixelCrop.width` and `height`.
    - Exports image as a standard `image/jpeg` Blob.
- **Legacy Delta:**
  - 100% byte-for-byte identical with legacy `tuition-frontend/utils/cropImage.ts`.

---

## 3. Cross-Cutting Analysis & Contract Reconciliations

### 3.1 Authentication & RBAC Boundary Evaluation
- The user profile pages (`dashboard/profile/page.tsx` and `user/[id]/page.tsx`) and forms (`UserForm.tsx`) consistently enforce role boundaries:
  - Students cannot edit academic details or alter system permissions.
  - Moderators can edit students but are prevented from modifying teachers (`readOnly = isModerator && isEditingTeacher`).
  - Password resets are partitioned into self-service (requiring current password verification) and administrative override (restricted to teachers and moderators).

### 3.2 Dynamic Customization vs Legacy Static Content
- In legacy `tuition-frontend`, `app/info/page.tsx` relied on hardcoded static JSON exported from `site-config.ts`.
- In `lms-client`, the page is fully wired into `CustomizationContext` via `useCustomization()` and `getPagesConfig()`. Changes published in MongoDB immediately reflect on the public educator portfolio without code redeployment.

---

## 4. Key Findings & Critical Risks

1. **Deprecated Next.js Head Tag in App Router (`dashboard/page.tsx:16, 81-93`):**
   - `<Head>` from `next/head` is imported and rendered inside a client component in the `app` directory. In Next.js 14, this does not populate document `<head>` and throws runtime warnings.
2. **Hardcoded WhatsApp Contact Number (`dashboard/page.tsx:239`):**
   - The floating WhatsApp action button points directly to `https://wa.me/+94706844133` instead of reading from `siteConfig.footer.social.whatsapp` or tenant branding configuration.
3. **Empty Profile Stub in Legacy Resolved in Migrated Client:**
   - Legacy `app/dashboard/profile/page.tsx` was an orphaned 0-byte file. `lms-client` provides a clean student dashboard profile and enrolled course list.
4. **Visual CMS Route 404:**
   - Both `dashboard/page.tsx` and `info/page.tsx` wrap headers and labels in `<EditableContent>` referencing configuration paths. In-line edits continue to fail with 404 because `POST /api/admin/content` is absent in `lms-client`.
