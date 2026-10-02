"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const quizController = __importStar(require("../controllers/quizController"));
const auth_1 = require("../middlewares/auth");
// Create and manage quizzes
router.post("/", (0, auth_1.requirePermission)("quizzes.manage"), quizController.createQuiz);
router.post("/create", (0, auth_1.requirePermission)("quizzes.manage"), quizController.createQuiz);
router.post("/upsert", (0, auth_1.requirePermission)("quizzes.manage"), quizController.upsertQuizAndQuestions);
router.post("/:quizId/questions", (0, auth_1.requirePermission)("quizzes.manage"), quizController.addQuestionsToQuiz);
router.put("/questions/:questionId", (0, auth_1.requirePermission)("quizzes.manage"), quizController.updateQuestion);
router.delete("/questions/:questionId", (0, auth_1.requirePermission)("quizzes.manage"), quizController.deleteQuestion);
// Get all quizzes (public-safe / preview for guests)
router.get("/", auth_1.optionalAuth, quizController.getAllQuizzesForPlay);
router.get("/all", auth_1.optionalAuth, quizController.getAllQuizzesForPlay);
// Submit quiz answers (entitled students)
router.post("/:quizId/submit", (0, auth_1.requirePermission)("quizzes.attempt"), quizController.submitQuiz);
router.get("/submission/:submissionId", auth_1.authenticate, quizController.getSubmissionById);
// Performance / Analytics
router.get("/performance/user", auth_1.authenticate, quizController.getUserQuizPerformance);
router.get("/performance/teacher", (0, auth_1.requirePermission)("quizzes.grade"), quizController.getTeacherQuizPerformance);
router.get("/performance/teacher/user", (0, auth_1.requirePermission)("quizzes.grade"), quizController.getTeacherUserPerformance);
router.get("/performance/admin", (0, auth_1.requirePermission)("quizzes.grade"), quizController.getAdminQuizPerformance);
// Leaderboards
router.get("/leaderboard", auth_1.optionalAuth, quizController.getLeaderboard);
router.get("/leaderboard/me", auth_1.authenticate, quizController.getMyLeaderboardPosition);
router.get("/:quizId/leaderboard/first-attempt", auth_1.optionalAuth, quizController.getFirstAttemptLeaderboard);
// Quiz specific operations
router.get("/admin/:id", (0, auth_1.requirePermission)("quizzes.manage"), quizController.getQuizByIdForUpdate);
router.get("/:id", auth_1.optionalAuth, quizController.getQuizByIdForPlay);
router.put("/:id", (0, auth_1.requirePermission)("quizzes.manage"), quizController.updateQuiz);
exports.default = router;
