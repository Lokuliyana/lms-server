"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quizController_1 = require("../controllers/quizController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Fix 2.2: Add requirePermission("quizzes.create") to submitQuiz
router.post('/:quizId/submit', (0, auth_1.requirePermission)('quizzes.create'), quizController_1.submitQuiz);
exports.default = router;
router.get('/all', (req, res) => res.json([]));
