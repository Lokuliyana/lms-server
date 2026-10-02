import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/User';
import { RolePermission } from '../models/RolePermission';
import { Permission } from '../models/Permission';

export interface IAuthUser {
  userId: string;
  _id: string;
  email: string;
  roles: any[];
  role_ids?: any[];
  permissions: string[];
  token?: string;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: IAuthUser | null;
      token?: string;
    }
  }
}

/**
 * Hydrates permissions for given role IDs using indexed queries
 */
export async function getPermissionsForRoles(roleIds: any[]): Promise<string[]> {
  if (!roleIds || roleIds.length === 0) return [];
  const rolePerms = await RolePermission.find({ role_id: { $in: roleIds } }).select('permission_id').lean();
  if (rolePerms.length === 0) return [];
  const permIds = rolePerms.map((rp: any) => rp.permission_id);
  const perms = await Permission.find({ _id: { $in: permIds } }).select('key').lean();
  return perms.map((p: any) => p.key);
}

function extractToken(req: Request): string | null {
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
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      req.token = undefined;
      return next();
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
    const user = await User.findById(decoded.id).select('-password_hash').lean();
    if (!user) {
      req.user = null;
      req.token = undefined;
      return next();
    }

    delete (user as any).password_hash;
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
  } catch (err) {
    req.user = null;
    req.token = undefined;
    next();
  }
};

/**
 * requirePermission middleware:
 * Enforces authentication and checks whether user has the dynamic permission key.
 * Hydrates req.user.permissions from live database lookup on each request.
 */
export const requirePermission = (requiredKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
      }

      const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
      const user = await User.findById(decoded.id).select('-password_hash').lean();
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      delete (user as any).password_hash;
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
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  };
};

export const authenticate = requirePermission();
