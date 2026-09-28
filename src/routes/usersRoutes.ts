import { Router } from 'express';
import { usersController } from '../controllers/usersController';
import { requirePermission } from '../middlewares/auth';

const router = Router();

// Fix 1.2: Privilege escalation — authorization for editing users only checks requirePermission("users.update")
router.get('/', requirePermission('users.read'), usersController.getAllUsers);
router.put('/:id/roles', requirePermission('users.update'), usersController.updateUserRole);

export const usersRoutes = router;
