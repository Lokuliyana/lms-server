import { Router } from 'express';
import * as classApplicationController from '../controllers/classApplicationController';
import { authenticate, requirePermission } from '../middlewares/auth';

const router = Router();

router.post('/', authenticate, classApplicationController.applyForClass);
router.get('/', requirePermission('classes.read'), classApplicationController.getApplications);
router.post('/:id/handle', requirePermission('classes.update'), classApplicationController.handleApplication);

export default router;
