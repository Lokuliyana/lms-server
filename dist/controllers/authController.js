"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const joi_1 = __importDefault(require("joi"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const authService_1 = require("../services/authService");
const mediaService_1 = require("../services/mediaService");
const env_1 = require("../config/env");
const mongoose_1 = __importDefault(require("mongoose"));
// Fix 1.1: Joi schemas with explicit .string() types on every input field
const forgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required()
});
const verifyOtpSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    otp: joi_1.default.string().required()
});
const registerStep1Schema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    phone: joi_1.default.string().required(),
    full_name: joi_1.default.string().required(),
    // Fix 7.1: Bcrypt DoS - Joi .max() cap on password length
    password: joi_1.default.string().min(6).max(72).required()
});
exports.authController = {
    async registerStep1(req, res, next) {
        try {
            const { error, value } = registerStep1Schema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message });
            }
            // Fix 1.5: Validate both email and phone uniqueness pre-insert
            const existingUser = await User_1.User.findOne({
                $or: [{ email: value.email }, { phone: value.phone }]
            });
            if (existingUser) {
                const field = existingUser.email === value.email ? 'Email' : 'Phone';
                return res.status(409).json({ success: false, message: `${field} already in use` });
            }
            const password_hash = await bcrypt_1.default.hash(value.password, 10);
            const result = await authService_1.authService.registerStep1({
                ...value,
                password_hash
            });
            res.status(200).json({ success: true, ...result });
        }
        catch (err) {
            next(err);
        }
    },
    async registerStep2(req, res, next) {
        try {
            const { error, value } = verifyOtpSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message });
            }
            const user = await authService_1.authService.registerStep2(value.email, value.otp);
            res.status(201).json({ success: true, user });
        }
        catch (err) {
            if (err.message === 'Invalid or expired OTP') {
                return res.status(400).json({ success: false, message: err.message });
            }
            next(err);
        }
    },
    async login(req, res, next) {
        try {
            const email = req.body.email || req.body.identifier;
            const { password } = req.body;
            const user = await User_1.User.findOne({ email }).lean();
            if (!user || !(await bcrypt_1.default.compare(password, user.password_hash))) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id }, env_1.config.jwtSecret, { expiresIn: '1d' });
            // Fix 5.1: HTTP-only cookies for session storage
            res.cookie('token', token, {
                httpOnly: true,
                secure: env_1.config.env === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });
            // Populate role names for the frontend
            const Role = mongoose_1.default.model('Role');
            const roles = await Role.find({ _id: { $in: user.role_ids } });
            const roleNames = roles.map((r) => r.name?.toLowerCase());
            const legacyRole = roleNames.includes('admin') ? 'admin'
                : roleNames.includes('teacher') ? 'teacher'
                    : roleNames.includes('moderator') ? 'moderator'
                        : 'student';
            const RolePermission = mongoose_1.default.model('RolePermission');
            const Permission = mongoose_1.default.model('Permission');
            const rolePerms = await RolePermission.find({ role_id: { $in: user.role_ids } });
            const perms = await Permission.find({ _id: { $in: rolePerms.map((rp) => rp.permission_id) } });
            const permissions = perms.map((p) => p.key);
            const userObj = { ...user, role: legacyRole, permissions };
            res.status(200).json({ success: true, user: userObj, token });
        }
        catch (err) {
            next(err);
        }
    },
    async forgotPassword(req, res, next) {
        try {
            const { error, value } = forgotPasswordSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: false, message: error.details[0].message });
            }
            // Mock OTP logic
            res.status(200).json({ success: true, message: 'OTP sent if email exists' });
        }
        catch (err) {
            next(err);
        }
    },
    async logout(req, res, next) {
        try {
            res.clearCookie('token');
            res.status(200).json({ success: true, message: 'Logged out' });
        }
        catch (err) {
            next(err);
        }
    },
    async getProfile(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }
            const user = await User_1.User.findById(req.user._id).select('-password_hash');
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            // Populate role names for the frontend
            const Role = mongoose_1.default.model('Role');
            const roles = await Role.find({ _id: { $in: user.role_ids } });
            const roleNames = roles.map((r) => r.name?.toLowerCase());
            // We will attach `role` as a string for backward compatibility
            const legacyRole = roleNames.includes('admin') ? 'admin'
                : roleNames.includes('teacher') ? 'teacher'
                    : roleNames.includes('moderator') ? 'moderator'
                        : 'student';
            // Also fetch permissions to support frontend `usePermission`
            const RolePermission = mongoose_1.default.model('RolePermission');
            const Permission = mongoose_1.default.model('Permission');
            const rolePerms = await RolePermission.find({ role_id: { $in: user.role_ids } });
            const perms = await Permission.find({ _id: { $in: rolePerms.map((rp) => rp.permission_id) } });
            const permissions = perms.map((p) => p.key);
            // Student profile population
            let profile = {};
            const StudentProfile = mongoose_1.default.model('StudentProfile');
            const profileDoc = await StudentProfile.findOne({ user_id: user._id }).lean();
            if (profileDoc) {
                profile = profileDoc;
            }
            const userObj = {
                ...user.toObject(),
                ...profile,
                student_profile: profileDoc || null,
                full_name: `${user.first_name} ${user.last_name}`.trim(),
                role: legacyRole,
                permissions
            };
            res.status(200).json({ success: true, data: userObj, user: userObj });
        }
        catch (err) {
            next(err);
        }
    },
    async updateProfile(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }
            const userId = req.user._id || req.user.userId;
            const user = await User_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            const { first_name, last_name, full_name, phone, avatar, student_profile, school, grade, birth_date, ol_year, al_year, bio, qualifications, } = req.body;
            if (first_name)
                user.first_name = first_name;
            if (last_name)
                user.last_name = last_name;
            if (full_name && !first_name && !last_name) {
                const parts = full_name.trim().split(' ');
                user.first_name = parts[0];
                user.last_name = parts.slice(1).join(' ') || '-';
            }
            if (phone)
                user.phone = phone;
            let avatarUrl = avatar;
            if (avatar && typeof avatar === 'string' && avatar.startsWith('data:image/')) {
                try {
                    const matches = avatar.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const contentType = matches[1];
                        const buffer = Buffer.from(matches[2], 'base64');
                        const ext = contentType.split('/')[1] || 'png';
                        const uploadPath = `avatars/${userId}_${Date.now()}.${ext}`;
                        const uploadRes = await (0, mediaService_1.uploadMedia)({
                            fileBuffer: buffer,
                            path: uploadPath,
                            ownerType: 'user_avatar',
                            ownerId: user._id,
                            contentType,
                        });
                        avatarUrl = uploadRes.publicUrl;
                    }
                }
                catch (uploadErr) {
                    console.warn('Avatar cloud upload fallback:', uploadErr);
                }
            }
            if (avatarUrl) {
                user.avatar = avatarUrl;
            }
            await user.save();
            const pData = student_profile || {};
            const resolvedSchool = school !== undefined ? school : pData.school;
            const resolvedGrade = grade !== undefined ? grade : pData.grade;
            const resolvedBirthDate = birth_date !== undefined ? birth_date : pData.birth_date;
            const resolvedOlYear = ol_year !== undefined ? ol_year : pData.ol_year;
            const resolvedAlYear = al_year !== undefined ? al_year : pData.al_year;
            const resolvedBio = bio !== undefined ? bio : pData.bio;
            const resolvedQualifications = qualifications !== undefined ? qualifications : pData.qualifications;
            const StudentProfile = mongoose_1.default.model('StudentProfile');
            const updatedProfile = await StudentProfile.findOneAndUpdate({ user_id: user._id }, {
                user_id: user._id,
                full_name: `${user.first_name} ${user.last_name}`.trim(),
                avatar_url: user.avatar,
                school: resolvedSchool,
                grade: resolvedGrade,
                birth_date: resolvedBirthDate,
                ol_year: resolvedOlYear,
                al_year: resolvedAlYear,
                bio: resolvedBio,
                qualifications: resolvedQualifications,
            }, { upsert: true, new: true });
            const Role = mongoose_1.default.model('Role');
            const roles = await Role.find({ _id: { $in: user.role_ids } });
            const roleNames = roles.map((r) => r.name?.toLowerCase());
            const legacyRole = roleNames.includes('admin') ? 'admin'
                : roleNames.includes('teacher') ? 'teacher'
                    : roleNames.includes('moderator') ? 'moderator'
                        : 'student';
            const profileObj = updatedProfile?.toObject ? updatedProfile.toObject() : (updatedProfile || {});
            const userObj = {
                ...user.toObject(),
                ...profileObj,
                student_profile: updatedProfile ? profileObj : null,
                full_name: `${user.first_name} ${user.last_name}`.trim(),
                role: legacyRole,
            };
            res.status(200).json({ success: true, message: 'Profile updated successfully', data: userObj, user: userObj });
        }
        catch (err) {
            next(err);
        }
    },
    async getUserById(req, res, next) {
        try {
            const user = await User_1.User.findById(req.params.id).lean();
            if (!user)
                return res.status(404).json({ success: false, message: 'User not found' });
            const Role = mongoose_1.default.model('Role');
            const roles = await Role.find({ _id: { $in: user.role_ids } });
            const roleNames = roles.map((r) => r.name.toLowerCase());
            let role = 'student';
            if (roleNames.includes('admin'))
                role = 'admin';
            else if (roleNames.includes('teacher'))
                role = 'teacher';
            else if (roleNames.includes('moderator'))
                role = 'moderator';
            let profile = {};
            const StudentProfile = mongoose_1.default.model('StudentProfile');
            profile = await StudentProfile.findOne({ user_id: user._id }).lean() || {};
            res.status(200).json({ success: true, data: { ...user, ...profile, role } });
        }
        catch (err) {
            next(err);
        }
    },
    async adminResetPassword(req, res, next) {
        try {
            const { newPassword } = req.body;
            const user = await User_1.User.findById(req.params.id);
            if (!user)
                return res.status(404).json({ success: false, message: 'User not found' });
            user.password_hash = await bcrypt_1.default.hash(newPassword, 10);
            await user.save();
            res.status(200).json({ success: true, message: 'Password reset successful' });
        }
        catch (err) {
            next(err);
        }
    },
    async resetPassword(req, res, next) {
        try {
            const { email, newPassword, password } = req.body;
            const pwd = newPassword || password;
            if (!email || !pwd) {
                return res.status(400).json({ success: false, message: 'Email and password are required' });
            }
            const user = await User_1.User.findOne({ email });
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            user.password_hash = await bcrypt_1.default.hash(pwd, 10);
            await user.save();
            res.status(200).json({ success: true, message: 'Password reset successful' });
        }
        catch (err) {
            next(err);
        }
    },
    async changePassword(req, res, next) {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!req.user)
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            const user = await User_1.User.findById(req.user._id);
            if (!user)
                return res.status(404).json({ success: false, message: 'User not found' });
            if (!(await bcrypt_1.default.compare(oldPassword, user.password_hash))) {
                return res.status(400).json({ success: false, message: 'Invalid current password' });
            }
            user.password_hash = await bcrypt_1.default.hash(newPassword, 10);
            await user.save();
            res.status(200).json({ success: true, message: 'Password changed successful' });
        }
        catch (err) {
            next(err);
        }
    },
    async editUser(req, res, next) {
        try {
            const requesterId = (req.user?._id || req.user?.userId || '').toString();
            const isSelf = requesterId === req.params.id;
            const canUpdateUsers = req.user?.permissions?.includes('users.update');
            if (!isSelf && !canUpdateUsers) {
                return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions to edit other user profiles' });
            }
            const { full_name, phone, school, grade, birth_date, ol_year, al_year, bio, qualifications, role, role_ids } = req.body;
            const user = await User_1.User.findById(req.params.id);
            if (!user)
                return res.status(404).json({ success: false, message: 'User not found' });
            if (phone) {
                user.phone = phone;
            }
            if (full_name) {
                const parts = full_name.trim().split(' ');
                user.first_name = parts[0];
                user.last_name = parts.slice(1).join(' ') || '-';
            }
            let isStudentRole = true;
            if (canUpdateUsers && (role || role_ids)) {
                const Role = mongoose_1.default.model('Role');
                let resolvedRoleIds = role_ids;
                if (!resolvedRoleIds && role) {
                    const roleDoc = await Role.findOne({ name: new RegExp(`^${role}$`, 'i') });
                    if (roleDoc) {
                        resolvedRoleIds = [roleDoc._id];
                    }
                }
                if (resolvedRoleIds && Array.isArray(resolvedRoleIds) && resolvedRoleIds.length > 0) {
                    user.role_ids = resolvedRoleIds;
                    const assignedRoles = await Role.find({ _id: { $in: resolvedRoleIds } });
                    isStudentRole = assignedRoles.some((r) => r.name.toLowerCase() === 'student');
                    if (!isStudentRole) {
                        const StudentProfile = mongoose_1.default.model('StudentProfile');
                        await StudentProfile.deleteOne({ user_id: user._id });
                    }
                }
            }
            await user.save();
            if (isStudentRole) {
                const StudentProfile = mongoose_1.default.model('StudentProfile');
                await StudentProfile.findOneAndUpdate({ user_id: user._id }, { full_name, school, grade, birth_date, ol_year, al_year, bio, qualifications }, { upsert: true });
            }
            res.status(200).json({ success: true, message: 'Profile updated' });
        }
        catch (err) {
            next(err);
        }
    }
};
