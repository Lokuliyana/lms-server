# Phase 17: Frontend Custom Hooks, Cloud Connectors & Debouncing

**Phase**: 17 of 34  
**Layer**: Frontend (`lms-client`)  
**Scope**: 8 Files (Authentication Facade Hook, Branding Barrel Hook, RBAC Authorization Hook, Debounce Utility Hook, Toast Pub-Sub State Machine, Static Site Configuration Engine, Cloudinary Direct Uploader, Global Network Loading Event Bus)  
**Status**: Completed  
**Timestamp**: 2026-10-01  

---

## 1. Executive Summary & Architecture Overview

Phase 17 audits the foundational client-side hook primitives, cloud integration adapters, and dynamic site/page configuration abstractions in `lms-client`. These modules bridge presentation components with global context providers, external media services (Cloudinary), and HTTP loading lifecycles:

1. **Facade & Convenience Hooks (`useAuth.ts`, `useBranding.ts`)**:
   - `useAuth.ts`: Clean facade wrapping `useAuthContext()` from `@/context/AuthContext`. Centralizes identity state and eliminates the legacy per-component state divergence.
   - `useBranding.ts`: Re-export barrel consolidating dynamic branding types (`BrandingConfig`), default tokens (`DEFAULT_BRANDING`), and context consumer.
2. **Conflicting RBAC Evaluation (`usePermission.ts` vs `src/lib/permissions.ts`)**:
   - `src/hooks/usePermission.ts` introduces an isolated, divergent implementation of permission checks that checks raw `user.permissions` for exact matches or `'*'`, omitting both administrative role bypass (`role === 'admin'`) and category wildcard resolution (`classes.*`, `grades.*`).
3. **Reactive UI State Utilities (`useDebounce.ts`, `use-toast.ts`)**:
   - `useDebounce.ts`: Generic timeout debounce hook for search inputs and rapid mutations.
   - `use-toast.ts`: Centralized pub-sub reducer state machine for toast alerts (shadcn/ui compatible) with custom dismiss queues and timeout handling.
4. **Cloud Connectors & Site Configuration (`site-config.ts`, `cloudinary.ts`, `globalLoading.ts`)**:
   - `site-config.ts`: Comprehensive runtime navigation tree and page section metadata engine (386 lines) merging dynamic CMS database settings with static JSON fallbacks (`content-v2.json`).
   - `cloudinary.ts`: Direct client-to-cloud unsigned asset uploader using browser `fetch` and `FormData`.
   - `globalLoading.ts`: Module-level subscriber event bus tracking active concurrent Axios HTTP requests for global top-bar spinners.

---

## 2. Phase 17 Target Files Matrix

| # | Target File | Path | Status | Summary / Core Role |
|---|---|---|---|---|
| 1 | `useAuth.ts` | `lms-client/src/hooks/useAuth.ts` | Audited | Convenience facade hook delegating directly to `useAuthContext()` |
| 2 | `useBranding.ts` | `lms-client/src/hooks/useBranding.ts` | Audited | Re-export barrel for `useBranding`, `BrandingConfig`, and `DEFAULT_BRANDING` |
| 3 | `usePermission.ts` | `lms-client/src/hooks/usePermission.ts` | Audited | Alternative RBAC check hook; diverges from `src/lib/permissions.ts` |
| 4 | `useDebounce.ts` | `lms-client/src/hooks/useDebounce.ts` | Audited | Generic timeout debounce hook for asynchronous search and filtering |
| 5 | `use-toast.ts` | `lms-client/src/hooks/use-toast.ts` | Audited | Pub-sub reducer and dispatch state machine managing toast notification lifecycle |
| 6 | `site-config.ts` | `lms-client/src/lib/site-config.ts` | Audited | Master site and pages configuration generator; navigation and icon mappings |
| 7 | `cloudinary.ts` | `lms-client/src/lib/cloudinary.ts` | Audited | Unsigned browser multipart uploader to Cloudinary REST API |
| 8 | `globalLoading.ts` | `lms-client/src/lib/globalLoading.ts` | Audited | Reactive active-request counter and listener event bus for network loading |

---

## 3. Deep Dive Technical Deconstructions

### 3.1 `src/hooks/useAuth.ts`

* **Purpose & Architecture**:
  Provides a clean, intuitive hook export (`useAuth()`) that delegates directly to `useAuthContext()`. Ensures all component consumers share the single source of truth managed within the root `AuthProvider`.
* **Implementation**:
  ```typescript
  import { useAuthContext } from "@/context/AuthContext";

  export function useAuth() {
    return useAuthContext();
  }
  ```
* **Return Shape**:
  Inherits full `AuthContextProps`:
  `{ user, token, loading, isTeacher, isStudent, isGuest, login, logout, refreshUser, hasPermission }`.
* **Legacy Reconciliation**:
  In legacy `tuition-frontend/hooks/useAuth.ts` (110 lines), `useAuth` was an un-synchronized local `useState` hook that managed its own state via `localStorage`, creating severe desynchronization bugs across sibling components. The refactoring to forward to `useAuthContext()` resolves this systemic issue.

---

### 3.2 `src/hooks/useBranding.ts`

* **Purpose & Architecture**:
  Re-export barrel standardizing imports for the branding subsystem.
* **Implementation**:
  ```typescript
  export { useBranding, type BrandingConfig, DEFAULT_BRANDING } from '@/context/BrandingContext';
  ```
* **Analysis**:
  Enables developers to import `{ useBranding } from '@/hooks/useBranding'` or from context interchangeably without circular dependencies.

---

### 3.3 `src/hooks/usePermission.ts`

* **Purpose & Architecture**:
  Evaluates whether the currently authenticated user possesses a required permission string.
* **Implementation**:
  ```typescript
  import { useAuth } from "@/hooks/useAuth";

  export function usePermission(requiredPermission: string) {
    const { user, loading } = useAuth();

    if (loading || !user) return false;

    const permissions = user.permissions || [];
    
    if (permissions.includes("*")) return true; // super admin wildcard
    
    return permissions.includes(requiredPermission);
  }
  ```
* **Critical Architectural Bug & Divergence**:
  The codebase possesses **two conflicting implementations** of `usePermission`:
  1. `src/lib/permissions.ts`: Delegates to `AuthContext.hasPermission(key)`. Evaluates:
     - `user?.role === 'admin'` -> `true` (Role bypass)
     - `permissions.includes('*')` -> `true` (Super admin wildcard)
     - `permissions.includes(`${category}.*`)` -> `true` (Namespace wildcard, e.g. `classes.*`)
     - Exact string match
  2. `src/hooks/usePermission.ts`: Directly inspects `user.permissions`:
     - Does **NOT** check `user.role === 'admin'`. If an admin user was seeded without `'*'`, this hook returns `false`.
     - Does **NOT** support category wildcards (`classes.*`, `grades.*`). A user with `classes.*` will be denied access to `classes.create` by this hook.
  - **Verdict**: Components importing from `@/hooks/usePermission` will encounter false-negative authorization denials.

---

### 3.4 `src/hooks/useDebounce.ts`

* **Purpose & Architecture**:
  Debounces rapidly changing values (such as search keystrokes in class catalog or user lists) by delaying updates until a specified millisecond duration has elapsed without new changes.
* **Implementation**:
  ```typescript
  import { useEffect, useState } from "react";

  export function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);

    return debounced;
  }
  ```
* **Parameters & Generics**:
  - `value: T`: Value to debounce (string, number, object).
  - `delay: number`: Timeout in milliseconds.
* **Edge Cases**:
  - If `delay` is 0, execution is pushed to the end of the current JavaScript event loop.
  - Properly clears the active timer on unmount or on input change via the cleanup return.

---

### 3.5 `src/hooks/use-toast.ts`

* **Purpose & Architecture**:
  Stand-alone in-memory state machine implementing the shadcn/ui toast notification pipeline. Decouples toast creation from React component render lifecycles via an external subscriber array (`listeners`).
* **Data Structures & Constants**:
  - `TOAST_LIMIT = 1`: Enforces single-toast display policy.
  - `TOAST_REMOVE_DELAY = 1000000`: Millisecond delay before queued removal (~16.6 minutes).
  - Actions: `ADD_TOAST`, `UPDATE_TOAST`, `DISMISS_TOAST`, `REMOVE_TOAST`.
* **Key Functions**:
  - `toast({ ...props })`: Callable from anywhere (including non-React code, e.g. Axios interceptors). Generates sequential ID (`genId()`), sets `open: true`, and dispatches `ADD_TOAST`. Returns `{ id, dismiss, update }`.
  - `useToast()`: React hook subscribing component state to external `memoryState`. Unsubscribes on unmount.
  - `addToRemoveQueue(toastId)`: Adds timer to `toastTimeouts` Map to dispatch `REMOVE_TOAST` after `TOAST_REMOVE_DELAY`.
* **Deficiencies & Memory Leak Risk**:
  `TOAST_REMOVE_DELAY` is hardcoded to `1,000,000` ms (16.6 minutes) instead of the industry standard `5,000` ms (5s). While `TOAST_LIMIT = 1` caps the visible slice in the UI, dismissed toast objects and their associated closures remain in `memoryState.toasts` for over 16 minutes.

---

### 3.6 `src/lib/site-config.ts`

* **Purpose & Architecture**:
  Master static and dynamic configuration factory for the entire frontend application (386 lines). Resolves icons (Lucide & React Icons), builds dynamic navigation bars with role-based filtering, and provides deep fallback defaults for pages (`about`, `dashboard`, `classes`, `quizzes`, `performance`, `auth`).
* **Exported Types & Structures**:
  - `NavItem`:
    ```typescript
    export type NavItem = {
      id: string;
      label: string;
      icon: any;
      href?: string;
      visibleOn: ("mobile" | "desktop")[];
      children?: NavItem[];
      requireRole?: string | string[];
      configKey?: string;
    };
    ```
* **Navigation Factory (`getSiteConfig(settings)`)**:
  - Constructs `nav.items(user)`:
    - `dashboard`: `/dashboard` (All users)
    - `admin`: `/admin/dashboard` (Requires `['teacher', 'admin']`)
    - `quick-action`: Dropdown for teachers/admins containing:
      - `qa-create-class`: `/admin/classes/add`
      - `qa-create-recording`: `/admin/recording/add`
      - `qa-create-quiz`: `/admin/quizez/add`
      - `qa-enroll-students`: `/admin/classes/applications`
      - `qa-download-assignments`: `/admin/classes/assignment`
    - `classes`: `/classes` (All users)
    - `quizzes`: `/quizzes` (All users)
    - `performance`: `/quizzes/performance` (Requires `'student'`)
    - `about`: `/info`
    - `user` / `useradmin`: Dynamic profile routes depending on student vs teacher/admin.
    - `grades`: Dynamically mapped from `settings.grades` array (`/classes?grade=${g._id}`).
    - `subjects`: Dynamically mapped from `settings.subjects` array (`/classes?subject=${s._id}`).
  - Constructs `nav.otherItems(user)`: Desktop secondary profile items.
  - Constructs `footer`: Social icons (`FaFacebook`, `FaYoutube`, `MessageCircle`).
* **Pages Configuration Factory (`getPagesConfig(settings)`)**:
  - Provides hierarchical configuration and defaults for `about`, `dashboard`, `classes`, `quizzes`, `performance`, and `auth` pages, deep-merged with `content-v2.json`.

---

### 3.7 `src/lib/cloudinary.ts`

* **Purpose & Architecture**:
  Browser-side direct media uploader leveraging Cloudinary's unsigned upload API (`/v1_1/:cloud_name/auto/upload`). Used for uploading assignment PDFs, class cover images, and student verification receipts without loading binary files through the Node.js API server.
* **Implementation Walkthrough**:
  1. Validates environment variables: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` and `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`. Throws `Error` if missing.
  2. Builds `FormData`:
     - Appends file binary.
     - Appends `upload_preset`.
     - Appends tags: `"class,education"`.
     - Appends `folder` if provided or defaults to `NEXT_PUBLIC_CLOUDINARY_FOLDER`.
  3. Issues raw `fetch(UPLOAD_URL, { method: "POST", body: formData })`.
  4. Parses JSON response. Validates `data.secure_url`. Throws if missing or starts with data URI scheme. Returns HTTPS URL.

---

### 3.8 `src/lib/globalLoading.ts`

* **Purpose & Architecture**:
  Minimalist reactive event bus tracking in-flight network requests. Synchronized directly with Axios request/response interceptors in `src/lib/axios.ts` to power topbar progress spinners.
* **Mechanism & Logic**:
  - `activeCount`: Integer counter of currently active HTTP requests.
  - `listeners`: Array of callback functions `(count: number) => void`.
  - `startGlobalLoading()`: Increments `activeCount`, notifies subscribers.
  - `stopGlobalLoading()`: Decrements `activeCount` (`Math.max(0, activeCount - 1)`), notifies subscribers.
  - `subscribe(listener)`: Registers listener, immediately executes callback with initial `activeCount`, and returns cleanup un-subscriber.

---

## 4. Legacy Delta & Gaps

| Feature / Pattern | Legacy (`tuition-frontend`) | Target (`lms-client`) | Gap / Architectural Assessment |
|---|---|---|---|
| **`useAuth` Hook** | Unsynced local `useState` with direct `localStorage` writes | Clean facade delegating to root `useAuthContext()` | Major bug fix. Eliminates out-of-sync multi-component authentication states. |
| **`useBranding` Hook** | Did not exist (hardcoded static config) | Dynamic re-export barrel from `BrandingContext` | New feature for white-label multi-tenancy. |
| **`usePermission` Hook** | Non-existent; raw `user.role === 'admin'` checks | Two conflicting hooks (`hooks/` vs `lib/`) | Significant regression/drift. `hooks/usePermission` omits role bypass and wildcard matching. |
| **Toast Timeout (`TOAST_REMOVE_DELAY`)** | `1000000` ms (~16.6 minutes) | `1000000` ms (~16.6 minutes) | Carried over legacy copy-paste defect without adjustment to normal 5s delay. |
| **Direct Cloudinary Upload** | Identical 37-line implementation | Identical 37-line implementation | 100% parity; unsigned client upload. |
| **Global Loading Bus** | Identical 29-line event bus | Identical 29-line event bus | 100% parity; integrates with Axios interceptors. |
| **Site Config Navigation** | Static menu items | Dynamic items populated with `grades` and `subjects` arrays | Enhanced navigation with live database categories. |

---

## 5. Critical Findings & Technical Debt Summary

1. **Conflicting Permission Evaluation Hooks (High Priority)**:
   - `src/hooks/usePermission.ts` and `src/lib/permissions.ts` export different logic under the same name:
     - `src/lib/permissions.ts` correctly handles `admin` role bypass, super admin `*`, and category wildcards (`classes.*`).
     - `src/hooks/usePermission.ts` ignores `admin` role and ignores category wildcards.
   - **Recommendation**: Replace the implementation in `src/hooks/usePermission.ts` with a direct re-export of `src/lib/permissions.ts` to prevent false authorization rejections.
2. **Abnormal Toast Retention Delay (Medium Priority)**:
   - `TOAST_REMOVE_DELAY = 1000000` retains dismissed toast objects in memory for over 16 minutes. Should be standardized to `5000` ms.
3. **Missing Role Protection on Grade/Subject Nav Links (Low Priority)**:
   - In `site-config.ts`, dynamic grade and subject items are visible on desktop navigation, but are rendered without checking if classes exist within those categories.

---

## 6. Verification & Sign-Off Checklist
- [x] All 8 Phase 17 files inspected down to hook signatures, state reducers, and network payloads.
- [x] Conflicting RBAC implementations between `src/hooks/` and `src/lib/` pinpointed and documented.
- [x] Cloudinary unsigned upload configuration and environment variables verified.
- [x] Master site configuration and dynamic navigation builder reconciled against legacy JSON schemas.
