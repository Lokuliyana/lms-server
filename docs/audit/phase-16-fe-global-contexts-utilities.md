# Phase 16: Frontend Global Contexts (Branding, Customization) & Core Utilities

**Phase**: 16 of 34  
**Layer**: Frontend (`lms-client`)  
**Scope**: 7 Files (Dynamic Branding Context, Customization Context, In-line CMS Edit Mode Context, Fetcher Stub, Formatters Utility, Permissions Hook, Utility Helpers)  
**Status**: Completed  
**Timestamp**: 2026-10-01  

---

## 1. Executive Summary & Architecture Overview

Phase 16 audits the global frontend styling and configuration providers along with the fundamental utility layer in `lms-client`. These modules govern dynamic white-labeling, runtime CMS customization, in-line editing controls, and low-level data transformation:

1. **Branding Context (`BrandingContext.tsx`)**: Bridges backend branding configuration (`/api/system/config`) with the React DOM tree. It injects CSS root custom properties (`--primary-color`, `--primary`, `--accent-color`, `--accent`) directly into `document.documentElement.style`, dynamically updates the document `<title>`, and provides asynchronous mutation capabilities (`updateBranding`, `refreshBranding`) supporting multipart/form-data uploads.
2. **Customization Context (`CustomizationContext.tsx`)**: Orchestrates runtime page layouts, navigation elements, subjects, and grade taxonomy fetched from backend customization APIs (`/api/customization/settings`, `/api/customization/subjects`, `/api/customization/grades`), falling back to static config defaults (`site-config.ts`).
3. **In-Line CMS Edit Mode Context (`EditModeContext.tsx`)**: Manages the administrative editing state flag across editable landing page widgets and cards.
4. **Core Utilities Layer (`fetcher.ts`, `formatters.ts`, `permissions.ts`, `utils.ts`)**:
   - `fetcher.ts`: 0-byte orphaned artifact ported from legacy codebase.
   - `formatters.ts`: Sanitization and humanization helpers avoiding raw MongoDB ObjectId leakage in UI components (Grade / Subject labels).
   - `permissions.ts`: Declarative hook abstraction over RBAC entitlement evaluation.
   - `utils.ts`: Tailwind class concatenation (`cn`) and HTML entity decoder (`decodeHtml`).

---

## 2. Phase 16 Target Files Matrix

| # | Target File | Path | Status | Summary / Core Role |
|---|---|---|---|---|
| 1 | `BrandingContext.tsx` | `lms-client/src/context/BrandingContext.tsx` | Audited | Dynamic white-label context, CSS variable injector (`:root`), title sync, multipart update mutations |
| 2 | `CustomizationContext.tsx` | `lms-client/src/context/CustomizationContext.tsx` | Audited | Page layout, subjects, and grades taxonomy provider with static fallback defaults |
| 3 | `EditModeContext.tsx` | `lms-client/src/context/EditModeContext.tsx` | Audited | In-line CMS visual edit mode toggle state and provider |
| 4 | `fetcher.ts` | `lms-client/src/lib/fetcher.ts` | Audited | 0-byte unused legacy remnant file |
| 5 | `formatters.ts` | `lms-client/src/lib/formatters.ts` | Audited | ObjectId detection, grade label normalization, and subject string humanizer |
| 6 | `permissions.ts` | `lms-client/src/lib/permissions.ts` | Audited | Declarative `usePermission(key)` hook wrapping `AuthContext` RBAC logic |
| 7 | `utils.ts` | `lms-client/src/lib/utils.ts` | Audited | Tailwind class combiner (`cn`) and HTML entity decoder (`decodeHtml`) |

---

## 3. Deep Dive Technical Deconstructions

### 3.1 `src/context/BrandingContext.tsx`

* **Purpose & Architecture**:
  Client-side provider maintaining institution branding, contact details, image asset URLs, and theme color tokens. On mount, queries backend system configuration and mutates the browser DOM root style declaration to apply custom branding themes in real-time.
* **Interface & Data Structure**:
  ```typescript
  export interface BrandingConfig {
    platformName: string;
    instructorName: string;
    slogan: string;
    contactPhone: string;
    contactEmail: string;
    supportWhatsApp: string;
    assets: {
      logoUrl: string;
      faviconUrl: string;
      heroBannerUrl: string;
      loginIllustrationUrl: string;
      defaultAvatarUrl: string;
    };
    themeTokens: {
      primaryColor: string;
      accentColor: string;
    };
  }

  interface BrandingContextProps {
    branding: BrandingConfig;
    loading: boolean;
    updateBranding: (data: Partial<BrandingConfig>, files?: Record<string, File>) => Promise<void>;
    refreshBranding: () => Promise<void>;
  }
  ```
* **State & Hooks**:
  - `branding`: Defaults to hardcoded `DEFAULT_BRANDING` (platformName: `'NexvoLearn'`, instructorName: `'Danidu'`, primaryColor: `'#4f46e5'`, accentColor: `'#06b6d4'`).
  - `loading`: Boolean indicating ongoing fetch state.
  - `fetchBranding`: `useCallback` fetching `GET ${NEXT_PUBLIC_API_URL || 'http://localhost:4002'}/api/system/config`. Merges retrieved nested assets and theme tokens into existing state.
  - `useEffect` (Mount): Dispatches `fetchBranding()`.
  - `useEffect` (Theme Injection): Watches `[branding]`. If in browser environment (`typeof document !== 'undefined'`), mutates `document.documentElement.style`:
    - `--primary-color` and `--primary` set to `branding.themeTokens.primaryColor`.
    - `--accent-color` and `--accent` set to `branding.themeTokens.accentColor`.
    - Evaluates `document.title`: If title includes `'Mr MathsScience'` or `'NexvoLearn'`, updates `document.title = `${branding.platformName} | ${branding.instructorName}``.
* **Mutations & Network Calls**:
  - `updateBranding(data, files)`:
    - Constructs `FormData`.
    - Appends text fields (`platformName`, `instructorName`, `slogan`, `contactPhone`, `contactEmail`, `supportWhatsApp`).
    - Appends serialized JSON strings for `assets` and `themeTokens`.
    - Appends binary file payloads from `files` dictionary (`logo`, `favicon`, `heroBanner`, etc.).
    - Sends `PUT ${apiUrl}/api/system/config` with `withCredentials: true` and `Content-Type: multipart/form-data`.
    - Merges updated configuration response directly into state.
* **Deficiencies & Critical Bugs**:
  1. **Bypasses Axios Singleton**: Uses raw `import axios from 'axios'` rather than `@/lib/axios`. Missing global request/response interceptors (e.g. token refresh, 401 re-login dialog broadcast).
  2. **Port Fallback Mismatch**: Defaults fallback URL to `http://localhost:4002`, while the backend server defaults to port `4000`.
  3. **Brittle Title Mutation**: Hardcoded check `document.title.includes('Mr MathsScience') || document.title.includes('NexvoLearn')` prevents dynamic page title updates if Next.js layout metadata generates any other title format.

---

### 3.2 `src/context/CustomizationContext.tsx`

* **Purpose & Architecture**:
  Central context provider for CMS page customization, landing page sections, subject categories, and grade levels. Merges static fallback defaults (`site-config.ts`) with live backend records.
* **Interface & Data Structure**:
  ```typescript
  interface CustomizationContextProps {
    siteSettings: any;
    pagesSettings: any;
    subjects: any[];
    grades: any[];
    loading: boolean;
    refreshCustomization: () => void;
  }
  ```
* **State & Hooks**:
  - `siteSettings`: Initialized with `defaultSiteConfig` from `../lib/site-config`.
  - `pagesSettings`: Initialized with `defaultPagesConfig` from `../lib/site-config`.
  - `subjects`: Initialized as `[]`.
  - `grades`: Initialized as `[]`.
  - `loading`: Boolean state.
  - `fetchCustomization`: Asynchronous function issuing `Promise.all` across three parallel endpoints:
    1. `GET /api/customization/settings`
    2. `GET /api/customization/subjects`
    3. `GET /api/customization/grades`
  - Deep-merges response payloads into `siteSettings` and `pagesSettings`, and populates `subjects` and `grades`.
  - Exposes `refreshCustomization` alias to components.
* **Deficiencies & Critical Bugs**:
  1. **Missing Axios Interceptor & Credentials**: Uses raw `axios` without `withCredentials: true`. If customization routes require session verification or are rate-limited per session, session cookies are omitted.
  2. **Untyped State Structures**: Heavily uses `any` for `siteSettings`, `pagesSettings`, `subjects`, and `grades`, bypassing TypeScript type-safety for downstream consumers.
  3. **Port Fallback Mismatch**: Hardcoded `http://localhost:4002` fallback when `process.env.NEXT_PUBLIC_API_URL` is omitted.

---

### 3.3 `src/context/EditModeContext.tsx`

* **Purpose & Architecture**:
  Lightweight React state context providing a visual in-line edit mode toggle. Allows administrators and authorized instructors to enter CMS editing mode directly on live pages to modify text blocks, cards, and banners.
* **Interface & Data Structure**:
  ```typescript
  interface EditModeContextType {
    isEditMode: boolean;
    toggleEditMode: () => void;
  }
  ```
* **State & Hooks**:
  - `isEditMode`: Boolean (default `false`).
  - `toggleEditMode`: Function toggling boolean flag: `setIsEditMode((prev) => !prev)`.
  - Custom hook `useEditMode()` includes null-context validation: throws `Error("useEditMode must be used within an EditModeProvider")`.
* **Legacy Reconciliation**:
  Identical byte-for-byte implementation to legacy `tuition-frontend/context/EditModeContext.tsx`.

---

### 3.4 `src/lib/fetcher.ts`

* **Purpose & Architecture**:
  Empty file (0 bytes).
* **Legacy Reconciliation**:
  In `tuition-frontend/lib/fetcher.ts`, this file was also 0 bytes. It is an unreferenced remnant of an abandoned SWR/React-Query fetcher utility.
* **Risk & Recommendation**:
  File should be deleted or populated with a standard SWR/fetcher wrapper over the `@/lib/axios` instance.

---

### 3.5 `src/lib/formatters.ts`

* **Purpose & Architecture**:
  Central data formatting library to prevent raw MongoDB ObjectIds (24-character hexadecimal strings) from being rendered in user interfaces when relational population fails or when dealing with unpopulated parent references.
* **Exported Functions & Logic**:
  1. `isMongoObjectId(val: unknown): boolean`:
     - Validates string via regular expression: `/^[0-9a-fA-F]{24}$/`.
  2. `formatGradeName(grade: any, gradesList: { _id?: string; name: string }[] = []): string`:
     - Falsy check: returns `"General"`.
     - Object check: if `{ name }` or `{ _id }` exists, recursively evaluates inner value.
     - String check:
       - If matches `isMongoObjectId`, queries `gradesList` for matching `_id` or `id`. If found, recursively formats `found.name`. If not found, falls back to `"Grade"`.
       - If regex matches `/^grade\s+/i`, extracts numerical suffix and formats as `"Grade ${numPart}"`.
       - If numeric string `/^\d+$/` (e.g. `"10"`), returns `"Grade 10"`.
       - Otherwise, capitalizes first character.
  3. `normalizeGradeKey(grade: any, gradesList: any[] = []): string`:
     - Invokes `formatGradeName(grade, gradesList)`.
     - Strips `"Grade"` prefix and returns trimmed lowercase key (e.g. `"10"`, `"12"`).
  4. `formatSubjectName(subject: any, subjectsList: { _id?: string; name: string }[] = []): string`:
     - Falsy check: returns `"General"`.
     - Object check: recursively extracts `.name` or `._id`.
     - String check:
       - If `isMongoObjectId`, matches against `subjectsList`. Returns resolved subject name or fallback `"Subject"`.
       - Otherwise, returns capitalized string.
* **Deficiencies & Critical Bugs**:
  - Recursion without depth guard: Cyclic object structures or malformed grade references could theoretically trigger call-stack overflow, though unlikely with standard API responses.

---

### 3.6 `src/lib/permissions.ts`

* **Purpose & Architecture**:
  A single-line convenience React hook simplifying component-level RBAC authorization checks.
* **Implementation**:
  ```typescript
  import { useAuthContext } from "@/context/AuthContext";

  export function usePermission(permissionKey: string): boolean {
    const { hasPermission } = useAuthContext();
    return hasPermission(permissionKey);
  }
  ```
* **Analysis**:
  - Provides a clean functional hook interface: `const canManageUsers = usePermission('users.manage');`.
  - Fully delegates to `AuthContext.hasPermission(permissionKey)`, inheriting all RBAC wildcard matching (`*`, `category.*`) and administrative bypass logic.

---

### 3.7 `src/lib/utils.ts`

* **Purpose & Architecture**:
  Low-level utility helpers for CSS class concatenation and HTML character entity sanitization.
* **Exported Functions**:
  1. `cn(...classes: Array<string | false | null | undefined>): string`:
     - Implementation: `classes.filter(Boolean).join(' ')`.
     - **Deficiency**: Unlike standard shadcn/ui implementations that use `twMerge(clsx(...))`, this naive filter/join does not deduplicate or resolve conflicting Tailwind utility classes (e.g. `cn("px-4 py-2", "px-6")` outputs `"px-4 py-2 px-6"` where CSS cascade precedence decides winner unpredictably).
  2. `decodeHtml(html: string): string`:
     - Decodes five standard XML/HTML entities: `&amp;` -> `&`, `&lt;` -> `<`, `&gt;` -> `>`, `&quot;` -> `"`, `&#39;` -> `'`.
     - Returns `""` on empty or falsy input.

---

## 4. Legacy Delta & Gaps

| Feature / Pattern | Legacy (`tuition-frontend`) | Target (`lms-client`) | Gap / Architectural Assessment |
|---|---|---|---|
| **Branding Configuration** | Static `site-config.ts` and `content.json` | Dynamic `BrandingContext.tsx` syncing with `/api/system/config` | Significant architectural upgrade. Adds real-time CSS variable injection and multi-tenant white-label styling. |
| **Theme Customization** | Hardcoded Tailwind classes | Dynamic CSS custom properties (`--primary`, `--accent`) injected into `:root` | Substantial upgrade allowing live color scheme customization from admin dashboard. |
| **Customization Taxonomy** | Static arrays in `lib/content-v2.json` | `CustomizationContext.tsx` fetching live `/api/customization/*` routes | Upgraded from static compile-time content to dynamic database-backed taxonomy. |
| **In-Line CMS Edit Mode** | `context/EditModeContext.tsx` | `src/context/EditModeContext.tsx` | 100% parity; exact port. |
| **Grade / Subject Display** | Ad-hoc inline ternary expressions; raw ObjectIds rendered if unpopulated | Centralized `src/lib/formatters.ts` | Eliminates raw ObjectId leakage in UI components. |
| **RBAC Authorization Hook** | Direct checks on `user.role === 'admin'` | Declarative `usePermission()` hook | Modern, granular permission checking replacing crude role string comparisons. |
| **Tailwind Class Merging** | Naive `classes.filter(Boolean).join(' ')` | Naive `classes.filter(Boolean).join(' ')` | Preserved legacy implementation without adopting `tailwind-merge`. |
| **Fetcher Utility** | 0-byte `lib/fetcher.ts` | 0-byte `src/lib/fetcher.ts` | Dead file carried over unchanged. |

---

## 5. Critical Findings & Technical Debt Summary

1. **Axios Client Fragmentation (High Priority)**:
   `BrandingContext.tsx` and `CustomizationContext.tsx` bypass the centralized `@/lib/axios` client and import base `axios` directly, re-defining `NEXT_PUBLIC_API_URL` fallbacks (`http://localhost:4002` instead of port `4000`) and dropping global response error interceptors.
2. **Missing `withCredentials` in Customization Fetching (Medium Priority)**:
   In `CustomizationContext.tsx`, `axios.get` calls omit `withCredentials: true`. If the customization endpoints are gated or rate-limited per session, session cookies will not be transmitted.
3. **Naive Class Combination (`cn`) (Medium Priority)**:
   `cn` in `src/lib/utils.ts` does not merge Tailwind classes with conflict resolution. When component callers override padding, colors, or positioning, style conflicts can occur unpredictably based on CSS class declaration order in the generated stylesheet.
4. **Orphaned Dead File (Low Priority)**:
   `src/lib/fetcher.ts` is 0 bytes and unreferenced across the codebase.

---

## 6. Verification & Sign-Off Checklist
- [x] All 7 Phase 16 files viewed, inspected, and deconstructed down to state mutations, hooks, parameters, and return types.
- [x] Context DOM mutations (`document.documentElement.style`, `document.title`) analyzed.
- [x] Cross-referenced against legacy `tuition-frontend` files and configurations.
- [x] Architectural gaps, network library fragmentations, and port discrepancies documented.
