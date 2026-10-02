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
const express_1 = require("express");
const classController = __importStar(require("../controllers/classController"));
const assignmentController = __importStar(require("../controllers/assignmentController"));
const classApplicationController = __importStar(require("../controllers/classApplicationController"));
const recordingController = __importStar(require("../controllers/recordingController"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Core Class CRUD
router.post('/', (0, auth_1.requirePermission)('classes.create'), classController.createClass);
router.post('/create', (0, auth_1.requirePermission)('classes.create'), classController.createClass);
router.get('/', auth_1.optionalAuth, classController.getClasses);
router.get('/enrolled', auth_1.authenticate, classController.getEnrolledClasses);
router.get('/students/all', (0, auth_1.requirePermission)('classes.read'), classController.getAllClassesWithStudents);
// Class application aliases supported by client
router.post('/apply', (0, auth_1.requirePermission)('classes.apply'), classApplicationController.applyForClass);
router.get('/applications', (0, auth_1.requirePermission)('classes.read'), classApplicationController.getApplications);
router.post('/handle', (0, auth_1.requirePermission)('classes.update'), (req, res) => {
    req.params.id = req.body.application_Id || req.body.applicationId;
    return classApplicationController.handleApplication(req, res);
});
router.post('/give-access', (0, auth_1.requirePermission)('classes.update'), async (req, res) => {
    return res.json({ success: true, message: 'Access granted' });
});
// Assignment direct and nested routes called under /classes/assignments/... and /classes/submissions
router.get('/submissions', (0, auth_1.requirePermission)('assignments.manage'), assignmentController.getAllSubmissions);
router.get('/assignments/:assignmentId', auth_1.optionalAuth, assignmentController.getAssignmentById);
router.put('/assignments/:assignmentId', (0, auth_1.requirePermission)('assignments.manage'), assignmentController.updateAssignment);
router.delete('/assignments/:assignmentId', (0, auth_1.requirePermission)('assignments.manage'), assignmentController.deleteAssignment);
router.post('/assignments/:assignmentId/submissions', (0, auth_1.requirePermission)('assignments.submit'), assignmentController.upsertSubmission);
router.get('/assignments/:assignmentId/submissions', (0, auth_1.requirePermission)('assignments.manage'), assignmentController.listSubmissions);
router.get('/assignments/:assignmentId/my-submission', auth_1.authenticate, assignmentController.getMySubmission);
router.put('/assignments/:assignmentId/submissions/:submissionId/grade', (0, auth_1.requirePermission)('assignments.manage'), assignmentController.gradeSubmission);
router.get('/:id', auth_1.optionalAuth, classController.getClassById);
router.put('/:id', (0, auth_1.requirePermission)('classes.update'), classController.updateClass);
router.delete('/:id', (0, auth_1.requirePermission)('classes.delete'), classController.deleteClass);
router.get('/:id/students', (0, auth_1.requirePermission)('classes.read'), classController.getEnrolledStudents);
// Assignment routes under a specific class
router.post('/:id/assignments', (0, auth_1.requirePermission)('assignments.manage'), assignmentController.createAssignment);
router.get('/:id/assignments', auth_1.authenticate, assignmentController.getAssignmentsByClass);
// Recordings route under a specific class
router.get('/:id/recordings', auth_1.optionalAuth, recordingController.getRecordingsByClass);
exports.default = router;
