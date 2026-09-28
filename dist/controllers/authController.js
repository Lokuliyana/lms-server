"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const joi_1 = __importDefault(require("joi"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const authService_1 = require("../services/authService");
const env_1 = require("../config/env");
// Fix 1.1: Joi schemas with explicit .string() types on every input field
const forgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required()
});
const verifyOtpSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    otp: joi_1.default.string().required()
});
const registerStep1Schema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    phone: joi_1.default.string().required(),
    full_name: joi_1.default.string().required(),
    // Fix 7.1: Bcrypt DoS - Joi .max() cap on password length
    password: joi_1.default.string().min(6).max(72).required()
});
exports.authController = {
    async registerStep1(req, res, next) {
        try {
            const { error, value } = registerStep1Schema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message });
            }
            // Fix 1.5: Validate both email and phone uniqueness pre-insert
            const existingUser = await User_1.User.findOne({
                $or: [{ email: value.email }, { phone: value.phone }]
            });
            if (existingUser) {
                const field = existingUser.email === value.email ? 'Email' : 'Phone';
                return res.status(409).json({ success: false, message: `${field} already in use` });
            }
            const password_hash = await bcrypt_1.default.hash(value.password, 10);
            const result = await authService_1.authService.registerStep1({
                ...value,
                password_hash
            });
            res.status(200).json({ success: true, ...result });
        }
        catch (err) {
            next(err);
        }
    },
    async registerStep2(req, res, next) {
        try {
            const { error, value } = verifyOtpSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message });
            }
            const user = await authService_1.authService.registerStep2(value.email, value.otp);
            res.status(201).json({ success: true, user });
        }
        catch (err) {
            if (err.message === 'Invalid or expired OTP') {
                return res.status(400).json({ success: false, message: err.message });
            }
            next(err);
        }
    },
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const user = await User_1.User.findOne({ email }).lean();
            if (!user || !(await bcrypt_1.default.compare(password, user.password_hash))) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id }, env_1.config.jwtSecret, { expiresIn: '1d' });
            // Fix 5.1: HTTP-only cookies for session storage
            res.cookie('token', token, {
                httpOnly: true,
                secure: env_1.config.env === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });
            res.status(200).json({ success: true, user });
        }
        catch (err) {
            next(err);
        }
    },
    async forgotPassword(req, res, next) {
        try {
            const { error, value } = forgotPasswordSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message });
            }
            // Mock OTP logic
            res.status(200).json({ success: true, message: 'OTP sent if email exists' });
        }
        catch (err) {
            next(err);
        }
    },
    async logout(req, res, next) {
        try {
            res.clearCookie('token');
            res.status(200).json({ success: true, message: 'Logged out' });
        }
        catch (err) {
            next(err);
        }
    }
};
