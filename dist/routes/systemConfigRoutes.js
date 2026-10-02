"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const systemConfigController_1 = require("../controllers/systemConfigController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Public GET config endpoint
router.get('/config', systemConfigController_1.getSystemConfig);
// PUT config protected by branding.manage
router.put('/config', (0, auth_1.requirePermission)('branding.manage'), upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'logoUrl', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'faviconUrl', maxCount: 1 },
    { name: 'heroBanner', maxCount: 1 },
    { name: 'heroBannerUrl', maxCount: 1 },
    { name: 'loginIllustration', maxCount: 1 },
    { name: 'loginIllustrationUrl', maxCount: 1 },
    { name: 'defaultAvatar', maxCount: 1 },
    { name: 'defaultAvatarUrl', maxCount: 1 },
]), systemConfigController_1.updateSystemConfig);
router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
exports.default = router;
