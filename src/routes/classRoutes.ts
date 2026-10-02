import { Router } from 'express';
import * as classController from '../controllers/classController';
import * as assignmentController from '../controllers/assignmentController';
import * as classApplicationController from '../controllers/classApplicationController';
import * as recordingController from '../controllers/recordingController';
import { requirePermission, authenticate, optionalAuth } from '../middlewares/auth';

const router = Router();

// Core Class CRUD
router.post('/', requirePermission('classes.create'), classController.createClass);
router.post('/create', requirePermission('classes.create'), classController.createClass);
router.get('/', optionalAuth, classController.getClasses);
router.get('/enrolled', authenticate, classController.getEnrolledClasses);
router.get('/students/all', requirePermission('classes.read'), classController.getAllClassesWithStudents);

// Class application aliases supported by client
router.post('/apply', requirePermission('classes.apply'), classApplicationController.applyForClass);
router.get('/applications', requirePermission('classes.read'), classApplicationController.getApplications);
router.post('/handle', requirePermission('classes.update'), (req, res) => {
  req.params.id = req.body.application_Id || req.body.applicationId;
  return classApplicationController.handleApplication(req, res);
});
router.post('/give-access', requirePermission('classes.update'), async (req, res) => {
  return res.json({ success: true, message: 'Access granted' });
});

// Assignment direct and nested routes called under /classes/assignments/... and /classes/submissions
router.get('/submissions', requirePermission('assignments.manage'), assignmentController.getAllSubmissions);
router.get('/assignments/:assignmentId', optionalAuth, assignmentController.getAssignmentById);
router.put('/assignments/:assignmentId', requirePermission('assignments.manage'), assignmentController.updateAssignment);
router.delete('/assignments/:assignmentId', requirePermission('assignments.manage'), assignmentController.deleteAssignment);
router.post('/assignments/:assignmentId/submissions', requirePermission('assignments.submit'), assignmentController.upsertSubmission);
router.get('/assignments/:assignmentId/submissions', requirePermission('assignments.manage'), assignmentController.listSubmissions);
router.get('/assignments/:assignmentId/my-submission', authenticate, assignmentController.getMySubmission);
router.put('/assignments/:assignmentId/submissions/:submissionId/grade', requirePermission('assignments.manage'), assignmentController.gradeSubmission);

router.get('/:id', optionalAuth, classController.getClassById);
router.put('/:id', requirePermission('classes.update'), classController.updateClass);
router.delete('/:id', requirePermission('classes.delete'), classController.deleteClass);
router.get('/:id/students', requirePermission('classes.read'), classController.getEnrolledStudents);

// Assignment routes under a specific class
router.post('/:id/assignments', requirePermission('assignments.manage'), assignmentController.createAssignment);
router.get('/:id/assignments', authenticate, assignmentController.getAssignmentsByClass);

// Recordings route under a specific class
router.get('/:id/recordings', optionalAuth, recordingController.getRecordingsByClass);

export default router;

