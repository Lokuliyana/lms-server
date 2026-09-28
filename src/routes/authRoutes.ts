import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Fix 7.3: Missing rate limiting -> Server-side rate limiting on both endpoints
router.post('/register/step1', authRateLimiter, authController.registerStep1);
router.post('/register/step2', authRateLimiter, authController.registerStep2);
router.post('/login', authRateLimiter, authController.login);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/logout', authController.logout);
router.get('/profile', authenticate, authController.getProfile);

// New profile/user endpoints
router.get('/user/:id', authenticate, authController.getUserById);
router.post('/admin/reset-password/:id', authenticate, authController.adminResetPassword);
router.post('/change-password', authenticate, authController.changePassword);
router.put('/edit-user/:id', authenticate, authController.editUser);

export const authRoutes = router;
