import express from "express";
const router = express.Router();
import * as quizController from "../controllers/quizController";
import { requirePermission } from "../middlewares/auth";

// Create a quiz
router.post("/create", requirePermission("quizzes.create"), quizController.createQuiz);
router.post("/upsert", requirePermission("quizzes.update"), quizController.upsertQuizAndQuestions);
router.post("/:quizId/questions", requirePermission("quizzes.update"), quizController.addQuestionsToQuiz);
router.put("/questions/:questionId", requirePermission("quizzes.update"), quizController.updateQuestion);
router.delete("/questions/:questionId", requirePermission("quizzes.update"), quizController.deleteQuestion);

// Get all quizzes
router.get("/all", quizController.getAllQuizzesForPlay);

// Submit quiz answers
router.post("/:quizId/submit", requirePermission("quizzes.create"), quizController.submitQuiz);
router.get("/submission/:submissionId", requirePermission("quizzes.read"), quizController.getSubmissionById);

// Performance / Analytics
router.get("/performance/user", requirePermission("quizzes.read"), quizController.getUserQuizPerformance);
router.get("/performance/teacher", requirePermission("quizzes.read"), quizController.getTeacherQuizPerformance);
router.get("/performance/teacher/user", requirePermission("quizzes.read"), quizController.getTeacherUserPerformance);
router.get("/performance/admin", requirePermission("quizzes.read"), quizController.getAdminQuizPerformance);

// Leaderboards
router.get("/leaderboard", requirePermission("quizzes.read"), quizController.getLeaderboard);
router.get("/leaderboard/me", requirePermission("quizzes.read"), quizController.getMyLeaderboardPosition);
router.get("/:quizId/leaderboard/first-attempt", requirePermission("quizzes.read"), quizController.getFirstAttemptLeaderboard);

// Quiz specific operations
router.get("/admin/:id", requirePermission("quizzes.update"), quizController.getQuizByIdForUpdate);
router.get("/:id", quizController.getQuizByIdForPlay);
router.put("/:id", requirePermission("quizzes.update"), quizController.updateQuiz);

export default router;
