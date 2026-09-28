import { OTP } from '../models/OTP';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import mongoose from 'mongoose';

export const authService = {
  // Step 1: Send OTP and cache user info
  async registerStep1(data: { email: string; phone: string; full_name: string; password_hash: string }) {
    // Generate simple 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Cache info in OTP collection
    await OTP.create({
      email: data.email,
      phone: data.phone,
      full_name: data.full_name,
      password_hash: data.password_hash,
      otp: otpCode
    });

    // Send OTP via SMS/Email (mocked for now)
    console.log(`Sending OTP ${otpCode} to ${data.email}`);
    return { message: 'OTP sent successfully' };
  },

  // Step 2: Verify OTP and create user
  async registerStep2(email: string, otp: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const cached = await OTP.findOne({ email, otp }).session(session);
      if (!cached) {
        throw new Error('Invalid or expired OTP');
      }

      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ email: cached.email }, { phone: cached.phone }] 
      }).session(session);
      
      if (existingUser) {
        throw new Error('Email or phone already in use');
      }

      // Create user
      const user = new User({
        email: cached.email,
        phone: cached.phone,
        password_hash: cached.password_hash,
        is_verified: true // Fix 1.3: Set is_verified = true inside transaction
      });
      await user.save({ session });

      // Create StudentProfile by default
      const profile = new StudentProfile({
        user_id: user._id,
        full_name: cached.full_name,
      });
      await profile.save({ session });

      // Cleanup OTP
      await OTP.deleteOne({ _id: cached._id }).session(session);

      await session.commitTransaction();
      return user;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Fix 1.7: Inefficient data fetching -> Mongoose Aggregation Pipeline
  async getAllUsers() {
    return User.aggregate([
      {
        $lookup: {
          from: 'studentprofiles',
          localField: '_id',
          foreignField: 'user_id',
          as: 'profile'
        }
      },
      {
        $unwind: { path: '$profile', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          password_hash: 0 // Ensure password_hash is stripped
        }
      },
      {
        $addFields: {
          full_name: '$profile.full_name',
          avatar_url: '$profile.avatar_url'
        }
      },
      {
        $project: {
          profile: 0
        }
      }
    ]);
  }
};
