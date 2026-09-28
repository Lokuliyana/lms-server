import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { authService } from '../services/authService';
import { config } from '../config/env';
import mongoose from 'mongoose';

// Fix 1.1: Joi schemas with explicit .string() types on every input field
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().required()
});

const registerStep1Schema = Joi.object({
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  full_name: Joi.string().required(),
  // Fix 7.1: Bcrypt DoS - Joi .max() cap on password length
  password: Joi.string().min(6).max(72).required()
});

export const authController = {
  async registerStep1(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = registerStep1Schema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }

      // Fix 1.5: Validate both email and phone uniqueness pre-insert
      const existingUser = await User.findOne({
        $or: [{ email: value.email }, { phone: value.phone }]
      });

      if (existingUser) {
        const field = existingUser.email === value.email ? 'Email' : 'Phone';
        return res.status(409).json({ success: false, message: `${field} already in use` });
      }

      const password_hash = await bcrypt.hash(value.password, 10);
      
      const result = await authService.registerStep1({
        ...value,
        password_hash
      });

      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async registerStep2(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = verifyOtpSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }

      const user = await authService.registerStep2(value.email, value.otp);
      res.status(201).json({ success: true, user });
    } catch (err: any) {
      if (err.message === 'Invalid or expired OTP') {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).lean();
      
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '1d' });

      // Fix 5.1: HTTP-only cookies for session storage
      res.cookie('token', token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      res.status(200).json({ success: true, user });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = forgotPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }

      // Mock OTP logic
      res.status(200).json({ success: true, message: 'OTP sent if email exists' });
    } catch (err) {
      next(err);
    }
  },
  
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('token');
      res.status(200).json({ success: true, message: 'Logged out' });
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }
      
      const user = await User.findById(req.user._id).select('-password_hash');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // Populate role names for the frontend
      const Role = mongoose.model('Role');
      const roles = await Role.find({ _id: { $in: user.role_ids } });
      const roleNames = roles.map(r => r.name);
      
      // We will attach `role` as a string for backward compatibility
      const legacyRole = roleNames.includes('admin') ? 'admin' 
                       : roleNames.includes('teacher') ? 'teacher' 
                       : roleNames.includes('moderator') ? 'moderator'
                       : 'student';
      
      // Also fetch permissions to support frontend `usePermission`
      const RolePermission = mongoose.model('RolePermission');
      const Permission = mongoose.model('Permission');
      const rolePerms = await RolePermission.find({ role_id: { $in: user.role_ids } });
      const perms = await Permission.find({ _id: { $in: rolePerms.map(rp => rp.permission_id) } });
      
      const permissions = perms.map(p => p.key);

      const userObj = { ...user.toObject(), role: legacyRole, permissions };
      res.status(200).json({ success: true, data: userObj });
    } catch (err) {
      next(err);
    }
  }, // this was missing the closing brace of getProfile

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id).lean();
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      
      const Role = mongoose.model('Role');
      const roles = await Role.find({ _id: { $in: user.role_ids } });
      const roleNames = roles.map(r => r.name.toLowerCase());
      
      let role = 'student';
      if (roleNames.includes('admin')) role = 'admin';
      else if (roleNames.includes('teacher')) role = 'teacher';
      else if (roleNames.includes('moderator')) role = 'moderator';

      let profile = {};
      const StudentProfile = mongoose.model('StudentProfile');
      profile = await StudentProfile.findOne({ user_id: user._id }).lean() || {};

      res.status(200).json({ success: true, data: { ...user, ...profile, role } });
    } catch (err) {
      next(err);
    }
  },

  async adminResetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { newPassword } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      
      user.password_hash = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
      
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (!(await bcrypt.compare(oldPassword, user.password_hash))) {
        return res.status(400).json({ success: false, message: 'Invalid current password' });
      }

      user.password_hash = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.status(200).json({ success: true, message: 'Password changed successful' });
    } catch (err) {
      next(err);
    }
  },

  async editUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { full_name, phone, school, grade, birth_date, ol_year, al_year, bio, qualifications } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      
      if (phone) {
        user.phone = phone;
        await user.save();
      }

      const StudentProfile = mongoose.model('StudentProfile');
      await StudentProfile.findOneAndUpdate(
        { user_id: user._id },
        { full_name, school, grade, birth_date, ol_year, al_year, bio, qualifications },
        { upsert: true }
      );

      res.status(200).json({ success: true, message: 'Profile updated' });
    } catch (err) {
      next(err);
    }
  }
};
