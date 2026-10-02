"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authAccountRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
});
// Rate limiting keyed by IP and account to prevent credential and OTP brute-force
exports.authAccountRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    validate: false,
    keyGenerator: (req) => {
        const account = (req.body?.email || req.body?.identifier || '').toLowerCase().trim();
        return `${req.ip}_${account}`;
    },
    message: {
        success: false,
        message: 'Too many attempts for this account or IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
