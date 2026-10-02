# MASTER AUDIT INDEX & REVERSE ENGINEERING DOSSIER

> **Mission:** Full-system reverse engineering and clean architecture dossier across the migrated platform (`lms-server`, `lms-client`) with rigorous reconciliation against legacy repositories (`express`, `tuition-frontend`).

## 1. Operating Rules & Protocol

1. **Strict Batch Sizing:** Exactly 5 to 8 files per phase. Never exceed 8 files. Never fewer than 5 files.
2. **Strict Layer Separation:** Frontend and Backend files are never mixed in the same phase. All modules are completed cleanly.
3. **Zero-Shortcuts Rule:** Every file is analyzed down to state mutations, hooks, network calls, parameters, return shapes, and edge cases. Banned: `...`, `// rest of code`, generic summaries.
4. **Legacy Reconciliation:** Every file is cross-referenced with its corresponding legacy counterpart in `express` or `tuition-frontend` to capture lost business rules and edge-case regressions.
5. **Zero-Degradation On-Disk Persistence:** Every phase audit is saved immediately to `docs/audit/phase-XX-[module-name].md`, preserving complete audit depth across context resets.

---

## 2. System Inventory Summary

| Layer | Target Repository | Legacy Counterpart | Total Files Audited | Total Phases |
| :--- | :--- | :--- | :---: | :---: |
| **Backend** | `/Users/chandupa/lms-server` (TypeScript / Express / Mongoose) | `/Users/chandupa/express` (JavaScript / Express / MongoDB) | 93 files | Phases 1 – 13 (13 phases) |
| **Frontend** | `/Users/chandupa/lms-client` (Next.js 16 / React 19 / Tailwind) | `/Users/chandupa/tuition-frontend` (Next.js / React) | 147 files | Phases 14 – 34 (21 phases) |
| **Total** | **NexvoLearn Platform** | **Legacy Platform** | **240 files** | **34 Phases** |

---

## 3. Master Phase Matrix Table

| Phase | Layer | Module / Domain | Files | Status | Dossier File | Target Files |
| :---: | :---: | :--- | :---: | :---: | :--- | :--- |
| 01 | BE | Core Architecture, Config & Middlewares | 7 | 🟢 Complete | [`phase-01-be-core-architecture.md`](./phase-01-be-core-architecture.md) | `src/server.ts`<br>`src/app.ts`<br>`src/config/db.ts`<br>`src/config/env.ts`<br>`src/config/modules.ts`<br>`src/middlewares/errorHandler.ts`<br>`src/middlewares/rateLimiter.ts` |
| 02 | BE | Identity, Auth Models & RBAC Schema | 7 | 🟢 Complete | [`phase-02-be-auth-rbac-models.md`](./phase-02-be-auth-rbac-models.md) | `src/models/User.ts`<br>`src/models/Role.ts`<br>`src/models/Permission.ts`<br>`src/models/RolePermission.ts`<br>`src/models/OTP.ts`<br>`src/models/StudentProfile.ts`<br>`src/middlewares/auth.ts` |
| 03 | BE | Auth & User Management (Services & API Routes) | 7 | 🟢 Complete | [`phase-03-be-auth-user-controllers.md`](./phase-03-be-auth-user-controllers.md) | `src/services/authService.ts`<br>`src/controllers/authController.ts`<br>`src/controllers/usersController.ts`<br>`src/controllers/permissionsController.ts`<br>`src/routes/authRoutes.ts`<br>`src/routes/usersRoutes.ts`<br>`src/routes/permissionsRoutes.ts` |
| 04 | BE | Curriculum, Classes & Entitlements (Models & Services) | 8 | 🟢 Complete | [`phase-04-be-classes-entitlements.md`](./phase-04-be-classes-entitlements.md) | `src/models/Class.ts`<br>`src/models/Subject.ts`<br>`src/models/ClassEnrollment.ts`<br>`src/models/ClassEntitlement.ts`<br>`src/services/classService.ts`<br>`src/services/entitlementService.ts`<br>`src/controllers/classController.ts`<br>`src/routes/classRoutes.ts` |
| 05 | BE | Class Applications, Zoom Meetings & Admissions | 7 | 🟢 Complete | [`phase-05-be-applications-meetings.md`](./phase-05-be-applications-meetings.md) | `src/models/ClassApplication.ts`<br>`src/models/MeetingTicket.ts`<br>`src/services/classApplicationService.ts`<br>`src/controllers/classApplicationController.ts`<br>`src/controllers/meetingController.ts`<br>`src/routes/classApplicationRoutes.ts`<br>`src/routes/meetingRoutes.ts` |
| 06 | BE | Assessment Data Model & Question Bank Schema | 8 | 🟢 Complete | [`phase-06-be-assessments-schema.md`](./phase-06-be-assessments-schema.md) | `src/models/Quiz.ts`<br>`src/models/QuizQuestion.ts`<br>`src/models/QuizSubmission.ts`<br>`src/models/Assessment.ts`<br>`src/models/AssessmentQuestion.ts`<br>`src/models/AssessmentSubmission.ts`<br>`src/models/AssessmentMatch.ts`<br>`src/models/ChallengeMatch.ts` |
| 07 | BE | Quiz Engine, Evaluation Pipeline & Live Challenges | 7 | 🟢 Complete | [`phase-07-be-quiz-challenge-engine.md`](./phase-07-be-quiz-challenge-engine.md) | `src/models/UserAssessmentStats.ts`<br>`src/models/UserPerformance.ts`<br>`src/services/assessmentService.ts`<br>`src/controllers/quizController.ts`<br>`src/controllers/challengeController.ts`<br>`src/routes/quizRoutes.ts`<br>`src/routes/challengeRoutes.ts` |
| 08 | BE | Assignments, Student Attendance & Academic Grading | 8 | 🟢 Complete | [`phase-08-be-assignments-attendance-grades.md`](./phase-08-be-assignments-attendance-grades.md) | `src/models/Assignment.ts`<br>`src/models/AttendanceRecord.ts`<br>`src/models/Grade.ts`<br>`src/models/ExamResult.ts`<br>`src/controllers/assignmentController.ts`<br>`src/controllers/attendanceController.ts`<br>`src/controllers/gradeController.ts`<br>`src/routes/assignmentRoutes.ts` |
| 09 | BE | Recordings, File Management & Media Streaming | 8 | 🟢 Complete | [`phase-09-be-recordings-media-pipeline.md`](./phase-09-be-recordings-media-pipeline.md) | `src/models/Recording.ts`<br>`src/models/File.ts`<br>`src/services/recordingService.ts`<br>`src/services/mediaService.ts`<br>`src/controllers/recordingController.ts`<br>`src/controllers/mediaController.ts`<br>`src/routes/recordingsRoutes.ts`<br>`src/routes/mediaRoute.ts` |
| 10 | BE | Cloud Storage Adapters, Utilities & Tracking Routes | 7 | 🟢 Complete | [`phase-10-be-storage-utilities-tracking.md`](./phase-10-be-storage-utilities-tracking.md) | `src/utils/driveClient.ts`<br>`src/utils/driveHelpers.ts`<br>`src/utils/googleDrive.ts`<br>`src/utils/supabaseClient.ts`<br>`src/utils/monthKey.ts`<br>`src/routes/attendanceRoutes.ts`<br>`src/routes/gradeRoutes.ts` |
| 11 | BE | Payment Gateways & Financial Transactions | 7 | 🟢 Complete | [`phase-11-be-payments-transactions.md`](./phase-11-be-payments-transactions.md) | `src/models/Transaction.ts`<br>`src/services/payments/paymentProvider.ts`<br>`src/services/payments/paymentFactory.ts`<br>`src/services/payments/stripeProvider.ts`<br>`src/services/payments/payhereProvider.ts`<br>`src/controllers/payments/paymentController.ts`<br>`src/routes/payments/paymentRoutes.ts` |
| 12 | BE | White-Label Branding & Site Customization Engine | 7 | 🟢 Complete | [`phase-12-be-branding-customization.md`](./phase-12-be-branding-customization.md) | `src/models/TenantSettings.ts`<br>`src/models/SiteSettings.ts`<br>`src/controllers/systemConfigController.ts`<br>`src/controllers/customizationController.ts`<br>`src/routes/systemConfigRoutes.ts`<br>`src/routes/customizationRoutes.ts`<br>`src/scripts/migrateCustomization.ts` |
| 13 | BE | Database Seeders, Storage Cleaner & Test Harness | 5 | 🟢 Complete | [`phase-13-be-seeders-storage-cleaner.md`](./phase-13-be-seeders-storage-cleaner.md) | `src/scripts/seedPermissions.ts`<br>`src/scripts/seedData.ts`<br>`src/scripts/storageCleaner.ts`<br>`src/scripts/verify-full-regression.ts`<br>`src/scripts/verify-permissions.ts` |
| 14 | FE | Types, Network Client & Auth State Engine | 7 | 🟢 Complete | [`phase-14-fe-types-network-authstate.md`](./phase-14-fe-types-network-authstate.md) | `src/types/axios.d.ts`<br>`src/types/quiz.ts`<br>`src/types/recordings.ts`<br>`src/types/user.ts`<br>`src/lib/axios.ts`<br>`src/lib/api.ts`<br>`src/lib/authState.ts` |
| 15 | FE | Auth Context, Access Gates & Login Flow | 7 | 🟢 Complete | [`phase-15-fe-auth-context-access-gates.md`](./phase-15-fe-auth-context-access-gates.md) | `src/context/AuthContext.tsx`<br>`src/components/auth/AccessGate.tsx`<br>`src/components/auth/AccessDenied.tsx`<br>`src/components/ui/auth/login-form.tsx`<br>`src/components/ui/auth/register-form.tsx`<br>`src/components/ui/auth/ReLoginDialog.tsx`<br>`src/app/login/page.tsx` |
| 16 | FE | Global Contexts (Branding, Customization) & Core Utilities | 7 | 🟢 Complete | [`phase-16-fe-global-contexts-utilities.md`](./phase-16-fe-global-contexts-utilities.md) | `src/context/BrandingContext.tsx`<br>`src/context/CustomizationContext.tsx`<br>`src/context/EditModeContext.tsx`<br>`src/lib/fetcher.ts`<br>`src/lib/formatters.ts`<br>`src/lib/permissions.ts`<br>`src/lib/utils.ts` |
| 17 | FE | Custom Hooks, Cloud Connectors & Debouncing | 8 | 🟢 Complete | [`phase-17-fe-custom-hooks-connectors.md`](./phase-17-fe-custom-hooks-connectors.md) | `src/hooks/useAuth.ts`<br>`src/hooks/useBranding.ts`<br>`src/hooks/usePermission.ts`<br>`src/hooks/useDebounce.ts`<br>`src/hooks/use-toast.ts`<br>`src/lib/site-config.ts`<br>`src/lib/cloudinary.ts`<br>`src/lib/globalLoading.ts` |
| 18 | FE | Global Layout, Responsive Navigation & Topbar | 7 | 🟢 Complete | [`phase-18-fe-global-layout-navigation.md`](./phase-18-fe-global-layout-navigation.md) | `src/app/layout.tsx`<br>`src/components/layout/layout-wrapper.tsx`<br>`src/components/ui/navbar/index.tsx`<br>`src/components/ui/navbar/NavbarDesktop.tsx`<br>`src/components/ui/navbar/NavbarMobile.tsx`<br>`src/components/ui/navbar/navAnimations.ts`<br>`src/components/ui/navbar/useNavPermissions.ts` |
| 19 | FE | Navigation Bars, Brand Logo & Shell Components | 7 | 🟢 Complete | [`phase-19-fe-navbars-brand-logo-shell.md`](./phase-19-fe-navbars-brand-logo-shell.md) | `src/components/ui/navbar.tsx`<br>`src/components/ui/side-navbar.tsx`<br>`src/components/ui/topbar.tsx`<br>`src/components/ui/brand-logo.tsx`<br>`src/components/ui/navConfig.ts`<br>`src/components/ui/footer.tsx`<br>`src/components/system/GlobalLoader.tsx` |
| 20 | FE | Design System Loaders, Skeletons & Card Sections | 7 | 🟢 Complete | [`phase-20-fe-design-loaders-skeletons.md`](./phase-20-fe-design-loaders-skeletons.md) | `src/components/reusable/calculating-loader.tsx`<br>`src/components/reusable/detail-loader.tsx`<br>`src/components/reusable/section-loader.tsx`<br>`src/components/reusable/section-header.tsx`<br>`src/components/reusable/sub-section.tsx`<br>`src/components/reusable/card-section.tsx`<br>`src/components/ui/skeleton.tsx` |
| 21 | FE | Data Presentation Widgets & Rich Text Editing | 7 | 🟢 Complete | [`phase-21-fe-data-presentation-rich-text.md`](./phase-21-fe-data-presentation-rich-text.md) | `src/components/ui/button.tsx`<br>`src/components/ui/stat-card.tsx`<br>`src/components/ui/title.tsx`<br>`src/components/ui/empty-state.tsx`<br>`src/components/ui/data-table.tsx`<br>`src/components/ui/command-search.tsx`<br>`src/components/ui/rich-text-editor.tsx` |
| 22 | FE | Content Editors & Public Landing Experience | 7 | 🟢 Complete | [`phase-22-fe-content-editors-landing.md`](./phase-22-fe-content-editors-landing.md) | `src/components/ui/text-editor.tsx`<br>`src/components/admin/editable-content.tsx`<br>`src/components/admin/editable-image.tsx`<br>`src/components/ui/hero-marketing.tsx`<br>`src/components/ui/landing/LandingHero.tsx`<br>`src/components/ui/landing/PopularClasses.tsx`<br>`src/app/page.tsx` |
| 23 | FE | Frontend API Services: Identity, Users & Core Classes | 7 | 🟢 Complete | [`phase-23-fe-services-auth-users-classes.md`](./phase-23-fe-services-auth-users-classes.md) | `src/services/authService.ts`<br>`src/services/userService.ts`<br>`src/services/classService.ts`<br>`src/services/class/classCrudService.ts`<br>`src/services/class/applicationService.ts`<br>`src/services/class/entitlementService.ts`<br>`src/services/class/zoomTicketService.ts` |
| 24 | FE | Frontend API Services: Assessments, Media & Academic Records | 7 | 🟢 Complete | [`phase-24-fe-services-assessments-media-records.md`](./phase-24-fe-services-assessments-media-records.md) | `src/services/quizService.ts`<br>`src/services/assignmentService.ts`<br>`src/services/recordingService.ts`<br>`src/services/mediaService.ts`<br>`src/services/attendanceService.ts`<br>`src/services/gradeService.ts`<br>`src/lib/content-v2-mock.ts` |
| 25 | FE | Student Dashboard, User Profiles & Info Hub | 7 | 🟢 Complete | [`phase-25-fe-dashboard-user-profile.md`](./phase-25-fe-dashboard-user-profile.md) | `src/app/dashboard/page.tsx`<br>`src/app/dashboard/profile/page.tsx`<br>`src/app/user/[id]/page.tsx`<br>`src/app/info/page.tsx`<br>`src/components/ui/user/UserCard.tsx`<br>`src/components/ui/user/UserForm.tsx`<br>`src/utils/cropImage.ts` |
| 26 | FE | Class Catalog, Class Cards & Hook Abstraction | 7 | 🟢 Complete | [`phase-26-fe-class-catalog-cards.md`](./phase-26-fe-class-catalog-cards.md) | `src/hooks/useClass.ts`<br>`src/app/classes/page.tsx`<br>`src/components/reusable/classCard.tsx`<br>`src/components/ui/class-view/empty-card.tsx`<br>`src/components/ui/class-view/theme-provider.tsx`<br>`src/utils/datetime.ts`<br>`src/utils/upload-class.tsx` |
| 27 | FE | Student Class Detail Hub & Layout Framework | 7 | 🟢 Complete | [`phase-27-fe-class-detail-hub-layout.md`](./phase-27-fe-class-detail-hub-layout.md) | `src/app/classes/[id]/page.tsx`<br>`src/components/ui/class-view/class-page.tsx`<br>`src/components/ui/class-view/class-header.tsx`<br>`src/components/ui/class-view/class-sidebar.tsx`<br>`src/components/ui/class-view/class-tabs.tsx`<br>`src/components/ui/class-view/class-syllabus.tsx`<br>`src/components/ui/class-view/class-recordings.tsx` |
| 28 | FE | Class Academic Submodules (Attendance, Grades & Tasks) | 7 | 🟢 Complete | [`phase-28-fe-class-academic-submodules.md`](./phase-28-fe-class-academic-submodules.md) | `src/components/ui/class-view/class-attendance.tsx`<br>`src/components/ui/class-view/class-grades.tsx`<br>`src/components/ui/class-view/class-quizzes.tsx`<br>`src/components/ui/class-view/class-assignments.tsx`<br>`src/components/ui/class-view/AssignmentsDownloadAndView.tsx`<br>`src/components/ui/class-view/apply-class.tsx`<br>`src/components/ui/class-view/class-form.tsx` |
| 29 | FE | Class Admissions, Document Review & Application Dashboard | 7 | 🟢 Complete | [`phase-29-fe-admissions-application-dashboard.md`](./phase-29-fe-admissions-application-dashboard.md) | `src/components/ui/class-view/ClassForm.tsx`<br>`src/components/ui/application/application-status-badge.tsx`<br>`src/components/ui/application/document-viewer-dialog.tsx`<br>`src/components/ui/application/application-action-dialog.tsx`<br>`src/components/ui/application/class-applications-dashboard.tsx`<br>`src/app/admin/classes/applications/page.tsx`<br>`src/app/admin/classes/assignment/page.tsx` |
| 30 | FE | Admin Class Authoring & Course Configuration | 7 | 🟢 Complete | [`phase-30-fe-admin-class-authoring.md`](./phase-30-fe-admin-class-authoring.md) | `src/app/admin/dashboard/page.tsx`<br>`src/app/admin/classes/page.tsx`<br>`src/app/admin/classes/add/page.tsx`<br>`src/app/admin/classes/edit/[id]/page.tsx`<br>`src/app/admin/classes/edit/[id]/client.tsx`<br>`src/app/admin/settings/branding/page.tsx`<br>`src/app/admin/customization/page.tsx` |
| 31 | FE | Student Quiz Catalog, Interactive Quiz Engine & Popups | 7 | 🟢 Complete | [`phase-31-fe-quiz-catalog-taking-engine.md`](./phase-31-fe-quiz-catalog-taking-engine.md) | `src/hooks/useQuizzes.ts`<br>`src/hooks/useChallenges.ts`<br>`src/app/quizzes/page.tsx`<br>`src/app/quizzes/[id]/page.tsx`<br>`src/app/quizzes/[id]/take/page.tsx`<br>`src/components/ui/quiz/quiz-card.tsx`<br>`src/components/ui/quiz/quiz-engine.tsx` |
| 32 | FE | Quiz Evaluation, Performance Analytics & Question Authoring | 8 | 🟢 Complete | [`phase-32-fe-quiz-evaluation-analytics-authoring.md`](./phase-32-fe-quiz-evaluation-analytics-authoring.md) | `src/components/ui/quiz/QuizPopup.tsx`<br>`src/components/ui/quiz/header.tsx`<br>`src/components/ui/quiz/question-editor.tsx`<br>`src/components/ui/quiz/performance-tracker.tsx`<br>`src/app/quizzes/review/[submission]/page.tsx`<br>`src/app/quizzes/review/quizReview.tsx`<br>`src/app/quizzes/performance/page.tsx`<br>`src/app/admin/quizez/performances/page.tsx` |
| 33 | FE | Admin Quiz Authoring & Video Recording View | 6 | 🟢 Complete | [`phase-33-fe-admin-quizzes-recordings-view.md`](./phase-33-fe-admin-quizzes-recordings-view.md) | `src/components/ui/quiz/create-quiz-form.tsx`<br>`src/app/admin/quizez/add/page.tsx`<br>`src/app/admin/quizez/edit/[id]/page.tsx`<br>`src/app/admin/quizez/edit/client.tsx`<br>`src/app/recordings/[id]/page.tsx`<br>`src/components/ui/recordings/recorded-class.tsx` |
| 34 | FE | Admin Video Editing, User Administration & RBAC Management | 6 | 🟢 Complete | [`phase-34-fe-admin-recordings-users-rbac.md`](./phase-34-fe-admin-recordings-users-rbac.md) | `src/components/ui/recordings/add-recording.tsx`<br>`src/app/admin/recording/add/page.tsx`<br>`src/app/admin/recording/edit/[id]/page.tsx`<br>`src/app/admin/user/page.tsx`<br>`src/app/admin/permissions/page.tsx`<br>`src/components/PermissionMatrix.tsx` |

---

## 4. Cross-Module Architecture & Dependency Map

```mermaid
flowchart TD
    subgraph Backend ["Backend Services: lms-server"]
        P01["Phase 01: Core Architecture & Middlewares"] --> P02["Phase 02: RBAC & Auth Models"]
        P02 --> P03["Phase 03: Auth & User Services"]
        P03 --> P04["Phase 04: Classes & Entitlements"]
        P04 --> P05["Phase 05: Class Applications & Zoom Meetings"]
        P04 --> P06["Phase 06: Assessment Schema"]
        P06 --> P07["Phase 07: Quiz Engine & Challenges"]
        P04 --> P08["Phase 08: Assignments, Attendance & Grades"]
        P04 --> P09["Phase 09: Recordings & Media Pipeline"]
        P09 --> P10["Phase 10: Cloud Storage Utilities"]
        P04 --> P11["Phase 11: Payments & Transactions"]
        P01 --> P12["Phase 12: White-Label Branding"]
        P02 --> P13["Phase 13: Seeders & Test Harness"]
    end

    subgraph Frontend ["Frontend Client: lms-client"]
        P14["Phase 14: Types, Network Client & Auth State"] --> P15["Phase 15: Auth Context & Access Gates"]
        P14 --> P16["Phase 16: Global Contexts & Utils"]
        P16 --> P17["Phase 17: Hooks & Cloud Connectors"]
        P15 --> P18["Phase 18: Global Layout & Navigation"]
        P18 --> P19["Phase 19: Navbars, Topbar & Shell"]
        P19 --> P20["Phase 20: Design Loaders & Skeletons"]
        P20 --> P21["Phase 21: Data Presentation & Editors"]
        P21 --> P22["Phase 22: Landing Experience"]
        P14 --> P23["Phase 23: Core Services: Auth & Classes"]
        P14 --> P24["Phase 24: Core Services: Quizzes & Media"]
        P23 --> P25["Phase 25: Dashboards & Profiles"]
        P23 --> P26["Phase 26: Class Catalog & Cards"]
        P26 --> P27["Phase 27: Class Detail Hub"]
        P27 --> P28["Phase 28: Class Academic Tabs"]
        P28 --> P29["Phase 29: Admissions & Applications"]
        P29 --> P30["Phase 30: Admin Class Authoring"]
        P24 --> P31["Phase 31: Quiz Taking Engine"]
        P31 --> P32["Phase 32: Quiz Analytics & Review"]
        P32 --> P33["Phase 33: Admin Quizzes & Video Player"]
        P25 --> P34["Phase 34: Admin Recordings, Users & RBAC Matrix"]
    end
```
