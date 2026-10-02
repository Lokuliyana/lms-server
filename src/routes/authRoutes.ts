import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authRateLimiter, authAccountRateLimiter } from '../middlewares/rateLimiter';
import { authenticate, requirePermission } from '../middlewares/auth';

const router = Router();

// Rate limiting keyed by IP and account
router.post('/register', authRateLimiter, authController.registerStep1);
router.post('/register/step1', authRateLimiter, authController.registerStep1);
router.post('/verify-otp', authAccountRateLimiter, authController.registerStep2);
router.post('/register/step2', authAccountRateLimiter, authController.registerStep2);
router.post('/login', authAccountRateLimiter, authController.login);
router.post('/forgot-password', authAccountRateLimiter, authController.forgotPassword);
router.post('/reset-password', authAccountRateLimiter, authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

// New profile/user endpoints
router.get('/user/:id', authenticate, authController.getUserById);
router.post('/admin/reset-password/:id', requirePermission('users.update'), authController.adminResetPassword);
router.post('/change-password', authenticate, authController.changePassword);
router.put('/edit-user/:id', authenticate, authController.editUser);

export const authRoutes = router;
