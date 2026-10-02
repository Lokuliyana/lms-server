"use strict";
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
