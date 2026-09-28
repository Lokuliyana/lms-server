import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import mongoose from 'mongoose';

export const usersController = {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await authService.getAllUsers();
      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id } = req.params;
      const { role_ids } = req.body; // Expecting array of role IDs
      
      const user = await User.findById(id).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      user.role_ids = role_ids;
      await user.save({ session });

      // Fix 1.6: Orphaned/zombie profiles
      // Role-change transaction deletes the prior profile document atomically.
      const Role = mongoose.model('Role');
      const newRoles = await Role.find({ _id: { $in: role_ids } }).session(session);
      const isStudent = newRoles.some(r => r.name === 'Student');

      if (!isStudent) {
        await StudentProfile.deleteOne({ user_id: user._id }).session(session);
      }

      await session.commitTransaction();
      res.status(200).json({ success: true, message: 'User roles updated' });
    } catch (err) {
      await session.abortTransaction();
      next(err);
    } finally {
      session.endSession();
    }
  }
};
