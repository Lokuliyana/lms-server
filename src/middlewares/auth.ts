import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/User';
import { RolePermission } from '../models/RolePermission';
import { Permission } from '../models/Permission';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Single middleware that optionally checks permissions
export const requirePermission = (requiredKey?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
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

      const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
      
      // 2. Fetch user and roles
      const user = await User.findById(decoded.id).lean();
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
      const perm = await Permission.findOne({ key: requiredKey }).lean();
      if (!perm) {
        return res.status(403).json({ success: false, message: 'Invalid permission key' });
      }

      // Check if any of the user's roles have this permission
      const hasPerm = await RolePermission.exists({
        role_id: { $in: roleIds },
        permission_id: perm._id
      });

      if (!hasPerm) {
        return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  };
};

export const authenticate = requirePermission(); // Just basic auth
