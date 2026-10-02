# Phase 33 Dossier: Admin Quiz Authoring & Video Recording View (Frontend)

> **Phase Status:** 🟢 Complete  
> **Target Scope:** 6 Files in `lms-client`  
> **Subsystem:** Admin Quiz Authoring Suite, Dynamic Quiz Question Composition, Video Playback Engine & Entitled Stream Gate  
> **Document Location:** `docs/audit/phase-33-fe-admin-quizzes-recordings-view.md`  

---

## 1. Executive Architecture & Subsystem Summary

Phase 33 encapsulates two mission-critical instructional and media subsystems within `lms-client`:
1. **Administrative Quiz Authoring & Lifecycle Management:**
   - Multi-step quiz metadata orchestration, class binding, subject classification, and difficulty tiers.
   - Dynamic interactive question composition using polymorphic editors (`Multiple Choice`, `Identification`, `True/False`, `Matching/Ordering`, `Numeric Slider`).
   - Question sequence manipulation (bidirectional question reordering via array index swapping).
   - Atomic backend synchronization via `createQuiz`, `addQuestionsToQuiz`, and `upsertQuiz`.
2. **Entitled Video Stream Gate & Google Drive / YouTube Playback Engine:**
   - Dedicated streaming architecture requesting short-lived signed proxy tickets (`POST /recordings/proxy-ticket`) to enforce granular student monthly enrollment and fee verification.
   - Direct backend origin routing (`NEXT_PUBLIC_API_ORIGIN`) to bypass Vercel serverless proxy limits ("Fast Origin Transfer" egress caps).
   - Automatic token renewal and single-retry resilience on expired stream signatures (HTTP 401/410).
   - Multi-mode player abstraction handling native secure HTML5 video streams with anti-scraping controls (`controlsList="nodownload noplaybackrate"`, `disablePictureInPicture`, right-click prevention), Google Drive preview fallback iframes, and privacy-enhanced YouTube embeds (`youtube-nocookie.com`).

---

## 2. Exhaustive Per-File Technical Audit

### 2.1 `src/components/ui/quiz/create-quiz-form.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/quiz/create-quiz-form.tsx`
- **Role & Layer:** Administrative UI Form Component (Presentation & State Orchestration)
- **Line Count:** 438 lines

#### A. Imports & Dependencies
- React primitives: `useCallback`, `useEffect`, `useState` from `"react"`
- Routing & Services: `useRouter` from `"next/navigation"`, `getAllClasses` from `"@/services/classService"`, `upsertQuiz` from `"@/services/quizService"`
- Types: `QuizFormData`, `Question` from `"@/types/quiz"`, `ClassModel` from `"@/types/class"`
- Icons: `ListChecks`, `PlusCircle`, `Save`, `Sparkles` from `"lucide-react"`
- UI Design System:
  - `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` from `"@/components/ui/card"`
  - `Button` from `"@/components/ui/button"`
  - `Input` from `"@/components/ui/input"`
  - `Label` from `"@/components/ui/label"`
  - `Textarea` from `"@/components/ui/textarea"`
  - `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `"@/components/ui/select"`
  - `AlertDialog`, `AlertDialogAction`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` from `"@/components/ui/alert-dialog"`
  - `CardSection` from `"@/components/reusable/card-section"`
  - `QuestionEditor` from `"./question-editor"`

#### B. Component Interfaces & Props
```typescript
interface CreateQuizFormProps {
  initialData?: QuizFormData;
  onSubmit: (data: QuizFormData) => Promise<void>;
  submitLabel?: string;
}
```

#### C. Internal State Management
1. `quizData`: `useState<QuizFormData>`
   - Initialized with `initialData` or defaults:
     ```typescript
     {
       title: "",
       description: "",
       subject: "Math",
       class_id: undefined,
       difficulty: "Easy",
       time_limit_sec: 300,
       matchmaking_enabled: true,
       async_enabled: true,
       is_active: true,
       questions: [],
     }
     ```
2. `availableClasses`: `useState<ClassModel[]>([])` — cached list of classes fetched from backend for class-association dropdown.
3. `showSuccessDialog`: `useState<boolean>(false)` — controls modal visibility on successful quiz creation.
4. `isEditMode`: `Boolean(initialData?.frontend_id || initialData?.id)` — determines whether form runs in create or update mode.

#### D. Lifecycle & Effects
- `useEffect(() => { ... }, [])`:
  - Executes `getAllClasses()` on initial render.
  - Resolves classes payload from response (`res.classes || res.data || res || []`).
  - Sets `availableClasses` state.
  - Catches and logs errors to console.

#### E. State Mutators & Handlers
- `handleQuizChange(field: keyof QuizFormData, value: any)`:
  - Memoized via `useCallback`.
  - Performs immutable partial update: `setQuizData(prev => ({ ...prev, [field]: value }))`.
- `handleQuestionUpdate(index: number, updatedQuestion: Question)`:
  - Memoized via `useCallback`.
  - Replaces question at `index` in `prev.questions` with updated question object.
- `handleQuestionRemove(index: number)`:
  - Memoized via `useCallback`.
  - Enforces minimum 1 question constraint: `if (prev.questions.length <= 1) { alert("A quiz must have at least one question."); return prev; }`.
  - Filters out question at target `index`.
- `handleQuestionMoveUp(index: number)`:
  - Net-new feature in `lms-client`.
  - Guarded against `index <= 0`.
  - Swaps `newQuestions[index - 1]` with `newQuestions[index]` to elevate question sequence.
- `handleQuestionMoveDown(index: number)`:
  - Net-new feature in `lms-client`.
  - Guarded against `index >= prev.questions.length - 1`.
  - Swaps `newQuestions[index + 1]` with `newQuestions[index]` to depress question sequence.
- `addQuestion()`:
  - Appends new blank question to `questions` array:
    ```typescript
    {
      frontend_id: crypto.randomUUID(),
      type: "Multiple Choice",
      question: "",
      subject: quizData.subject || "Math",
      options: ["", "", "", ""],
      correctAnswer: "",
      explanation: "",
      marks: 1,
    }
    ```
- `handleSubmit(e: React.FormEvent)`:
  - Calls `e.preventDefault()`.
  - Validation Step 1: verifies `quizData.title.trim()` is not empty.
  - Validation Step 2: verifies `quizData.questions.length > 0`.
  - Validation Step 3: loops through all questions, validating non-empty prompt (`q.question.trim()`), non-empty option fields for `Multiple Choice`, and valid answer configuration (`correctAnswer !== undefined && correctAnswer !== ""`).
  - Upsert Reconciliation (if `isEditMode`):
    - Invokes `upsertQuiz(transformedPayload)` with payload:
      - `id`: `quizData.frontend_id || (quizData as any)._id || quizData.id`
      - `title`: `quizData.title`
      - `description`: `quizData.description`
      - `subject`: `quizData.subject`
      - `class_id`: `quizData.class_id || ""`
      - `difficulty`: `quizData.difficulty`
      - `time_limit_sec`: `quizData.time_limit_sec`
      - `matchmaking_enabled`: `quizData.matchmaking_enabled`
      - `async_enabled`: `quizData.async_enabled`
      - `is_active`: `quizData.is_active`
      - `questions`: mapped array transforming `correctAnswer` to `correct_answer`, preserving `_id` and `frontend_id`.
  - Callback Execution: invokes `await onSubmit(quizData)`.
  - Post-Execution: sets `showSuccessDialog(true)` if not in edit mode.

#### F. Render Structure & Controls
- Atmospheric Header: gradient header with badge (`Quiz Studio`), title (`{isEditMode ? "Edit Quiz" : "Create New Quiz"}`), and dynamic question count summary.
- CardSection 1 — "Quiz Details":
  - Title (`Input`)
  - Subject (`Select` dropdown: Mathematics, Science)
  - Class Association (`Select` dropdown: dynamic list of `availableClasses`, with "None (Unassigned)" option)
  - Description (`Textarea`, 3 rows)
  - Difficulty (`Select` dropdown: Easy, Medium, Hard)
  - Time Limit (`Input` type="number", min 0, placeholder "0 = No time limit")
  - Feature Flags: three checkbox controls (`matchmaking_enabled`, `async_enabled`, `is_active`)
- CardSection 2 — "Questions":
  - Maps through `quizData.questions` passing `QuestionEditor`.
  - "Add Question" outline button.
- Bottom Action: primary submit button with `Save` icon and label (`submitLabel`).
- `AlertDialog`: informs user of successful quiz creation/update.

---

### 2.2 `src/app/admin/quizez/add/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/admin/quizez/add/page.tsx`
- **Role & Layer:** Admin Route Controller (Client Component)
- **Line Count:** 30 lines

#### A. Imports & Dependencies
- Directive: `"use client";`
- Routing: `useRouter` from `"next/navigation"`
- Components: `CreateQuizForm` from `"@/components/ui/quiz/create-quiz-form"`
- Services: `createQuiz`, `addQuestionsToQuiz` from `"@/services/quizService"`
- Types: `QuizFormData` from `"@/types/quiz"`

#### B. Component Logic & Handlers
- `AddQuizPage()`:
  - Hooks: `const router = useRouter()`.
  - `handleCreate(data: QuizFormData)`:
    1. Dispatches `createQuiz({ ... })` containing:
       - `title`: `data.title`
       - `instructions`: `data.description`
       - `class_id`: `data.class_id ?? ""`
       - `subject`: `data.subject || undefined`
       - `difficulty`: `data.difficulty || "Easy"`
       - `time_limit_sec`: `Number(data.time_limit_sec) || 0`
       - `question_count`: `Array.isArray(data.questions) ? data.questions.length : 0`
    2. Resolves `quizId` from `quiz?.quiz?._id || (quiz as any)?._id`. Throws `"Quiz ID not returned"` if absent.
    3. Dispatches `addQuestionsToQuiz(quizId, data.questions as any)`.
    4. Triggers client-side redirect: `router.push("/admin/quizzes")`.
- Returns: `<CreateQuizForm onSubmit={handleCreate} submitLabel="Create Quiz" />`.

#### C. Architectural Gap / Path Mismatch
> [!WARNING]
> **Route Spelling Mismatch (`quizez` vs `quizzes`):**
> On line 25, `router.push("/admin/quizzes")` directs the user to `/admin/quizzes`. However, the file directory on disk is named `/admin/quizez/` (with single 'z' and two 'e's). Unless a Next.js rewrite exists, this causes a 404 navigation error upon quiz creation.

---

### 2.3 `src/app/admin/quizez/edit/[id]/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/admin/quizez/edit/[id]/page.tsx`
- **Role & Layer:** Admin Route Controller for Quiz Editing (Client Component)
- **Line Count:** 90 lines

#### A. Imports & Dependencies
- Directive: `"use client";`
- React: `useEffect`, `useState`
- Routing: `useRouter` from `"next/navigation"`
- Components: `CreateQuizForm` from `"@/components/ui/quiz/create-quiz-form"`, `Skeleton` from `"@/components/ui/skeleton"`
- Services: `getQuizByIdForUpdate`, `updateQuiz`, `updateQuizQuestion`, `addQuestionsToQuiz`, `deleteQuizQuestion` from `"@/services/quizService"`
- Types: `QuizFormData` from `"@/types/quiz"`

#### B. Parameters & State
- Receives `{ params }: { params: { id: string } }`.
- States:
  - `initialData`: `QuizFormData | null` (defaults to `null`)
  - `loading`: `boolean` (defaults to `true`)
- Unused Imports: `updateQuiz`, `updateQuizQuestion`, `addQuestionsToQuiz`, `deleteQuizQuestion` are imported but never invoked directly in this page component (delegated to `CreateQuizForm.handleSubmit`).

#### C. Lifecycle & Data Hydration
- `useEffect` triggered on `[quizId]`:
  - Calls `getQuizByIdForUpdate(quizId)`.
  - Normalizes and maps the backend quiz record into `QuizFormData`:
    - `frontend_id`: `quiz.frontend_id || quiz._id`
    - `title`: `quiz.title`
    - `description`: `quiz.instructions`
    - `subject`: `quiz.subject || ""`
    - `class_id`: `quiz.class_id || ""`
    - `difficulty`: `quiz.difficulty || "Easy"`
    - `time_limit_sec`: `quiz.time_limit_sec ?? 0`
    - `matchmaking_enabled`: `quiz.matchmaking_enabled ?? true`
    - `async_enabled`: `quiz.async_enabled ?? true`
    - `is_active`: `quiz.is_active ?? true`
    - `questions`: maps each question `q`:
      - `id`: `q._id`
      - `_id`: `q._id`
      - `frontend_id`: `q.frontend_id || q._id`
      - `type`: `q.type`
      - `question`: `q.question`
      - `subject`: `quiz.subject || "Science"`
      - `options`: `q.options ?? []`
      - `correctAnswer`: `q.correct_answer`
      - `explanation`: `q.explanation || ""`
      - `marks`: `q.marks ?? 1`
      - `sliderRange`: `q.sliderRange`
      - `dragItems`: `q.dragItems`
      - `image`: `q.image ?? ""`
  - Catches fetch errors with `console.error` and sets `loading(false)`.

#### D. Submission & Render
- `handleUpdate(data: QuizFormData)`:
  - Shows browser alert: `"Quiz updated successfully!"`.
  - Navigates: `router.push("/quizzes")`. (Redirects to public student catalog instead of admin dashboard).
- Loading State: renders modern `Skeleton` stack (h-10 pill, h-40 card, h-72 question card).
- Not Found State: renders fallback `<div className="p-8 text-slate-500 font-medium">Quiz not found.</div>`.
- Main Render: `<CreateQuizForm initialData={initialData} onSubmit={handleUpdate} submitLabel="Update Quiz" />`.

---

### 2.4 `src/app/admin/quizez/edit/client.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/admin/quizez/edit/client.tsx`
- **Role & Layer:** Orphaned / Empty File Artifact
- **Line Count:** 1 line (0 bytes)

#### A. Analysis & Defect Assessment
- File is completely empty (0 bytes).
- Present in both legacy `tuition-frontend` and `lms-client`.
- Originated during an unfinished refactoring intended to split server component loading from client interactive rendering in `/admin/quizez/edit/[id]`.
- Zero imports across the entire repository. Harmless but dead code.

---

### 2.5 `src/app/recordings/[id]/page.tsx`
- **Path:** `/Users/chandupa/lms-client/src/app/recordings/[id]/page.tsx`
- **Role & Layer:** Dynamic Student Video Recording Viewer Page (Client Route)
- **Line Count:** 47 lines

#### A. Imports & Dependencies
- Directive: `"use client";`
- Routing: `useParams` from `"next/navigation"`
- React: `useEffect`, `useState`
- Components: `RecordedClass` from `"@/components/ui/recordings/recorded-class"`, `DetailLoader` from `"@/components/reusable/detail-loader"`
- Services & Types: `getRecordingById`, `Recording` from `"@/services/recordingService"`

#### B. Component Logic & State
- Extracts recording ID: `const { id } = useParams<{ id: string }>()`.
- States:
  - `recording`: `Recording | null`
  - `error`: `string | null`
  - `loading`: `boolean` (initial `true`)
- Data Fetching Effect:
  - Invokes `getRecordingById(id)`.
  - Sets `recording` data or sets `error("Recording not found or unavailable.")`.
  - Always disables `loading` in `finally` block.
- Error & Guard Handling:
  - If `loading`: renders `<DetailLoader />`.
  - If `error || !recording`: renders error banner in red text (`error ?? "Recording not found."`).
  - Google Drive / Video File ID Resolution:
    - Resolves `fileId = recording.driveFileId || recording.video_url`.
    - If `!fileId`: renders `<div className="p-6 text-red-600">Recording is missing a Google Drive file ID.</div>`.
- Main Render:
  ```tsx
  <RecordedClass
    title={recording.title}
    driveFileId={fileId}
    uploaded_at={recording.uploaded_at ?? new Date().toISOString()}
    useServerGate={true}
  />
  ```

---

### 2.6 `src/components/ui/recordings/recorded-class.tsx`
- **Path:** `/Users/chandupa/lms-client/src/components/ui/recordings/recorded-class.tsx`
- **Role & Layer:** Secure Video Playback Engine & Entitlement Gate (Presentation & Stream Security)
- **Line Count:** 284 lines

#### A. Imports & Dependencies
- Directive: `"use client";`
- React: `useEffect`, `useRef`, `useState`
- Network: `API` from `"@/lib/axios"`
- Components: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` from `"@/components/dev/card"`
- Icons: `Calendar`, `Clock`, `Video` from `"lucide-react"`
- Date Formatting: `format` from `"date-fns"`

#### B. Component Interface (Props)
```typescript
type Props = {
  title?: string;
  driveFileId: string;
  uploaded_at: Date | string;
  useServerGate?: boolean; // Default true: signed proxy stream; false: public Drive preview iframe
};
```

#### C. Internal Helper Functions
1. `createRecordingProxyUrl(driveFileId: string): Promise<string>`:
   - Makes `POST /recordings/proxy-ticket` with `{ fileId: driveFileId }`.
   - Validates `data?.url`.
   - Vercel Fast Origin Bypass:
     ```typescript
     let finalUrl = data.url;
     if (finalUrl.startsWith("/")) {
       const origin = process.env.NEXT_PUBLIC_API_ORIGIN?.replace(/\/$/, "") || "";
       if (origin) {
         finalUrl = `${origin}${finalUrl}`;
       }
     }
     return finalUrl;
     ```
   - Normalizes error response extracting `status`, `message`, and `month_key`.
2. `getDrivePreviewIframeSrc(driveFileId: string): string`:
   - Returns `https://drive.google.com/uc?export=preview&id=${encodeURIComponent(driveFileId)}`.
3. `prettyMonthKey(mk?: string)`:
   - Parses `YYYY-MM` month key and formats as readable string (e.g., `"May 2025"`).

#### D. Stream Acquisition & Error Recovery State Machine
- States:
  - `videoSrc`: `string | null`
  - `err`: `string | null`
  - `forbiddenInfo`: `string | null`
  - `aliveRef`: `useRef(true)` (lifecycle safety flag to prevent state updates after unmount)
- Lifecycle Execution:
  1. Sets `aliveRef.current = true` and clears previous stream/error state.
  2. If `useServerGate === true`:
     - Calls `createRecordingProxyUrl(driveFileId)`.
     - Assigns signed proxy URL to `videoSrc`.
  3. If `useServerGate === false`:
     - Generates direct Google Drive preview iframe source and assigns to `videoSrc`.
  4. Error Handling:
     - **HTTP 403 Forbidden:** indicates user has not paid for or is not enrolled in the specific month's class recording (`month_key`). Formats localized notice: `"You don't have permission to view this recording for [Month Year]."` and disables stream. Bypasses fallbacks.
     - **Expired / Token Errors (401, 410, or regex matches `expired|token|signature|ticket`):** performs an automatic single retry to obtain a refreshed ticket via `createRecordingProxyUrl(driveFileId)`. If retry also fails with 403, sets forbidden state.
     - **Generic Error:** displays user-facing error message without compromising protected assets.

#### E. Video Player Render Architecture
- Detects video type:
  - `isYouTube`: `driveFileId?.length === 11`
  - `isPublicPreview`: `videoSrc?.startsWith("https://drive.google.com/uc?")`
- Branch 1: Loading / Error States (`!videoSrc`):
  - Displays centered message box inside 16:9 aspect ratio card.
  - If `forbiddenInfo`: displays entitlement denial with instructions to contact instructor.
  - If `err`: displays stream failure notice with refresh suggestion.
  - If active loading: renders animated spinner (`border-indigo-400 border-t-transparent animate-spin`).
- Branch 2: Fallback Iframe (`isPublicPreview || isYouTube`):
  - If YouTube: renders `https://www.youtube-nocookie.com/embed/${driveFileId}?rel=0&modestbranding=1&controls=1&showinfo=0&fs=0` with `allowFullScreen`.
  - If Google Drive: renders preview iframe with standard embed permissions.
- Branch 3: Signed Proxy Native Video (`<video>`):
  - Embedded HTML5 `<video>` tag pointing to signed streaming endpoint.
  - `preload="metadata"`.
  - Anti-download & Anti-scraping safeguards:
    - `controlsList="nodownload noplaybackrate"`
    - `disablePictureInPicture`
    - `onContextMenu={(e) => e.preventDefault()}` (disables right-click save-as context menu)
    - `onError` handler with gated fallback.

---

## 3. Legacy Delta & Gaps (`tuition-frontend` vs `lms-client`)

| Feature / Dimension | Legacy (`tuition-frontend`) | Target (`lms-client`) | Architectural Impact / Status |
| :--- | :--- | :--- | :--- |
| **Question Reordering** | ❌ Not supported (static index appending) | 🟢 Supported (`handleQuestionMoveUp`, `handleQuestionMoveDown` handlers added to `CreateQuizForm`) | Major UX upgrade: instructors can reorder questions on the fly before saving. |
| **Admin Quiz Add Redirect** | Pushed to `/admin/quizzes` (route 404 risk) | Pushed to `/admin/quizzes` (folder is `admin/quizez`) | Persistent typo bug carried over from legacy. Requires routing redirect or folder renaming. |
| **Edit Quiz Skeletons** | Plain text `<div>Loading...</div>` | Polished `Skeleton` layout stack (`@/components/ui/skeleton`) | High visual fidelity and prevents layout shift during quiz hydration. |
| **Orphaned `client.tsx`** | Empty file (0 bytes) in `app/admin/quizez/edit/client.tsx` | Preserved as 0 bytes empty file | Technical debt carried over from legacy repository without functional impact. |
| **Video Stream Gate** | `POST /recordings/proxy-ticket` with relative Vercel bypass | Preserved and identical | Maintains secure video proxy ticket architecture and avoids Vercel bandwidth egress penalties. |
| **Anti-Scraping Video Controls** | `controlsList="nodownload noplaybackrate"`, right-click blocked | Preserved and identical | Protects proprietary instructional lecture recordings from one-click browser scraping. |

---

## 4. Verification, Defects & Security Checklist

- [x] **Question Reorder Boundary Safeguards:** `handleQuestionMoveUp` checks `index <= 0` and `handleQuestionMoveDown` checks `index >= prev.questions.length - 1`, preventing out-of-bounds array mutations.
- [x] **Question Validation Rigor:** `handleSubmit` mandates non-empty prompts, valid multiple-choice options, and defined correct answers before allowing dispatch.
- [x] **Video Stream Entitlement Enforcement:** 403 Forbidden status codes explicitly suppress video iframe fallback, strictly guarding unpaid instructional recordings against unauthorized viewing.
- [!] **Route Folder Typo Defect:** In `admin/quizez/add/page.tsx:25`, `router.push("/admin/quizzes")` navigates to `/admin/quizzes` while the route folder is `/admin/quizez`.
- [!] **Edit Quiz Redirect Defect:** In `admin/quizez/edit/[id]/page.tsx:68`, post-update navigation pushes to `/quizzes` (the student quiz catalog) instead of the admin quiz dashboard.
- [!] **Unused Imports in Edit Page:** `admin/quizez/edit/[id]/page.tsx` imports `updateQuiz`, `updateQuizQuestion`, `addQuestionsToQuiz`, `deleteQuizQuestion` which are never invoked.
- [x] **Memory Leak Prevention:** `recorded-class.tsx` utilizes `aliveRef` to cancel async state updates if the user navigates away mid-stream resolution.
