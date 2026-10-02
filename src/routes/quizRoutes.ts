import express from "express";
const router = express.Router();
import * as quizController from "../controllers/quizController";
import { requirePermission, authenticate, optionalAuth } from "../middlewares/auth";

// Create and manage quizzes
router.post("/", requirePermission("quizzes.manage"), quizController.createQuiz);
router.post("/create", requirePermission("quizzes.manage"), quizController.createQuiz);
router.post("/upsert", requirePermission("quizzes.manage"), quizController.upsertQuizAndQuestions);
router.post("/:quizId/questions", requirePermission("quizzes.manage"), quizController.addQuestionsToQuiz);
router.put("/questions/:questionId", requirePermission("quizzes.manage"), quizController.updateQuestion);
router.delete("/questions/:questionId", requirePermission("quizzes.manage"), quizController.deleteQuestion);

// Get all quizzes (public-safe / preview for guests)
router.get("/", optionalAuth, quizController.getAllQuizzesForPlay);
router.get("/all", optionalAuth, quizController.getAllQuizzesForPlay);

// Submit quiz answers (entitled students)
router.post("/:quizId/submit", requirePermission("quizzes.attempt"), quizController.submitQuiz);
router.get("/submission/:submissionId", authenticate, quizController.getSubmissionById);

// Performance / Analytics
router.get("/performance/user", authenticate, quizController.getUserQuizPerformance);
router.get("/performance/teacher", requirePermission("quizzes.grade"), quizController.getTeacherQuizPerformance);
router.get("/performance/teacher/user", requirePermission("quizzes.grade"), quizController.getTeacherUserPerformance);
router.get("/performance/admin", requirePermission("quizzes.grade"), quizController.getAdminQuizPerformance);

// Leaderboards
router.get("/leaderboard", optionalAuth, quizController.getLeaderboard);
router.get("/leaderboard/me", authenticate, quizController.getMyLeaderboardPosition);
router.get("/:quizId/leaderboard/first-attempt", optionalAuth, quizController.getFirstAttemptLeaderboard);

// Quiz specific operations
router.get("/admin/:id", requirePermission("quizzes.manage"), quizController.getQuizByIdForUpdate);
router.get("/:id", optionalAuth, quizController.getQuizByIdForPlay);
router.put("/:id", requirePermission("quizzes.manage"), quizController.updateQuiz);

export default router;
