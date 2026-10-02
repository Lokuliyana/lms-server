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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantSettings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const tenantSettingsSchema = new mongoose_1.Schema({
    platformName: { type: String, default: 'NexvoLearn' },
    instructorName: { type: String, default: 'Danidu' },
    slogan: { type: String, default: 'Empowering Minds Through Modern Education' },
    contactPhone: { type: String, default: '+94 77 123 4567' },
    contactEmail: { type: String, default: 'support@nexvolearn.com' },
    supportWhatsApp: { type: String, default: '+94771234567' },
    assets: {
        logoUrl: { type: String, default: '/assets/logo.png' },
        faviconUrl: { type: String, default: '/favicon.ico' },
        heroBannerUrl: { type: String, default: '/assets/hero.png' },
        loginIllustrationUrl: { type: String, default: '/assets/login-illustration.png' },
        defaultAvatarUrl: { type: String, default: '/assets/default-avatar.png' }
    },
    themeTokens: {
        primaryColor: { type: String, default: '#4f46e5' },
        accentColor: { type: String, default: '#06b6d4' }
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
exports.TenantSettings = mongoose_1.default.model('TenantSettings', tenantSettingsSchema);
