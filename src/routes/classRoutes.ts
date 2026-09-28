import { Router } from 'express';
import * as classController from '../controllers/classController';
import { requirePermission, authenticate } from '../middlewares/auth';

const router = Router();

router.post('/', requirePermission('classes.create'), classController.createClass);
router.get('/', classController.getClasses);
router.get('/enrolled', authenticate, classController.getEnrolledClasses);
router.get('/:id', classController.getClassById);
router.put('/:id', requirePermission('classes.update'), classController.updateClass);
router.delete('/:id', requirePermission('classes.delete'), classController.deleteClass);
router.get('/:id/students', requirePermission('classes.read'), classController.getEnrolledStudents);

export default router;
