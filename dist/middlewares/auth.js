"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.requirePermission = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const User_1 = require("../models/User");
const RolePermission_1 = require("../models/RolePermission");
const Permission_1 = require("../models/Permission");
// Single middleware that optionally checks permissions
const requirePermission = (requiredKey) => {
    return async (req, res, next) => {
        try {
            // 1. Verify token
            let token = req.cookies?.token;
            // Fallback for header if needed, but primarily relying on http-only cookies
            if (!token && req.headers.authorization?.startsWith('Bearer ')) {
                token = req.headers.authorization.split(' ')[1];
            }
            if (!token) {
                return res.status(401).json({ success: false, message: 'Not authorized, no token' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
            // 2. Fetch user and roles
            const user = await User_1.User.findById(decoded.id).lean();
            if (!user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            req.user = user;
            // 3. If no specific permission required, we're done
            if (!requiredKey) {
                return next();
            }
            // 4. Check permission
            const roleIds = user.role_ids || [];
            if (roleIds.length === 0) {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }
            // Look up the permission ID
            const perm = await Permission_1.Permission.findOne({ key: requiredKey }).lean();
            if (!perm) {
                return res.status(403).json({ success: false, message: 'Invalid permission key' });
            }
            // Check if any of the user's roles have this permission
            const hasPerm = await RolePermission_1.RolePermission.exists({
                role_id: { $in: roleIds },
                permission_id: perm._id
            });
            if (!hasPerm) {
                return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
            }
            next();
        }
        catch (error) {
            console.error(error);
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    };
};
exports.requirePermission = requirePermission;
exports.authenticate = (0, exports.requirePermission)(); // Just basic auth
