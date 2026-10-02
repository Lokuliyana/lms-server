"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const examController_1 = require("../controllers/examController");
const router = (0, express_1.Router)();
// Student access to own marks
router.get('/my', auth_1.authenticate, examController_1.getMyExamResults);
// General exam access (students see published; staff see all)
router.get('/', auth_1.authenticate, examController_1.getExams);
router.get('/:id', auth_1.authenticate, examController_1.getExamById);
// Staff exam & mark management
router.post('/', auth_1.authenticate, (0, auth_1.requirePermission)('grades.record'), examController_1.createExam);
router.put('/:id', auth_1.authenticate, (0, auth_1.requirePermission)('grades.record'), examController_1.updateExam);
router.delete('/:id', auth_1.authenticate, (0, auth_1.requirePermission)('grades.record'), examController_1.deleteExam);
router.post('/:id/marks', auth_1.authenticate, (0, auth_1.requirePermission)('grades.record'), examController_1.recordBulkExamResults);
router.put('/:id/marks', auth_1.authenticate, (0, auth_1.requirePermission)('grades.record'), examController_1.recordBulkExamResults);
exports.default = router;
