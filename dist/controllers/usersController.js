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
            const page = req.query.page ? parseInt(req.query.page, 10) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
            const search = typeof req.query.search === 'string' ? req.query.search : undefined;
            const role = typeof req.query.role === 'string' ? req.query.role : undefined;
            const result = await authService_1.authService.getAllUsers({ page, limit, search, role });
            res.status(200).json({
                success: true,
                data: result.users,
                users: result.users,
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
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
            const isStudent = newRoles.some((r) => r.name === 'Student');
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
    },
    async createUser(req, res, next) {
        try {
            let { first_name, last_name, full_name, email, phone, password, role_ids, role } = req.body;
            if (full_name && !first_name && !last_name) {
                const parts = full_name.trim().split(' ');
                first_name = parts[0];
                last_name = parts.slice(1).join(' ') || '-';
            }
            if (role && !role_ids) {
                const Role = mongoose_1.default.model('Role');
                const roleDoc = await Role.findOne({ name: { $regex: new RegExp(`^${role}$`, 'i') } });
                if (roleDoc) {
                    role_ids = [roleDoc._id];
                }
                else {
                    res.status(400).json({ success: false, message: 'Invalid role specified' });
                    return;
                }
            }
            if (!email || !password || !first_name || !last_name || !phone || !role_ids) {
                res.status(400).json({ success: false, message: 'Missing required fields' });
                return;
            }
            const existingUser = await User_1.User.findOne({ $or: [{ email }, { phone }] });
            if (existingUser) {
                res.status(400).json({ success: false, message: 'Email or phone already in use' });
                return;
            }
            const bcrypt = require('bcrypt');
            const password_hash = await bcrypt.hash(password, 10);
            const user = new User_1.User({
                first_name,
                last_name,
                email,
                phone,
                password_hash,
                role_ids,
                is_verified: true
            });
            await user.save();
            const Role = mongoose_1.default.model('Role');
            const newRoles = await Role.find({ _id: { $in: role_ids } });
            const isStudent = newRoles.some((r) => r.name.toLowerCase() === 'student');
            if (isStudent) {
                const StudentProfile = mongoose_1.default.model('StudentProfile');
                await StudentProfile.create({
                    user_id: user._id,
                    full_name: `${first_name} ${last_name}`.trim(),
                    school: req.body.school,
                    grade: req.body.grade,
                    birth_date: req.body.birth_date,
                    ol_year: req.body.ol_year,
                    al_year: req.body.al_year
                });
            }
            res.status(201).json({ success: true, data: user });
        }
        catch (err) {
            next(err);
        }
    }
};
