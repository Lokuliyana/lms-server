"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.requirePermission = exports.optionalAuth = void 0;
exports.getPermissionsForRoles = getPermissionsForRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const User_1 = require("../models/User");
const RolePermission_1 = require("../models/RolePermission");
const Permission_1 = require("../models/Permission");
/**
 * Hydrates permissions for given role IDs using indexed queries
 */
async function getPermissionsForRoles(roleIds) {
    if (!roleIds || roleIds.length === 0)
        return [];
    const rolePerms = await RolePermission_1.RolePermission.find({ role_id: { $in: roleIds } }).select('permission_id').lean();
    if (rolePerms.length === 0)
        return [];
    const permIds = rolePerms.map((rp) => rp.permission_id);
    const perms = await Permission_1.Permission.find({ _id: { $in: permIds } }).select('key').lean();
    return perms.map((p) => p.key);
}
function extractToken(req) {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    return token || null;
}
/**
 * optionalAuth middleware:
 * Populates req.user with user and hydrated live permissions if token is valid.
 * Does not reject guest/unauthenticated requests (sets req.user = null).
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            req.user = null;
            req.token = undefined;
            return next();
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        const user = await User_1.User.findById(decoded.id).select('-password_hash').lean();
        if (!user) {
            req.user = null;
            req.token = undefined;
            return next();
        }
        delete user.password_hash;
        const permissions = await getPermissionsForRoles(user.role_ids || []);
        req.token = token;
        req.user = {
            ...user,
            userId: user._id.toString(),
            _id: user._id.toString(),
            roles: user.role_ids || [],
            permissions,
            token
        };
        next();
    }
    catch (err) {
        req.user = null;
        req.token = undefined;
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * requirePermission middleware:
 * Enforces authentication and checks whether user has the dynamic permission key.
 * Hydrates req.user.permissions from live database lookup on each request.
 */
const requirePermission = (requiredKey) => {
    return async (req, res, next) => {
        try {
            const token = extractToken(req);
            if (!token) {
                return res.status(401).json({ success: false, message: 'Not authorized, no token' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
            const user = await User_1.User.findById(decoded.id).select('-password_hash').lean();
            if (!user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            delete user.password_hash;
            const roleIds = user.role_ids || [];
            const permissions = await getPermissionsForRoles(roleIds);
            req.token = token;
            req.user = {
                ...user,
                userId: user._id.toString(),
                _id: user._id.toString(),
                roles: user.role_ids || [],
                permissions,
                token
            };
            if (!requiredKey) {
                return next();
            }
            if (!permissions.includes(requiredKey)) {
                return res.status(403).json({
                    success: false,
                    message: `Forbidden: Missing required permission '${requiredKey}'`
                });
            }
            next();
        }
        catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    };
};
exports.requirePermission = requirePermission;
exports.authenticate = (0, exports.requirePermission)();
