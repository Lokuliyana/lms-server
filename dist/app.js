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
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const errorHandler_1 = require("./middlewares/errorHandler");
const authRoutes_1 = require("./routes/authRoutes");
const usersRoutes_1 = require("./routes/usersRoutes");
const permissionsRoutes_1 = __importDefault(require("./routes/permissionsRoutes"));
const classRoutes_1 = __importDefault(require("./routes/classRoutes"));
const classApplicationRoutes_1 = __importDefault(require("./routes/classApplicationRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const assignmentRoutes_1 = __importDefault(require("./routes/assignmentRoutes"));
const recordingsRoutes_1 = __importDefault(require("./routes/recordingsRoutes"));
const mediaRoute_1 = __importDefault(require("./routes/mediaRoute"));
const customizationRoutes_1 = __importDefault(require("./routes/customizationRoutes"));
const challengeRoutes_1 = __importDefault(require("./routes/challengeRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/payments/paymentRoutes"));
const systemConfigRoutes_1 = __importDefault(require("./routes/systemConfigRoutes"));
const meetingRoutes_1 = __importDefault(require("./routes/meetingRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const gradeRoutes_1 = __importDefault(require("./routes/gradeRoutes"));
const storeRoutes_1 = __importDefault(require("./routes/storeRoutes"));
const deliveryRoutes_1 = __importDefault(require("./routes/deliveryRoutes"));
const examRoutes_1 = __importDefault(require("./routes/examRoutes"));
const studyPackRoutes_1 = __importDefault(require("./routes/studyPackRoutes"));
const app = (0, express_1.default)();
exports.app = app;
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false, // allow serving static images
}));
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('dev'));
// Normalize double /api/api to /api if present
app.use((req, res, next) => {
    if (req.url.startsWith('/api/api/')) {
        req.url = req.url.replace(/^\/api\/api\//, '/api/');
    }
    next();
});
// Static files
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'public/uploads')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
app.use('/api/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'public/uploads')));
app.use('/api/uploads', express_1.default.static(path_1.default.join(__dirname, '../public/uploads')));
// CMS Admin content save handler for visual editors
const handleAdminContent = async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Key and value are required' });
        }
        const { SiteSettings } = await Promise.resolve().then(() => __importStar(require('./models/SiteSettings')));
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = new SiteSettings({ site: {}, pages: {} });
        }
        const keys = key.split('.');
        let target = settings;
        if (keys[0] === 'site' || keys[0] === 'pages') {
            let sub = target[keys[0]] || {};
            let cur = sub;
            for (let i = 1; i < keys.length - 1; i++) {
                if (!cur[keys[i]])
                    cur[keys[i]] = {};
                cur = cur[keys[i]];
            }
            cur[keys[keys.length - 1]] = value;
            target[keys[0]] = sub;
            target.markModified(keys[0]);
        }
        await settings.save();
        return res.json({ success: true, key, value });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to update content' });
    }
};
app.post('/api/admin/content', handleAdminContent);
app.post('/admin/content', handleAdminContent);
// Routes: Mount all routers under both `/api/*` and `/*`
const routes = [
    ['/auth', authRoutes_1.authRoutes],
    ['/users', usersRoutes_1.usersRoutes],
    ['/permissions', permissionsRoutes_1.default],
    ['/classes', classRoutes_1.default],
    ['/class-applications', classApplicationRoutes_1.default],
    ['/quizzes', quizRoutes_1.default],
    ['/challenges', challengeRoutes_1.default],
    ['/assignments', assignmentRoutes_1.default],
    ['/recordings', recordingsRoutes_1.default],
    ['/media', mediaRoute_1.default],
    ['/payments', paymentRoutes_1.default],
    ['/customization', customizationRoutes_1.default],
    ['/system', systemConfigRoutes_1.default],
    ['/meetings', meetingRoutes_1.default],
    ['/attendance', attendanceRoutes_1.default],
    ['/grades', gradeRoutes_1.default],
    ['/store', storeRoutes_1.default],
    ['/deliveries', deliveryRoutes_1.default],
    ['/exams', examRoutes_1.default],
    ['/study-packs', studyPackRoutes_1.default],
];
for (const [routePath, router] of routes) {
    app.use(`/api${routePath}`, router);
    app.use(routePath, router);
}
// Fix 7.5: Global error handler
app.use(errorHandler_1.errorHandler);
