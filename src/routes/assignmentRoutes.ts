import { Router } from 'express';
import { upsertSubmission } from '../controllers/assignmentController';
import { requirePermission } from '../middlewares/auth';

const router = Router();

// Fix 2.3: Add requirePermission("assignments.create") to upsertSubmission
router.post('/:assignmentId/submit', requirePermission('assignments.create'), upsertSubmission);

export default router;
