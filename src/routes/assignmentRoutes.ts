import { Router } from 'express';
import {
  upsertSubmission,
  getMySubmission,
  listSubmissions,
  gradeSubmission,
  createAssignment,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAllSubmissions,
} from '../controllers/assignmentController';
import { requirePermission, authenticate, optionalAuth } from '../middlewares/auth';

const router = Router();

// Submissions general list
router.get('/submissions', requirePermission('assignments.manage'), getAllSubmissions);

// Single assignment CRUD
router.post('/', requirePermission('assignments.manage'), createAssignment);
router.get('/:assignmentId', optionalAuth, getAssignmentById);
router.put('/:assignmentId', requirePermission('assignments.manage'), updateAssignment);
router.delete('/:assignmentId', requirePermission('assignments.manage'), deleteAssignment);
router.put('/:assignmentId/publish', requirePermission('assignments.manage'), updateAssignment);

// Student assignment submission gated by assignments.submit
router.post('/:assignmentId/submit', requirePermission('assignments.submit'), upsertSubmission);
router.post('/:assignmentId/submissions', requirePermission('assignments.submit'), upsertSubmission);
router.get('/:assignmentId/my-submission', authenticate, getMySubmission);
router.get('/:assignmentId/submissions/my', authenticate, getMySubmission);
router.get('/:assignmentId/submissions', requirePermission('assignments.manage'), listSubmissions);
router.put('/:assignmentId/submissions/:submissionId/grade', requirePermission('assignments.manage'), gradeSubmission);
router.put('/submissions/:submissionId/grade', requirePermission('assignments.manage'), gradeSubmission);

export default router;
