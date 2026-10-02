import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth';
import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  recordBulkExamResults,
  getMyExamResults,
} from '../controllers/examController';

const router = Router();

// Student access to own marks
router.get('/my', authenticate, getMyExamResults);

// General exam access (students see published; staff see all)
router.get('/', authenticate, getExams);
router.get('/:id', authenticate, getExamById);

// Staff exam & mark management
router.post('/', authenticate, requirePermission('grades.record'), createExam);
router.put('/:id', authenticate, requirePermission('grades.record'), updateExam);
router.delete('/:id', authenticate, requirePermission('grades.record'), deleteExam);
router.post('/:id/marks', authenticate, requirePermission('grades.record'), recordBulkExamResults);
router.put('/:id/marks', authenticate, requirePermission('grades.record'), recordBulkExamResults);

export default router;
