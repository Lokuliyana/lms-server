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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherUserPerformance = exports.updateQuiz = exports.getFirstAttemptLeaderboard = exports.getMyLeaderboardPosition = exports.getLeaderboard = exports.getTeacherQuizPerformance = exports.getAdminQuizPerformance = exports.getUserQuizPerformance = exports.getSubmissionById = exports.submitQuiz = exports.getQuizByIdForUpdate = exports.getQuizByIdForPlay = exports.getAllQuizzesForPlay = exports.deleteQuestion = exports.updateQuestion = exports.addQuestionsToQuiz = exports.upsertQuizAndQuestions = exports.createQuiz = void 0;
const assessmentService = __importStar(require("../services/assessmentService"));
const taxonomyResolver_1 = require("../utils/taxonomyResolver");
// Create quiz
const createQuiz = async (req, res) => {
    try {
        const { title, instructions, class_id, subject, grade, difficulty, time_limit_sec, question_count, matchmaking_enabled, async_enabled, is_active, } = req.body;
        const resolvedSubject = await (0, taxonomyResolver_1.resolveSubject)(subject);
        const resolvedGrade = await (0, taxonomyResolver_1.resolveGrade)(grade);
        const payload = {
            title: String(title).trim(),
            instructions: String(instructions || '').trim(),
            subject: resolvedSubject,
            grade: resolvedGrade,
            class_id: class_id && class_id !== 'none' ? class_id : undefined,
            difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Easy',
            time_limit_sec: Number.isFinite(Number(time_limit_sec)) ? Math.max(0, Number(time_limit_sec)) : 0,
            question_count: Number.isFinite(Number(question_count)) ? Math.max(0, Number(question_count)) : undefined,
            matchmaking_enabled: typeof matchmaking_enabled === 'boolean' ? matchmaking_enabled : true,
            async_enabled: typeof async_enabled === 'boolean' ? async_enabled : true,
            is_active: typeof is_active === 'boolean' ? is_active : true,
            created_by: req.user?.userId,
        };
        const quiz = await assessmentService.createQuiz(payload);
        return res.status(201).json({ message: 'Quiz created successfully', quiz });
    }
    catch (error) {
        console.error('Error creating quiz:', error);
        return res.status(error?.name === 'CastError' ? 400 : 500).json({ message: error.message || 'Error creating quiz' });
    }
};
exports.createQuiz = createQuiz;
// Upsert quiz and questions
const upsertQuizAndQuestions = async (req, res) => {
    try {
        const data = req.body;
        data.created_by = req.user?.userId;
        if (data.subject !== undefined) {
            data.subject = await (0, taxonomyResolver_1.resolveSubject)(data.subject);
        }
        if (data.grade !== undefined) {
            data.grade = await (0, taxonomyResolver_1.resolveGrade)(data.grade);
        }
        const result = await assessmentService.upsertQuizAndQuestions(data);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('Error upserting quiz:', error);
        return res.status(error?.name === 'CastError' ? 400 : 500).json({ message: error.message || 'Error upserting quiz' });
    }
};
exports.upsertQuizAndQuestions = upsertQuizAndQuestions;
// Add questions to quiz
const addQuestionsToQuiz = async (req, res) => {
    const { quizId } = req.params;
    const { questions } = req.body;
    try {
        const result = await assessmentService.addQuestionsToQuiz(quizId, questions);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error adding questions to quiz:', error);
        res.status(500).json({ message: 'Error adding questions to quiz' });
    }
};
exports.addQuestionsToQuiz = addQuestionsToQuiz;
// Update quiz question
const updateQuestion = async (req, res) => {
    const { questionId } = req.params;
    try {
        const result = await assessmentService.updateQuestion(questionId, req.body);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ message: 'Error updating question' });
    }
};
exports.updateQuestion = updateQuestion;
// Delete quiz question
const deleteQuestion = async (req, res) => {
    const { questionId } = req.params;
    try {
        const result = await assessmentService.deleteQuestion(questionId);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ message: error.message || 'Error deleting question' });
    }
};
exports.deleteQuestion = deleteQuestion;
/**
 * SAFE quiz fetches for PLAY (no answer leaks)
 */
const getAllQuizzesForPlay = async (req, res) => {
    try {
        const quizzes = await assessmentService.getAllQuizzesForPlay();
        res.status(200).json(quizzes);
    }
    catch (error) {
        console.error("Error getting quizzes:", error);
        res.status(500).json({ message: "Error fetching quizzes" });
    }
};
exports.getAllQuizzesForPlay = getAllQuizzesForPlay;
const getQuizByIdForPlay = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await assessmentService.getQuizByIdForPlay(id);
        if (!quiz)
            return res.status(404).json({ message: "Quiz not found" });
        res.status(200).json(quiz);
    }
    catch (error) {
        console.error("Error fetching quiz by ID:", error);
        res.status(500).json({ message: "Error fetching quiz by ID" });
    }
};
exports.getQuizByIdForPlay = getQuizByIdForPlay;
const getQuizByIdForUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await assessmentService.getQuizByIdForUpdate(id);
        if (!quiz)
            return res.status(404).json({ message: "Quiz not found" });
        res.status(200).json(quiz);
    }
    catch (error) {
        console.error("Error fetching quiz by ID:", error);
        res.status(500).json({ message: "Error fetching quiz by ID" });
    }
};
exports.getQuizByIdForUpdate = getQuizByIdForUpdate;
// Submit answers
const submitQuiz = async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user.userId;
    const { answers = [], time_spent = 0 } = req.body;
    // answers: [{ question_id, answer, time_ms? }]
    const answerMap = {};
    for (const entry of answers) {
        if (!entry || !entry.question_id)
            continue;
        // preserve time_ms if provided
        answerMap[entry.question_id] =
            typeof entry === 'object'
                ? { answer: entry.answer, time_ms: Number(entry.time_ms) || 0 }
                : entry.answer;
    }
    try {
        const submission = await assessmentService.submitQuiz(userId, quizId, answerMap, Number(time_spent) || 0);
        res.status(200).json({ message: "Quiz submitted successfully", submission });
    }
    catch (error) {
        console.error("Error submitting quiz:", error);
        res.status(500).json({ message: "Error submitting quiz" });
    }
};
exports.submitQuiz = submitQuiz;
// Owner-only submission review (includes solutions/explanations)
const getSubmissionById = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const userId = req.user.userId;
        const submission = await assessmentService.getSubmissionById(submissionId, userId);
        if (!submission)
            return res.status(404).json({ message: "Submission not found" });
        res.json(submission);
    }
    catch (error) {
        console.error("Error fetching quiz submission:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getSubmissionById = getSubmissionById;
// Student performance summary (per user, optional ?month=YYYY-MM)
const getUserQuizPerformance = async (req, res) => {
    try {
        const result = await assessmentService.getUserQuizPerformance({
            user_id: req.query.user_id || req.user.userId,
            month: req.query.month,
        });
        res.status(200).json(result);
    }
    catch (err) {
        console.error("Error fetching user performance:", err);
        res.status(500).json({ message: "Error fetching user performance" });
    }
};
exports.getUserQuizPerformance = getUserQuizPerformance;
// Admin performance summary (optional filters: class_id, subject, month)
const getAdminQuizPerformance = async (req, res) => {
    try {
        const result = await assessmentService.getAdminQuizPerformance(req.query);
        res.status(200).json(result);
    }
    catch (err) {
        console.error("Error fetching admin performance:", err);
        res.status(500).json({ message: "Error fetching admin performance" });
    }
};
exports.getAdminQuizPerformance = getAdminQuizPerformance;
const getTeacherQuizPerformance = async (req, res) => {
    try {
        const teacherId = req.user?.userId;
        const result = await assessmentService.getTeacherQuizPerformance(teacherId, req.query);
        res.status(200).json(result);
    }
    catch (err) {
        console.error("Error fetching teacher performance:", err);
        res
            .status(500)
            .json({ message: "Error fetching teacher performance" });
    }
};
exports.getTeacherQuizPerformance = getTeacherQuizPerformance;
// Aggregated leaderboards (UserPerformance)
const getLeaderboard = async (req, res) => {
    try {
        const { scope_type = 'global', scope_id, subject, window = 'monthly', window_key, metric = 'average_score', limit = 100 } = req.query;
        const result = await assessmentService.getLeaderboard({
            scope_type,
            scope_id,
            subject,
            window,
            window_key,
            metric,
            limit: Number(limit)
        });
        res.status(200).json(result);
    }
    catch (err) {
        console.error("Error leaderboard:", err);
        res.status(500).json({ message: "Error fetching leaderboard" });
    }
};
exports.getLeaderboard = getLeaderboard;
const getMyLeaderboardPosition = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { scope_type = 'global', scope_id, subject, window = 'monthly', window_key, metric = 'average_score' } = req.query;
        const result = await assessmentService.getMyLeaderboardPosition({
            userId, scope_type, scope_id, subject, window, window_key, metric
        });
        res.status(200).json(result);
    }
    catch (err) {
        console.error("Error leaderboard/me:", err);
        res.status(500).json({ message: "Error fetching my leaderboard position" });
    }
};
exports.getMyLeaderboardPosition = getMyLeaderboardPosition;
// First-attempt leaderboard for a quiz (optional filters: grade, classId)
const getFirstAttemptLeaderboard = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { limit, grade, classId } = req.query;
        if (!quizId)
            return res.status(422).json({ message: 'quizId param is required' });
        const rows = await assessmentService.getFirstAttemptLeaderboard({
            quizId,
            limit: Number(limit) || 50,
            grade: grade || undefined,
            classId: classId || undefined,
        });
        res.status(200).json({ count: rows.length, results: rows });
    }
    catch (err) {
        console.error("Error first-attempt leaderboard:", err);
        res.status(500).json({ message: "Error fetching first-attempt leaderboard" });
    }
};
exports.getFirstAttemptLeaderboard = getFirstAttemptLeaderboard;
// Update quiz (metadata only)
const updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, instructions, class_id, subject, grade, difficulty, time_limit_sec, question_count, matchmaking_enabled, async_enabled, is_active, } = req.body;
        const payload = {};
        if (title !== undefined) {
            payload.title = String(title).trim();
        }
        if (instructions !== undefined) {
            payload.instructions = String(instructions || "").trim();
        }
        if (subject !== undefined) {
            payload.subject = await (0, taxonomyResolver_1.resolveSubject)(subject);
        }
        if (grade !== undefined) {
            payload.grade = await (0, taxonomyResolver_1.resolveGrade)(grade);
        }
        if (class_id !== undefined) {
            payload.class_id =
                class_id && class_id !== "none" ? class_id : undefined;
        }
        if (difficulty !== undefined) {
            payload.difficulty = ["Easy", "Medium", "Hard"].includes(difficulty)
                ? difficulty
                : "Easy";
        }
        if (time_limit_sec !== undefined) {
            payload.time_limit_sec = Math.max(0, Number.isFinite(Number(time_limit_sec))
                ? Number(time_limit_sec)
                : 0);
        }
        if (question_count !== undefined) {
            payload.question_count = Math.max(0, Number.isFinite(Number(question_count))
                ? Number(question_count)
                : 0);
        }
        if (matchmaking_enabled !== undefined) {
            payload.matchmaking_enabled = !!matchmaking_enabled;
        }
        if (async_enabled !== undefined) {
            payload.async_enabled = !!async_enabled;
        }
        if (is_active !== undefined) {
            payload.is_active = !!is_active;
        }
        const quiz = await assessmentService.updateQuiz(id, payload);
        return res
            .status(200)
            .json({ message: "Quiz updated successfully", quiz });
    }
    catch (error) {
        console.error("Error updating quiz:", error);
        return res
            .status(500)
            .json({ message: error.message || "Error updating quiz" });
    }
};
exports.updateQuiz = updateQuiz;
const getTeacherUserPerformance = async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) {
            return res.status(400).json({ message: "user_id query param is required" });
        }
        const result = await assessmentService.getTeacherUserPerformance(user_id);
        res.status(200).json(result);
    }
    catch (err) {
        console.error("Error fetching teacher user performance:", err);
        res.status(500).json({ message: err.message || "Error fetching performance data" });
    }
};
exports.getTeacherUserPerformance = getTeacherUserPerformance;
