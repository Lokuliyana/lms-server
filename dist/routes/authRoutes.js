"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Rate limiting keyed by IP and account
router.post('/register', rateLimiter_1.authRateLimiter, authController_1.authController.registerStep1);
router.post('/register/step1', rateLimiter_1.authRateLimiter, authController_1.authController.registerStep1);
router.post('/verify-otp', rateLimiter_1.authAccountRateLimiter, authController_1.authController.registerStep2);
router.post('/register/step2', rateLimiter_1.authAccountRateLimiter, authController_1.authController.registerStep2);
router.post('/login', rateLimiter_1.authAccountRateLimiter, authController_1.authController.login);
router.post('/forgot-password', rateLimiter_1.authAccountRateLimiter, authController_1.authController.forgotPassword);
router.post('/reset-password', rateLimiter_1.authAccountRateLimiter, authController_1.authController.resetPassword);
router.post('/logout', authController_1.authController.logout);
router.get('/profile', auth_1.authenticate, authController_1.authController.getProfile);
router.put('/profile', auth_1.authenticate, authController_1.authController.updateProfile);
// New profile/user endpoints
router.get('/user/:id', auth_1.authenticate, authController_1.authController.getUserById);
router.post('/admin/reset-password/:id', (0, auth_1.requirePermission)('users.update'), authController_1.authController.adminResetPassword);
router.post('/change-password', auth_1.authenticate, authController_1.authController.changePassword);
router.put('/edit-user/:id', auth_1.authenticate, authController_1.authController.editUser);
exports.authRoutes = router;
