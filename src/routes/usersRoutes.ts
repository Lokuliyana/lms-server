import { Router } from 'express';
import { usersController } from '../controllers/usersController';
import { authController } from '../controllers/authController';
import { authenticate, optionalAuth, requirePermission } from '../middlewares/auth';

const router = Router();

// Fix 1.2: Privilege escalation — authorization for editing users only checks requirePermission("users.update")
router.get('/', requirePermission('users.read'), usersController.getAllUsers);
router.post('/', requirePermission('users.create'), usersController.createUser);
router.get('/:id', optionalAuth, authController.getUserById);
router.put('/:id', authenticate, authController.editUser);
router.put('/:id/roles', requirePermission('users.update'), usersController.updateUserRole);

export const usersRoutes = router;
