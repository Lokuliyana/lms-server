# Phase 24 Audit Dossier: Frontend API Services — Assessments, Media & Academic Records

## 1. Module Overview & Architectural Context

Phase 24 evaluates the data transfer, state mutations, and client-side communication layers powering the student and instructor academic workflows in `lms-client`. This service layer bridges the React UI components with the backend API routers audited in Phases 06–10 (`quizRoutes`, `assignmentRoutes`, `recordingRoutes`, `mediaRoutes`, `attendanceRoutes`, `gradeRoutes`).

### Target Scope (7 Files)
1. `src/services/quizService.ts` — Assessment lifecycle, challenge matchmaking, async attempts, analytics, and grading review.
2. `src/services/assignmentService.ts` — Assignment distribution, student file submissions, evaluation grading, and resubmissions.
3. `src/services/recordingService.ts` — Video lecture metadata, Google Drive integration, JWT-gated preview tickets, and stream proxy URLs.
4. `src/services/mediaService.ts` — Unified binary asset upload pipeline, Cloudinary / S3 multi-part form routing, and signed URL generation.
5. `src/services/attendanceService.ts` — Session attendance tracking, roll call recording, student attendance statistics, and personal logs.
6. `src/services/gradeService.ts` — Term/exam mark recording, publish toggles, class gradebook aggregation, CSV export, and student results.
7. `src/lib/content-v2-mock.ts` — Static UI mock configuration, navigational schema, and landing page content structures.

---

## 2. Exhaustive Per-File Reverse Engineering

---

### File 1: `src/services/quizService.ts`
- **Path:** `/Users/chandupa/lms-client/src/services/quizService.ts`
- **Role:** Comprehensive client API gateway for quizzes, question authoring, real-time matchmaking, student attempt execution, result submission, question-by-question review, and performance analytics.
- **Dependencies:** `@/lib/axios` (`API`), `@/types/quiz` (`Quiz`, `QuizFilters`, `Question`).
- **Data Shapes & Type Contracts:**
  - `QuizSummary`: Summarized quiz metadata for catalog and class listings:
    - `_id: string; title: string; description: string; category: string; tags: string[]; difficulty: "Easy" | "Medium" | "Hard"; time_limit_sec: number; question_count?: number; total_marks?: number; version: number; matchmaking_enabled: boolean; async_enabled: boolean; allowed_roles?: string[]; status: "draft" | "published" | "archived"; expires_at?: string; class_id?: string; is_published?: boolean; is_practice?: boolean; created_at: string; updated_at: string;`
  - `QuizListResponse`: Paginated quiz response:
    - `quizzes: QuizSummary[]; total: number; page: number; limit: number; totalPages: number;`
  - `QuizReviewItem`: Detailed post-submission question review:
    - `question_id: string; question_text: string; question_type: string; options?: Array<{ id: string; text: string }>; user_answer: any; correct_answer: any; explanation?: string; is_correct: boolean; marks_awarded: number; time_spent_sec?: number;`
  - `QuizAttemptSummary`: High-level attempt summary:
    - `attempt_id: string; quiz_id: string; score: number; total_marks: number; percentage: number; started_at: string; submitted_at: string; time_spent_sec: number; breakdown?: any;`
  - `QuizPerformanceAnalytics`: Cumulative student analytics:
    - `total_attempts: number; average_score: number; average_percentage: number; highest_score: number; lowest_score: number; history: QuizAttemptSummary[]; topic_strengths: Array<{ category: string; accuracy: number; count: number }>;`
  - `LeaderboardEntry`: Competitive standings:
    - `rank: number; user_id: string; user_name: string; user_avatar?: string; score: number; percentage: number; submitted_at: string; time_spent_sec: number;`
  - `MatchmakingQueueStatus`: Challenge lobby state:
    - `in_queue: boolean; queue_id?: string; estimated_wait_sec?: number; matched?: boolean; match_id?: string;`
- **Exported API Operations:**
  - `getQuizzes(filters?: QuizFilters, page = 1, limit = 10)`: GET `/quizzes` with query params. Returns `QuizListResponse`.
  - `getQuizById(id: string)`: GET `/quizzes/${id}`. Returns `{ quiz: Quiz }`.
  - `createQuiz(payload: Partial<Quiz>)`: POST `/quizzes`. Returns `{ quiz: Quiz; message: string }`.
  - `updateQuiz(id: string, payload: Partial<Quiz>)`: PUT `/quizzes/${id}`. Returns `{ quiz: Quiz; message: string }`.
  - `deleteQuiz(id: string)`: DELETE `/quizzes/${id}`. Returns `{ message: string }`.
  - `publishQuiz(id: string, publish: boolean)`: PUT `/quizzes/${id}/publish` body `{ publish }`. Returns `{ quiz: Quiz; message: string }`.
  - `startQuizAttempt(quizId: string)`: POST `/quizzes/${quizId}/attempts`. Returns `{ attempt: QuizAttempt; questions: Question[] }` (backend sanitizes correct answer indices before responding).
  - `submitQuizAttempt(quizId: string, attemptId: string, answers: Array<{ question_id: string; selected_options: string[]; answer_text?: string; time_spent_sec?: number }>)`: POST `/quizzes/${quizId}/attempts/${attemptId}/submit`. Returns `{ attempt: QuizAttempt; results: { score: number; total_marks: number; percentage: number; passed: boolean; review?: QuizReviewItem[] } }`.
  - `getAttemptReview(quizId: string, attemptId: string)`: GET `/quizzes/${quizId}/attempts/${attemptId}/review`. Returns `{ attempt: QuizAttempt; review: QuizReviewItem[] }`.
  - `getStudentAttempts(quizId?: string)`: GET `/quizzes/attempts/my` with optional `?quizId=`. Returns `QuizAttemptSummary[]`.
  - `getQuizAnalytics(quizId: string)`: GET `/quizzes/${quizId}/analytics`. Returns `QuizPerformanceAnalytics`.
  - `getUserPerformanceAnalytics()`: GET `/quizzes/analytics/my`. Returns `QuizPerformanceAnalytics`.
  - `getQuizLeaderboard(quizId: string)`: GET `/quizzes/${quizId}/leaderboard`. Returns `LeaderboardEntry[]`.
  - `joinMatchmaking(quizId: string)`: POST `/quizzes/${quizId}/matchmaking/join`. Returns `MatchmakingQueueStatus`.
  - `leaveMatchmaking(quizId: string)`: POST `/quizzes/${quizId}/matchmaking/leave`. Returns `{ message: string }`.
  - `getMatchmakingStatus(quizId: string)`: GET `/quizzes/${quizId}/matchmaking/status`. Returns `MatchmakingQueueStatus`.
  - `getClassQuizzes(classId: string)`: GET `/classes/${classId}/quizzes`. Returns `QuizSummary[]`.
- **Legacy Delta & Gaps:**
  - Compared with `tuition-frontend/services/quizService.ts`: Almost identical, with one critical addition in `lms-client`: `total_marks?: number;` added to `QuizSummary`.
  - Perfect contract alignment with `lms-server` assessment routes audited in Phase 06/07.

---

### File 2: `src/services/assignmentService.ts`
- **Path:** `/Users/chandupa/lms-client/src/services/assignmentService.ts`
- **Role:** Assignment distribution, submission handling, grading evaluation, and resubmission permissions.
- **Dependencies:** `@/lib/axios` (`API`).
- **Data Shapes & Type Contracts:**
  - `Assignment`:
    - `_id: string; class_id: string; title: string; description: string; attachments?: string[]; due_date: string; max_marks: number; passing_marks: number; allowed_file_types?: string[]; max_file_size_mb?: number; is_published: boolean; allow_late_submissions: boolean; created_by: string; createdAt: string; updatedAt: string; submission_count?: number; user_submission?: Submission;`
  - `Submission`:
    - `_id: string; assignment_id: string; student_id: string | any; submission_url?: string; attachments?: string[]; submitted_at: string; status: "submitted" | "late" | "graded" | "resubmitted"; grade?: string; marks_obtained?: number; feedback?: string; graded_by?: string; graded_at?: string; resubmission_allowed?: boolean;`
  - `CreateAssignmentPayload`: Input contract omitting auto-generated metadata.
  - `UpdateAssignmentPayload`: Partial updates for assignment properties.
  - `GradeSubmissionPayload`: `{ marks_obtained: number; grade?: string; feedback?: string }`.
- **Exported API Operations:**
  - `getAssignments(classId: string)`: GET `/classes/${classId}/assignments`. Returns `Assignment[]`.
  - `getAssignmentById(assignmentId: string)`: GET `/assignments/${assignmentId}`. Returns `Assignment`.
  - `createAssignment(payload: CreateAssignmentPayload)`: POST `/assignments`. Returns `{ message: string; assignment: Assignment }`.
  - `updateAssignment(assignmentId: string, payload: UpdateAssignmentPayload)`: PUT `/assignments/${assignmentId}`. Returns `{ message: string; assignment: Assignment }`.
  - `deleteAssignment(assignmentId: string)`: DELETE `/assignments/${assignmentId}`. Returns `{ message: string }`.
  - `publishAssignment(assignmentId: string, isPublished: boolean)`: PUT `/assignments/${assignmentId}/publish` body `{ is_published: isPublished }`.
  - `submitAssignment(assignmentId: string, file: File, onProgress?: (pct: number) => void)`: POST `/assignments/${assignmentId}/submit` using `FormData` with progress handler. Returns `{ message: string; submission: Submission }`.
  - `getSubmissions(assignmentId: string)`: GET `/assignments/${assignmentId}/submissions`. Returns `Submission[]`.
  - `getMySubmission(assignmentId: string)`: GET `/assignments/${assignmentId}/submissions/my`. Returns `Submission | null`.
  - `gradeSubmission(assignmentId: string, submissionId: string, payload: GradeSubmissionPayload)`: PUT `/assignments/${assignmentId}/submissions/${submissionId}/grade`. Returns `{ message: string; submission: Submission }`.
  - `allowResubmission(assignmentId: string, submissionId: string)`: PUT `/assignments/${assignmentId}/submissions/${submissionId}/resubmit`. Returns `{ message: string }`.
- **Legacy Delta & Gaps:**
  - 100% byte-for-byte identical with `tuition-frontend/services/assignmentService.ts`.
  - Endpoints match `assignmentController.ts` in `lms-server`.

---

### File 3: `src/services/recordingService.ts`
- **Path:** `/Users/chandupa/lms-client/src/services/recordingService.ts`
- **Role:** Video recording lecture metadata, Google Drive fileId extraction, stream proxy URLs, and time-limited JWT ticket exchange.
- **Dependencies:** `@/lib/axios` (`API`).
- **Data Shapes & Type Contracts:**
  - `RecordingCreatePayload`: `{ class_id: string; title: string; driveUrl: string; session_date?: string; batch_name?: string; }`
  - `RecordingUpdatePayload`: `{ title?: string; driveUrl?: string; session_date?: string | null; batch_name?: string | null; is_expired?: boolean; }`
  - `Recording`: `{ _id: string; class_id: string; title: string; driveUrl?: string; driveFileId?: string; video_url?: string; uploaded_at: string; is_expired?: boolean; session_date?: string | null; batch_name?: string | null; }`
  - `CreateTicketResponse`: `{ ticket: string; iframeSrc: string; }`
- **Exported API Operations & URL Normalizers:**
  - `createRecording(payload: RecordingCreatePayload)`: POST `/recordings`
  - `updateRecording(recordingId: string, updates: RecordingUpdatePayload)`: PUT `/recordings/${encodeURIComponent(recordingId)}`
  - `deleteRecording(recordingId: string)`: DELETE `/recordings/${encodeURIComponent(recordingId)}`
  - `expireRecording(recordingId: string)`: PUT `/recordings/${encodeURIComponent(recordingId)}/expire`
  - `getDrivePreviewIframeSrc(fileId: string)`: Returns direct Google Drive preview embed: `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`
  - `getRecordingStreamUrl(fileId: string)`: Direct streaming URL: `${origin}/api/recordings/stream/${encodeURIComponent(fileId)}`
  - `getRecordingById(recordingId: string)`: GET `/recordings/${encodeURIComponent(recordingId)}`. Client-side normalizes legacy document fields:
    - If `!rec.driveFileId && rec.video_url`: sets `driveFileId = rec.video_url` and `driveUrl = https://drive.google.com/file/d/${rec.video_url}/view`.
    - If `!rec.uploaded_at && rec.created_at`: sets `uploaded_at = rec.created_at`.
  - `getRecordingsByClassId(classId: string)`: GET `/classes/${encodeURIComponent(classId)}/recordings`
  - `createRecordingTicket(fileId: string)`: POST `/recordings/ticket` body `{ fileId }`. Validates `fileId.length >= 10`. Returns `{ ticket, iframeSrc }`.
- **Legacy Delta & Gaps:**
  - In `tuition-frontend/services/recordingService.ts`, there was a legacy helper `createRecordingProxyUrl` invoking `POST /recordings/proxy-ticket`.
  - In `lms-client`, `createRecordingProxyUrl` was removed, standardizing the streaming playback mechanism on `/recordings/ticket`.
  - The client correctly sanitizes IDs with `encodeURIComponent`.

---

### File 4: `src/services/mediaService.ts`
- **Path:** `/Users/chandupa/lms-client/src/services/mediaService.ts`
- **Role:** Centralized binary media upload, deletion, and signed URL generation handler supporting classes, quizzes, answers, and student enrollment documents.
- **Dependencies:** `@/lib/axios` (`API`).
- **Data Shapes & Type Contracts:**
  - `MediaOwnerType`: `'class' | 'quiz' | 'answer' | 'enrollment'`
  - `UploadMediaResponse`: `{ success: boolean; publicUrl: string; filePath: string; fileId?: string; }`
  - `DeleteResp`: `{ success: boolean; message: string; }`
  - `SignedUrlResp`: `{ url: string; }`
- **Exported API Operations:**
  - `uploadMedia(file: File, ownerType: MediaOwnerType, ownerId: string, onProgress?: (pct: number) => void)`: POST `/media/upload` using `multipart/form-data` with `FormData` (`file`, `ownerType`, `ownerId`). Tracks upload progress via Axios `onUploadProgress`.
  - `deleteMedia(filePath: string)`: DELETE `/media/delete` passing `{ data: { filePath } }`.
  - `getSignedUrl(filePath: string, ttlSeconds = 3600)`: GET `/media/url` passing params `{ filePath, ttl: ttlSeconds }`.
- **Legacy Delta & Gaps:**
  - 100% byte-for-byte identical with `tuition-frontend/services/mediaService.ts`.
  - Fully compatible with `mediaController.ts` in `lms-server`.

---

### File 5: `src/services/attendanceService.ts`
- **Path:** `/Users/chandupa/lms-client/src/services/attendanceService.ts`
- **Role:** Academic attendance roll-call tracking, session auditing, attendance percentage statistics, and individual student logs.
- **Dependencies:** `@/lib/axios` (`API`).
- **Data Shapes & Type Contracts:**
  - `StudentAttendanceEntry`: `{ studentId: string | any; status: "present" | "absent" | "late" | "excused"; note?: string; }`
  - `AttendanceSheet`: `{ _id: string; classId: string; date: string; sessionTitle: string; sessionType: "lecture" | "tutorial" | "revision" | "exam" | "other"; markedBy?: any; records: StudentAttendanceEntry[]; notes?: string; createdAt?: string; updatedAt?: string; }`
  - `AttendanceStats`: Statistical aggregate containing counts for sessions, entries, present, late, absent, excused, and overall `attendanceRate`.
- **Exported Service Object (`attendanceService`):**
  - `markAttendance(payload: { classId, date, sessionTitle?, sessionType?, records, notes? })`: POST `/attendance`.
  - `updateAttendance(id: string, payload: any)`: PUT `/attendance/${id}`.
  - `getClassAttendance(classId: string, from?: string, to?: string)`: GET `/attendance/class/${classId}` with query params `from` and `to`.
  - `getClassAttendanceStats(classId: string)`: GET `/attendance/class/${classId}/stats`.
  - `getMyAttendance(classId?: string)`: GET `/attendance/my` with optional query param `classId`.
- **Legacy Delta & Gaps:**
  - **Net-new module in `lms-client`**: No equivalent service existed in legacy `tuition-frontend`.
  - Aligns with backend `attendanceController.ts` audited in Phase 08.

---

### File 6: `src/services/gradeService.ts`
- **Path:** `/Users/chandupa/lms-client/src/services/gradeService.ts`
- **Role:** Academic examination grading, score ledger recording, result publication toggles, student score lookup, and gradebook CSV export URL generation.
- **Dependencies:** `@/lib/axios` (`API`).
- **Data Shapes & Type Contracts:**
  - `StudentScoreEntry`: `{ studentId: string | any; marksObtained: number; percentage?: number; grade?: string; remarks?: string; }`
  - `ExamResultDoc`: Complete exam record containing `classId`, `examTitle`, `examDate`, `termOrMonth`, `maxMarks`, `passMarks`, `isPublished`, `scores`, `stats` (`averageScore`, `averagePercentage`, `highestScore`, `lowestScore`, `totalStudents`), and `myScore` (injected for student callers).
- **Exported Service Object (`gradeService`):**
  - `recordExamResults(payload: { classId, examTitle, examDate, termOrMonth?, maxMarks?, passMarks?, isPublished?, scores, notes? })`: POST `/grades`.
  - `updateExamResults(id: string, payload: any)`: PUT `/grades/${id}`.
  - `togglePublish(id: string, isPublished?: boolean)`: PUT `/grades/${id}/publish` body `{ isPublished }`.
  - `getClassExamResults(classId: string)`: GET `/grades/class/${classId}`.
  - `getMyExamResults(classId?: string)`: GET `/grades/my` with optional query param `classId`.
  - `exportCsvUrl(id: string)`: Generates absolute link `${base}/grades/export/${id}`, falling back to `http://localhost:5000/api`.
- **Legacy Delta & Gaps:**
  - **Net-new module in `lms-client`**: No equivalent service existed in legacy `tuition-frontend`.
  - Matches `gradeController.ts` in `lms-server` audited in Phase 08.
  - **Bug/Risk in `exportCsvUrl`**: Uses `process.env.NEXT_PUBLIC_API_URL` falling back to `http://localhost:5000/api`. If deployed behind custom reverse proxies or production domains without this variable set, CSV exports default to localhost.

---

### File 7: `src/lib/content-v2-mock.ts`
- **Path:** `/Users/chandupa/lms-client/src/lib/content-v2-mock.ts`
- **Role:** Prototyping mock configuration providing static site metadata, landing page headers, Lucide icons, and page label mappings.
- **Dependencies:** `lucide-react`, `react-icons/fa`, `./content-v2.json`, `./site-config`.
- **Exported Entities:**
  - `siteConfig`: Mock metadata, empty nav generator functions (`items: () => []`, `otherItems: () => []`), and footer socials mapped to React icons.
  - `pagesConfig`: Mock content for `about`, `dashboard`, `classes`, `quizzes`, `performance`, and `auth`.
- **Architectural Analysis & Zero-Loss Assessment:**
  - **100% Dead/Orphaned Code:** Grep of the entire `lms-client` codebase proves that `src/lib/content-v2-mock.ts` is never imported by any component, service, or page.
  - In legacy `tuition-frontend`, `site-config.ts` exported `pagesConfig` directly from `lib/site-config.ts`. During initial migration experiments, this mock file was created to test static JSON hydration, but was superseded by dynamic MongoDB branding contexts (`BrandingContext.tsx`, `CustomizationContext.tsx`) and standard `site-config.ts`.
  - Per the Zero-Loss Rule, it must be documented as an orphaned artifact rather than deleted without explicit approval.

---

## 3. Cross-Cutting Analysis & Contract Reconciliations

### 3.1 Client-to-Server Route Matrix

| Service Method | HTTP Method & Route | Target Backend Controller | Status |
| :--- | :--- | :--- | :--- |
| `quizService.getQuizzes` | GET `/quizzes` | `quizController.listQuizzes` | 🟢 Validated |
| `quizService.getQuizById` | GET `/quizzes/:id` | `quizController.getQuiz` | 🟢 Validated |
| `quizService.createQuiz` | POST `/quizzes` | `quizController.createQuiz` | 🟢 Validated |
| `quizService.startQuizAttempt` | POST `/quizzes/:id/attempts` | `quizController.startAttempt` | 🟢 Validated |
| `quizService.submitQuizAttempt` | POST `/quizzes/:id/attempts/:attemptId/submit` | `quizController.submitAttempt` | 🟢 Validated |
| `quizService.joinMatchmaking` | POST `/quizzes/:id/matchmaking/join` | `quizController.joinQueue` | 🟢 Validated |
| `assignmentService.submitAssignment` | POST `/assignments/:id/submit` | `assignmentController.submit` | 🟢 Validated |
| `recordingService.createRecordingTicket` | POST `/recordings/ticket` | `recordingController.createTicket` | 🟢 Validated |
| `recordingService.getRecordingById` | GET `/recordings/:id` | `recordingController.getRecording` | 🟢 Validated |
| `mediaService.uploadMedia` | POST `/media/upload` | `mediaController.upload` | 🟢 Validated |
| `attendanceService.markAttendance` | POST `/attendance` | `attendanceController.markAttendance` | 🟢 Validated |
| `gradeService.recordExamResults` | POST `/grades` | `gradeController.recordResults` | 🟢 Validated |
| `gradeService.exportCsvUrl` | GET `/grades/export/:id` | `gradeController.exportCsv` | 🟡 Config Env Warning |

---

## 4. Key Findings & Critical Risks

1. **Hardcoded Fallback in `gradeService.exportCsvUrl` (`gradeService.ts:79-81`):**
   - Direct link generation uses `process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"`. If `NEXT_PUBLIC_API_URL` is omitted in staging or production environments, CSV download buttons will route browser windows to `http://localhost:5000/api/grades/export/:id`.
2. **Orphaned Dead File (`src/lib/content-v2-mock.ts`):**
   - 150 lines of static mock code reading from `./content-v2.json` with empty nav arrays. Not imported anywhere in `lms-client`.
3. **Legacy Document Field Normalization in `recordingService.ts` (`recordingService.ts:108-114`):**
   - Client-side compatibility shim mutates response objects (`rec.driveFileId = rec.video_url; rec.driveUrl = ...; rec.uploaded_at = rec.created_at;`). While functional, this indicates un-migrated legacy recording documents in MongoDB.
4. **Clean Decoupling of Assessments and Media:**
   - Both `quizService` and `assignmentService` maintain robust typing, error handling, and exact alignment with backend controllers audited in Phases 06–08.
