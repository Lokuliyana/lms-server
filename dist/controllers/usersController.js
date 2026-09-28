"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersController = void 0;
const authService_1 = require("../services/authService");
const User_1 = require("../models/User");
const StudentProfile_1 = require("../models/StudentProfile");
const mongoose_1 = __importDefault(require("mongoose"));
exports.usersController = {
    async getAllUsers(req, res, next) {
        try {
            const users = await authService_1.authService.getAllUsers();
            res.status(200).json({ success: true, data: users });
        }
        catch (err) {
            next(err);
        }
    },
    async updateUserRole(req, res, next) {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const { id } = req.params;
            const { role_ids } = req.body; // Expecting array of role IDs
            const user = await User_1.User.findById(id).session(session);
            if (!user) {
                throw new Error('User not found');
            }
            user.role_ids = role_ids;
            await user.save({ session });
            // Fix 1.6: Orphaned/zombie profiles
            // Role-change transaction deletes the prior profile document atomically.
            const Role = mongoose_1.default.model('Role');
            const newRoles = await Role.find({ _id: { $in: role_ids } }).session(session);
            const isStudent = newRoles.some(r => r.name === 'Student');
            if (!isStudent) {
                await StudentProfile_1.StudentProfile.deleteOne({ user_id: user._id }).session(session);
            }
            await session.commitTransaction();
            res.status(200).json({ success: true, message: 'User roles updated' });
        }
        catch (err) {
            await session.abortTransaction();
            next(err);
        }
        finally {
            session.endSession();
        }
    }
};
