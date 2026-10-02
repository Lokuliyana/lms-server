# Phase 34 Dossier: Admin Video Editing, User Administration & RBAC Management (Frontend)

> **Phase Status:** 🟢 Complete  
> **Target Scope:** 6 Files in `lms-client` (Final Frontend Audit Phase)  
> **Subsystem:** Instructional Video Operations, Administrative User Directory & Dynamic Permission Matrix  
> **Document Location:** `docs/audit/phase-34-fe-admin-recordings-users-rbac.md`  

---

## 1. Executive Architecture & Subsystem Summary

Phase 34 delivers the technical audit of the final operational tier of `lms-client`:
1. **Administrative Instructional Recording Operations:**
   - Multi-source recording form (`AddRecordingForm`) orchestrating class/batch selection, schedule date tagging, dual-source video parsing (Google Drive vs YouTube), automated title synthesis, and payload sanitization.
   - Add/Edit controller pages (`admin/recording/add/page.tsx` and `admin/recording/edit/[id]/page.tsx`) providing class schedule aggregation, batch name lookups, and Next.js 15 async promise-based route resolution (`use(params)`).
2. **Platform User Administration:**
   - Comprehensive user directory (`admin/user/page.tsx`) with real-time multi-field search (name, email, phone), role filtering (student, teacher, moderator), view toggling (tabular data table vs responsive card grid), and integrated user create/update modal.
3. **Dynamic Role-Based Access Control (RBAC) Matrix:**
   - Visual permission management system (`admin/permissions/page.tsx` and `PermissionMatrix.tsx`) rendering a 2D matrix of system modules against granular CRUD actions (`create`, `read`, `update`, `delete`).
   - Supports optimistic checkbox state toggling with automatic rollback on network failure.

---

## 2. Exhaustive Per-File Technical Audit

### 2.1 `src/components/ui/recordings/add-recording.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/recordings/add-recording.tsx`
- **Role & Layer:** Administrative Form Component (Presentation & Form State)
- **Line Count:** 420 lines

#### A. Imports & Dependencies
- React: `useState`, `useMemo`, `useEffect` from `"react"`
- UI Primitives: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Label`, `Input`, `Button`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `"@/components/dev/*"`
- Icons: `HiAcademicCap`, `HiVideoCamera`, `HiCheckCircle`, `HiLink`, `HiPencil` from `"react-icons/hi2"`
- Utilities: `cn` from `"@/lib/utils"`

#### B. Component Interfaces
```typescript
interface ClassData {
  id: string;
  name: string;
}

interface BatchData {
  id: string;
  time: string;
  name?: string;
}

interface BatchesMap {
  [classId: string]: BatchData[];
}

export interface AddRecordingFormData {
  selectedClassId: string;
  selectedBatchId: string;
  selectedDate: string;
  title: string;
  driveUrl: string;
  recordingType?: "drive" | "youtube";
}

interface AddRecordingFormProps {
  classes: ClassData[];
  batches: BatchesMap;
  onSubmit: (data: AddRecordingFormData) => Promise<void> | void;
  isSubmitting?: boolean;
  submitMessage?: string | null;
  initialValues?: Partial<AddRecordingFormData>;
  submitLabel?: string;
}
```

#### C. Internal State Management & Effects
- States:
  - `selectedClass`: `string`
  - `selectedBatch`: `string`
  - `selectedDate`: `string`
  - `title`: `string`
  - `driveUrl`: `string`
  - `recordingType`: `"drive" | "youtube"` (auto-detected from `initialValues?.driveUrl` or defaults to `"drive"`)
- Effect 1 (Hydration Synchronization): watches `initialValues` to populate form fields upon async data loading in edit mode.
- Memoized Derived State: `availableBatches` resolves `selectedClass ? batches[selectedClass] || [] : []`.
- Effect 2 (Auto Title Synthesis): if `title` is empty and `selectedBatch`, `selectedDate`, and `selectedClass` are populated, automatically synthesizes title as `"${batchName} - ${selectedDate}"`.
- `handleSubmit(e)`: prevents default, constructs `AddRecordingFormData`, trims `driveUrl`, and dispatches `await onSubmit(formData)`.
- `handleClear()`: resets form to empty strings or resets back to `initialValues`.

#### D. Form Presentation & Visual Hierarchy
- Section 1 — Class Details:
  - Class dropdown (`SelectTrigger`) updating `selectedClass` and resetting `selectedBatch`.
  - Batch / Time slot dropdown disabled until a class is selected.
  - Recording Date input (`type="date"`).
- Section 2 — Recording Source Selection:
  - Interactive split toggle cards (Google Drive with indigo branding vs YouTube with red branding).
- Section 3 — Recording Info:
  - Title text input.
- Section 4 — Link Section:
  - Dynamic URL input (`type="url"`) with source-aware placeholder and icon coloring.
  - Guidance caption explaining Google Drive sharing vs YouTube unlisted links.
  - Submission status notification alert (`submitMessage`).
- Bottom Actions: "Clear" and "Save Recording" buttons.

---

### 2.2 `src/app/admin/recording/add/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/admin/recording/add/page.tsx`
- **Role & Layer:** Admin Route Controller (Client Component)
- **Line Count:** 115 lines

#### A. Imports & Dependencies
- Directive: `"use client";`
- React: `useState`, `useEffect`
- Components: `Title` from `"@/components/ui/title"`, `AddRecordingForm` from `"@/components/ui/recordings/add-recording"`
- Services: `getClasses` from `"@/services/classService"`, `createRecording` from `"@/services/recordingService"`

#### B. Component Logic & Data Flow
- States:
  - `isSubmitting`: `boolean` (defaults to `false`)
  - `submitMessage`: `string | null`
  - `classes`: `UIClass[]` (`{ id, name }`)
  - `batches`: `Record<string, UIBatch[]>` (`{ id, time, name }`)
- Class & Batch Loading Effect:
  - Calls `getClasses()`.
  - Maps classes to `{ id: c._id, name: c.title }`.
  - Formats batch items: resolves `batchName = b.batch_name || "${capitalize(b.day)} ${b.start}"` and `time = "${capitalize(b.day)} ${b.start} - ${b.end}"`.
- `handleFormSubmit(data)`:
  - Validates non-empty fields (`selectedClassId`, `selectedBatchId`, `selectedDate`, `title`, `driveUrl`).
  - Resolves batch name from `batches` map.
  - Dispatches `createRecording({ class_id, session_date, batch_name, title, driveUrl })`.
  - Sets success toast message: `✅ Successfully added "${response.recording.title}"`.
- Render: `<Title>` followed by `<AddRecordingForm>`.

---

### 2.3 `src/app/admin/recording/edit/[id]/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/admin/recording/edit/[id]/page.tsx`
- **Role & Layer:** Admin Route Controller for Recording Updates (Client Component)
- **Line Count:** 128 lines

#### A. Imports & Dependencies
- Directive: `"use client";`
- React: `useState`, `useEffect`, `useMemo`, `use` from `"react"`
- Components: `Title`, `AddRecordingForm`
- Services: `getClasses` from `"@/services/classService"`, `getRecordingById`, `updateRecording`, `Recording` from `"@/services/recordingService"`

#### B. Next.js 15 Async Route Resolution
```typescript
type EditRecordingPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditRecordingPage({ params }: EditRecordingPageProps) {
  const { id: recordingId } = use(params);
  // ...
}
```
- Fully compliant with Next.js 15 asynchronous routing params convention via React's `use()` hook.

#### C. Data Hydration & Reconstruction
- `useEffect` loads class data and target recording via `Promise.all([getClasses(), getRecordingById(recordingId)])`.
- `initialValues` `useMemo`:
  - Matches `recording.batch_name` against class batch list.
  - Slices ISO string to format date as `YYYY-MM-DD`.
  - Detects YouTube links from `recording.driveUrl`, `recording.driveFileId` (11 chars), or `recording.video_url` (11 chars).
  - Reconstructs standard clickable link URLs for form prefill.
- `handleFormSubmit(data)`:
  - Formats payload with updated `session_date`, `batch_name`, `title`, and `driveUrl`.
  - Dispatches `updateRecording(recordingId, updates)`.
  - Displays success message: `✅ Successfully updated "${response.recording.title}"`.
- Loading State: displays animated pulse skeleton blocks to avoid UI layout shift.

---

### 2.4 `src/app/admin/user/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/admin/user/page.tsx`
- **Role & Layer:** Admin User Management Dashboard (Client Component)
- **Line Count:** 448 lines

#### A. Imports & Dependencies
- Directive: `"use client";`
- React: `useEffect`, `useMemo`, `useState`
- Animation: `motion`, `AnimatePresence` from `"framer-motion"`
- Auth & Services: `useAuth` from `"@/hooks/useAuth"`, `authService` from `"@/services/authService"`
- Child Form: `UserForm` from `"@/components/ui/user/UserForm"`
- UI Components: `Button`, `Dialog`, `Select`, `Input`, `Label`, `Textarea`, `Card`, `Badge`, `Avatar`, `Table`
- Icons: `Users`, `Search`, `Filter`, `Mail`, `Phone`, `School`, `LogOut`, `UserCheck`, `ShieldAlert`, `GraduationCap`, `UserPlus`, `LayoutGrid`, `List`, `PencilIcon`, `Settings2`
- Accessibility: `* as VisuallyHidden` from `"@radix-ui/react-visually-hidden"`

#### B. State Architecture & Filter Engine
- States:
  - `users`: `any[]`
  - `roleFilter`: `"all" | "student" | "moderator" | "teacher"`
  - `searchQuery`: `string`
  - `selectedUser`: `any | null`
  - `viewMode`: `"list" | "grid"`
  - `formOpen`: `boolean`
  - `isSubmitting`: `boolean`
- `fetchUsers`: invokes `authService.getAllUsers()` and sets user records.
- `filteredUsers` Memo:
  - Evaluates role match (`roleFilter === "all" || u.role === roleFilter`).
  - Evaluates search match across `full_name`, `email`, and `phone`.
- `handleSubmit(data)`:
  - Update Mode (`selectedUser` exists): dispatches `authService.editUser(selectedUser._id, data)`.
  - Create Mode: dispatches `authService.createUser(data)`.
  - Refetches users and triggers success toast.

#### C. Presentation & View Modes
- Header: User count title, "Add User" button (visible only to teachers/admins via `isTeacher`), and "Logout" button with `localStorage` token evacuation.
- Search & Control Bar: Search input with magnifying glass, role filter select dropdown, and List/Grid view toggle buttons.
- View Mode 1 — Table (List):
  - Five columns: User Details (Avatar, Name, ID slice), Contact Info (Email, Phone), Institution/Grade, Role Badge, Edit Action button.
- View Mode 2 — Cards (Grid):
  - Responsive 3-column card grid rendering contact details, institution, and role badge.
- Empty State: Animated illustration, "No results found" heading, and "Clear all filters" button.
- Radix Dialog: Host container for `UserForm`, featuring accessible `VisuallyHidden.Root` title.

---

### 2.5 `src/app/admin/permissions/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/admin/permissions/page.tsx`
- **Role & Layer:** Admin Role Permissions Page (Client Component)
- **Line Count:** 74 lines

#### A. Imports & Dependencies
- Directive: `'use client';`
- React: `useEffect`, `useState`
- Components: `PermissionMatrix` from `'@/components/PermissionMatrix'`

#### B. Component Logic & State
- States:
  - `roles`: `Role[]` (`{ _id, name }`)
  - `selectedRole`: `string`
  - `loading`: `boolean`
- Data Loading:
  - `fetchRoles`: executes `fetch('http://localhost:5000/api/permissions/roles')`.
  - On success, sets `roles` and defaults `selectedRole` to the first role's `_id`.
- Loading State: Skeleton pulse stack.
- Render:
  - Role selector dropdown (`<select id="roleSelect">`).
  - Renders `<PermissionMatrix roleId={selectedRole} />` for the active role.

#### C. Critical Defect Assessment
> [!CAUTION]
> **Hardcoded Localhost API URL:**
> Line 19 contains `fetch('http://localhost:5000/api/permissions/roles')`. Hardcoding `localhost:5000` bypasses environment variables (`NEXT_PUBLIC_API_URL`), breaks reverse proxies, and will fail unconditionally in all non-local deployment environments.

---

### 2.6 `src/components/PermissionMatrix.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/PermissionMatrix.tsx`
- **Role & Layer:** Interactive Permission Grid Component (Client Presentation & Mutation)
- **Line Count:** 122 lines

#### A. Imports & Dependencies
- Directive: `'use client';`
- React: `useEffect`, `useState`, `useCallback`

#### B. Interfaces & Action Constants
```typescript
type Permission = {
  _id: string;
  key: string;
  module: string;
  action: string;
  label: string;
};

const ACTIONS = ['create', 'read', 'update', 'delete'];
```

#### C. Data Fetching & Optimistic Updates
- States:
  - `permissions`: `Permission[]` (all system permissions)
  - `rolePermissions`: `string[]` (permission IDs currently assigned to `roleId`)
  - `loading`: `boolean`
- `fetchData`:
  - Dispatches `fetch('http://localhost:5000/api/permissions')` to load permissions dictionary.
  - Dispatches `fetch('http://localhost:5000/api/permissions/roles/${roleId}')` to load role assignments.
- `handleToggle(permissionId, hasPermission)`:
  - Optimistic Update: immediately adds or filters out `permissionId` from `rolePermissions`.
  - Network Call: dispatches `POST` (grant) or `DELETE` (revoke) to `http://localhost:5000/api/permissions/roles/${roleId}/permissions/${permissionId}`.
  - Error Recovery: on error or `!data.success`, displays alert and calls `fetchData()` to roll back state.

#### D. Matrix Render
- Derives unique `modules` array from `permissions`.
- Renders HTML table:
  - Rows: System modules (e.g., classes, quizzes, users).
  - Columns: `create`, `read`, `update`, `delete`.
  - Cells: Checkbox if module supports that action, or `-` if no such permission exists.

#### E. Critical Defect Assessment
> [!CAUTION]
> **Hardcoded Localhost & Missing Credentials:**
> Lines 16, 22, and 47 all invoke raw `fetch('http://localhost:5000/api/permissions/...')`. Furthermore, `fetch` does not specify `credentials: 'include'`, meaning session cookies and JWT bearer tokens are omitted, resulting in unauthorized requests on secured backend environments.

---

## 3. Legacy Delta & Gaps (`tuition-frontend` vs `lms-client`)

| Feature / Dimension | Legacy (`tuition-frontend`) | Target (`lms-client`) | Architectural Impact / Status |
| :--- | :--- | :--- | :--- |
| **User Creation Endpoint** | Hacked: `authService.createModerator(data)` used for all roles | Standardized: `authService.createUser(data)` for general creation and `authService.editUser` for edits | Clean separation of concerns and eliminates role-confusion workarounds. |
| **Next.js 15 Async Params** | Synchronous: `params: { id: string }` | Modern: `params: Promise<{ id: string }>` resolved via `use(params)` in `admin/recording/edit/[id]` | Fully compliant with Next.js 15 breaking changes; eliminates router warnings. |
| **Permission Matrix UI** | ❌ Completely absent | 🟢 Added (`admin/permissions/page.tsx` & `PermissionMatrix.tsx`) | Introduces visual role-permission configuration to manage granular user capabilities. |
| **Hardcoded Localhost APIs** | Not present | Hardcoded `http://localhost:5000` in permissions files | Critical security and deployment bug requiring migration to centralized Axios API client. |
| **Recording Add/Edit UI** | Identical UI layout | Preserved with enhanced skeleton loaders | Maintains seamless instructional staff recording workflow. |

---

## 4. Verification, Defects & Security Checklist

- [x] **Next.js 15 Async Params Compliance:** `admin/recording/edit/[id]/page.tsx` unwraps `params` via `use(params)` correctly.
- [x] **YouTube/Drive Auto-Detection:** Form accurately detects YouTube URLs and video IDs (11 characters) versus Google Drive links.
- [x] **Accessible Dialog Standards:** `admin/user/page.tsx` incorporates `@radix-ui/react-visually-hidden` around dialog titles to meet WCAG standards.
- [!] **Critical Environment Bug (`admin/permissions/page.tsx:19`):** Hardcoded `http://localhost:5000/api/permissions/roles` breaks production deployments.
- [!] **Critical API Bug (`PermissionMatrix.tsx:16, 22, 47`):** Hardcoded `http://localhost:5000` and missing `credentials: 'include'` omits authentication headers.
- [!] **Unfiltered Raw Users Query:** `authService.getAllUsers()` fetches entire user database into client memory without server-side pagination, risking performance degradation as user counts scale.
