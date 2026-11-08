"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSystemConfig = exports.getSystemConfig = exports.invalidateConfigCache = void 0;
const TenantSettings_1 = require("../models/TenantSettings");
const mediaService_1 = require("../services/mediaService");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// In-memory cache for TenantSettings
let cachedConfig = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const invalidateConfigCache = () => {
    cachedConfig = null;
    cacheExpiry = 0;
};
exports.invalidateConfigCache = invalidateConfigCache;
const getSystemConfig = async (req, res) => {
    try {
        const now = Date.now();
        if (cachedConfig && now < cacheExpiry) {
            res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
            return res.json({ success: true, data: cachedConfig });
        }
        let config = await TenantSettings_1.TenantSettings.findOne().lean();
        if (!config) {
            const created = await TenantSettings_1.TenantSettings.create({});
            config = created.toObject();
        }
        try {
            const { User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
            const { Role } = await Promise.resolve().then(() => __importStar(require('../models/Role')));
            const { StudentProfile } = await Promise.resolve().then(() => __importStar(require('../models/StudentProfile')));
            const teacherRoles = await Role.find({ name: /^teacher$/i });
            if (teacherRoles.length > 0) {
                const teacherRoleIds = teacherRoles.map((r) => r._id);
                let teacher = null;
                if (config.instructorName) {
                    const parts = config.instructorName.trim().split(' ');
                    teacher = await User.findOne({
                        role_ids: { $in: teacherRoleIds },
                        $or: [
                            { first_name: new RegExp(parts[0], 'i') },
                            { email: 'teacher@lms.com' }
                        ]
                    }).lean();
                }
                if (!teacher) {
                    teacher = await User.findOne({ role_ids: { $in: teacherRoleIds } }).lean();
                }
                if (teacher) {
                    const profile = await StudentProfile.findOne({ user_id: teacher._id }).lean();
                    const fullName = profile?.full_name || `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
                    config.leadTeacher = {
                        id: teacher._id,
                        full_name: fullName,
                        bio: profile?.bio || '',
                        qualifications: profile?.qualifications || '',
                        avatar: teacher.avatar || profile?.avatar_url || '',
                    };
                    if (!config.instructorName || config.instructorName === 'Danidu') {
                        config.instructorName = fullName;
                    }
                }
            }
        }
        catch (e) {
            // Fallback silently if query fails
        }
        cachedConfig = config;
        cacheExpiry = now + CACHE_TTL_MS;
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
        return res.json({ success: true, data: config });
    }
    catch (error) {
        console.error('Error fetching system config:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getSystemConfig = getSystemConfig;
const updateSystemConfig = async (req, res) => {
    try {
        let settings = await TenantSettings_1.TenantSettings.findOne();
        if (!settings) {
            settings = await TenantSettings_1.TenantSettings.create({});
        }
        const body = req.body || {};
        // Parse JSON strings if sent as multipart form-data
        const parseNested = (val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                }
                catch {
                    return val;
                }
            }
            return val;
        };
        if (body.platformName !== undefined)
            settings.platformName = body.platformName;
        if (body.instructorName !== undefined)
            settings.instructorName = body.instructorName;
        if (body.slogan !== undefined)
            settings.slogan = body.slogan;
        if (body.contactPhone !== undefined)
            settings.contactPhone = body.contactPhone;
        if (body.contactEmail !== undefined)
            settings.contactEmail = body.contactEmail;
        if (body.supportWhatsApp !== undefined)
            settings.supportWhatsApp = body.supportWhatsApp;
        if (body.assets) {
            const parsedAssets = parseNested(body.assets);
            settings.assets = { ...settings.assets, ...parsedAssets };
        }
        if (body.themeTokens) {
            const parsedTokens = parseNested(body.themeTokens);
            settings.themeTokens = { ...settings.themeTokens, ...parsedTokens };
        }
        // Handle uploaded asset files if present
        const files = req.files;
        if (files) {
            const assetKeys = [
                'logoUrl',
                'faviconUrl',
                'heroBannerUrl',
                'loginIllustrationUrl',
                'defaultAvatarUrl'
            ];
            for (const key of assetKeys) {
                const fileArr = files[key] || files[key.replace('Url', '')];
                if (fileArr && fileArr.length > 0) {
                    const file = fileArr[0];
                    try {
                        // Upload to cloud storage (Supabase)
                        const filePath = `branding/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        const uploadRes = await (0, mediaService_1.uploadMedia)({
                            fileBuffer: file.buffer,
                            path: filePath,
                            ownerType: 'system',
                            contentType: file.mimetype
                        });
                        settings.assets[key] = uploadRes.publicUrl;
                    }
                    catch (storageErr) {
                        console.warn('Cloud storage failed, falling back to local static serving:', storageErr);
                        const uploadDir = path_1.default.join(__dirname, '../../public/uploads/branding');
                        if (!fs_1.default.existsSync(uploadDir)) {
                            fs_1.default.mkdirSync(uploadDir, { recursive: true });
                        }
                        const localFileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        const localFilePath = path_1.default.join(uploadDir, localFileName);
                        fs_1.default.writeFileSync(localFilePath, file.buffer);
                        settings.assets[key] = `/uploads/branding/${localFileName}`;
                    }
                }
            }
        }
        await settings.save();
        (0, exports.invalidateConfigCache)();
        return res.json({ success: true, data: settings });
    }
    catch (error) {
        console.error('Error updating system config:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.updateSystemConfig = updateSystemConfig;
