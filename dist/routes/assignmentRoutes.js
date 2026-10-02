"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assignmentController_1 = require("../controllers/assignmentController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Submissions general list
router.get('/submissions', (0, auth_1.requirePermission)('assignments.manage'), assignmentController_1.getAllSubmissions);
// Single assignment CRUD
router.post('/', (0, auth_1.requirePermission)('assignments.manage'), assignmentController_1.createAssignment);
router.get('/:assignmentId', auth_1.optionalAuth, assignmentController_1.getAssignmentById);
router.put('/:assignmentId', (0, auth_1.requirePermission)('assignments.manage'), assignmentController_1.updateAssignment);
router.delete('/:assignmentId', (0, auth_1.requirePermission)('assignments.manage'), assignmentController_1.deleteAssignment);
router.put('/:assignmentId/publish', (0, auth_1.requirePermission)('assignments.manage'), assignmentController_1.updateAssignment);
// Student assignment submission gated by assignments.submit
router.post('/:assignmentId/submit', (0, auth_1.requirePermission)('assignments.submit'), assignmentController_1.upsertSubmission);
router.post('/:assignmentId/submissions', (0, auth_1.requirePermission)('assignments.submit'), assignmentController_1.upsertSubmission);
router.get('/:assignmentId/my-submission', auth_1.authenticate, assignmentController_1.getMySubmission);
router.get('/:assignmentId/submissions/my', auth_1.authenticate, assignmentController_1.getMySubmission);
router.get('/:assignmentId/submissions', (0, auth_1.requirePermission)('assignments.manage'), assignmentController_1.listSubmissions);
router.put('/:assignmentId/submissions/:submissionId/grade', (0, auth_1.requirePermission)('assignments.manage'), assignmentController_1.gradeSubmission);
router.put('/submissions/:submissionId/grade', (0, auth_1.requirePermission)('assignments.manage'), assignmentController_1.gradeSubmission);
exports.default = router;
