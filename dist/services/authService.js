"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const OTP_1 = require("../models/OTP");
const User_1 = require("../models/User");
const StudentProfile_1 = require("../models/StudentProfile");
const mongoose_1 = __importDefault(require("mongoose"));
exports.authService = {
    // Step 1: Send OTP and cache user info
    async registerStep1(data) {
        // Generate simple 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Cache info in OTP collection
        await OTP_1.OTP.create({
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
    async registerStep2(email, otp) {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const cached = await OTP_1.OTP.findOne({ email, otp }).session(session);
            if (!cached) {
                throw new Error('Invalid or expired OTP');
            }
            // Check if user already exists
            const existingUser = await User_1.User.findOne({
                $or: [{ email: cached.email }, { phone: cached.phone }]
            }).session(session);
            if (existingUser) {
                throw new Error('Email or phone already in use');
            }
            // Create user
            const user = new User_1.User({
                email: cached.email,
                phone: cached.phone,
                password_hash: cached.password_hash,
                is_verified: true // Fix 1.3: Set is_verified = true inside transaction
            });
            await user.save({ session });
            // Create StudentProfile by default
            const profile = new StudentProfile_1.StudentProfile({
                user_id: user._id,
                full_name: cached.full_name,
            });
            await profile.save({ session });
            // Cleanup OTP
            await OTP_1.OTP.deleteOne({ _id: cached._id }).session(session);
            await session.commitTransaction();
            return user;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            session.endSession();
        }
    },
    // Fix 1.7: Inefficient data fetching -> Mongoose Aggregation Pipeline
    async getAllUsers() {
        return User_1.User.aggregate([
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
