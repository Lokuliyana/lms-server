"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
// Fix 7.3: Missing rate limiting -> Server-side rate limiting on both endpoints
router.post('/register/step1', rateLimiter_1.authRateLimiter, authController_1.authController.registerStep1);
router.post('/register/step2', rateLimiter_1.authRateLimiter, authController_1.authController.registerStep2);
router.post('/login', rateLimiter_1.authRateLimiter, authController_1.authController.login);
router.post('/forgot-password', rateLimiter_1.authRateLimiter, authController_1.authController.forgotPassword);
router.post('/logout', authController_1.authController.logout);
exports.authRoutes = router;
