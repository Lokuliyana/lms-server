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
exports.previewByTicketPublic = exports.createPreviewTicketHandler = exports.getRecordingById = exports.getRecordingsByClass = exports.expireRecording = exports.deleteRecording = exports.updateRecording = exports.createRecording = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Class_1 = require("../models/Class");
const Recording_1 = require("../models/Recording");
const entitlementService_1 = require("../services/entitlementService");
const driveHelpers_1 = require("../utils/driveHelpers");
const monthKey_1 = require("../utils/monthKey");
const recordingService = __importStar(require("../services/recordingService"));
const TICKET_SECRET = process.env.TICKET_SECRET || process.env.JWT_SECRET || "dev-secret";
const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,}$/;
async function assertAccess({ userId, role, fileId }) {
    const recording = await Recording_1.Recording.findOne({ $or: [{ video_url: fileId }, { driveFileId: fileId }] }).lean();
    if (!recording || recording.is_expired) {
        const err = new Error("Access denied to this recording.");
        err.status = 403;
        throw err;
    }
    const classData = await Class_1.Class.findById(recording.class_id).lean();
    if (!classData || classData.is_deleted) {
        const err = new Error("Class not found.");
        err.status = 404;
        throw err;
    }
    const privileged = ["teacher", "moderator", "admin"].includes(role || "student");
    if (privileged)
        return;
    const enrolledArray = classData.enrolled_students || [];
    const isEnrolled = enrolledArray.some((s) => String(s._id || s) === String(userId));
    if (!isEnrolled) {
        const err = new Error("You are not enrolled in this class.");
        err.status = 403;
        throw err;
    }
    // Fix 3.6: Check ClassEntitlement just like assignments
    const targetMonthKey = recording.month_key || (recording.session_date ? (0, monthKey_1.monthKey)(new Date(recording.session_date), "Asia/Colombo") : (0, monthKey_1.monthKey)(new Date(), "Asia/Colombo"));
    const hasEntitlement = await (0, entitlementService_1.hasActiveEntitlement)(userId.toString(), recording.class_id.toString(), targetMonthKey);
    if (!hasEntitlement) {
        const err = new Error("No active monthly payment (Entitlement missing)");
        err.status = 403;
        throw err;
    }
}
const createRecording = async (req, res) => {
    try {
        const doc = await recordingService.createRecording(req.body);
        res.status(201).json({ message: "Recording created.", recording: doc });
    }
    catch (err) {
        console.error("Create error:", err);
        res.status(err.status || 500).json({ message: err.message || "Failed to create recording." });
    }
};
exports.createRecording = createRecording;
const updateRecording = async (req, res) => {
    try {
        const { id } = req.params;
        const rec = await recordingService.updateRecording(String(id), req.body);
        if (!rec) {
            res.status(404).json({ message: "Recording not found." });
            return;
        }
        res.status(200).json({ message: "Recording updated.", recording: rec });
    }
    catch (err) {
        console.error("Update error:", err);
        res.status(err.status || 500).json({ message: err.message || "Failed to update recording." });
    }
};
exports.updateRecording = updateRecording;
const deleteRecording = async (req, res) => {
    try {
        const { id } = req.params;
        const rec = await recordingService.deleteRecording(String(id));
        if (!rec) {
            res.status(404).json({ message: "Recording not found." });
            return;
        }
        res.status(200).json({ message: "Recording deleted." });
    }
    catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ message: "Failed to delete recording." });
    }
};
exports.deleteRecording = deleteRecording;
const expireRecording = async (req, res) => {
    try {
        const { id } = req.params;
        const rec = await recordingService.expireRecording(String(id));
        if (!rec) {
            res.status(404).json({ message: "Recording not found." });
            return;
        }
        res.status(200).json({ message: "Recording expired." });
    }
    catch (err) {
        console.error("Expire error:", err);
        res.status(500).json({ message: "Failed to expire recording." });
    }
};
exports.expireRecording = expireRecording;
const getRecordingsByClass = async (req, res) => {
    try {
        const rawClassId = req.params.classId || req.params.id;
        if (!rawClassId) {
            res.status(400).json({ message: "classId is required" });
            return;
        }
        const recordings = await recordingService.getRecordingsByClass(String(rawClassId));
        res.status(200).json({ success: true, recordings, data: recordings });
    }
    catch (err) {
        console.error("getRecordingsByClass error:", err);
        res.status(500).json({ message: "Failed to fetch class recordings" });
    }
};
exports.getRecordingsByClass = getRecordingsByClass;
const getRecordingById = async (req, res) => {
    try {
        const rawId = req.params.id;
        if (!rawId || !mongoose_1.default.Types.ObjectId.isValid(String(rawId))) {
            res.status(400).json({ message: "Invalid recording ID" });
            return;
        }
        const doc = await recordingService.getRecordingById(String(rawId));
        if (!doc) {
            res.status(404).json({ message: "Recording not found" });
            return;
        }
        const classData = doc.class_id;
        const user = req.user;
        const role = user?.role || 'student';
        const userId = (user?._id || user?.userId || '').toString();
        const isStaff = ['teacher', 'admin', 'moderator'].includes(role) ||
            user?.permissions?.includes('recordings.manage') ||
            user?.permissions?.includes('classes.update') ||
            user?.permissions?.includes('recordings.read');
        if (user && !isStaff) {
            const enrolledArray = classData?.enrolled_students || [];
            const isEnrolled = enrolledArray.some((s) => String(s?._id || s) === userId);
            if (!isEnrolled) {
                const { ClassEnrollment } = await Promise.resolve().then(() => __importStar(require('../models/ClassEnrollment')));
                const hasEnrollment = await ClassEnrollment.exists({ classId: classData?._id || doc.class_id, userId, status: 'active' });
                if (!hasEnrollment) {
                    res.status(403).json({ message: "You are not enrolled in this class." });
                    return;
                }
            }
        }
        res.json({ success: true, recording: doc, data: doc });
    }
    catch (e) {
        console.error("getRecordingById error:", e);
        res.status(500).json({ message: "Failed to fetch recording" });
    }
};
exports.getRecordingById = getRecordingById;
const createPreviewTicketHandler = async (req, res) => {
    try {
        const { fileId } = req.body || {};
        if (!fileId) {
            res.status(400).json({ message: "Invalid fileId" });
            return;
        }
        // Local / direct storage playback support
        if (fileId.startsWith('/uploads') || fileId.startsWith('http://') || fileId.startsWith('https://')) {
            res.json({ ticket: 'local', iframeSrc: fileId, url: fileId });
            return;
        }
        if (!DRIVE_ID_RE.test(fileId)) {
            res.status(400).json({ message: "Invalid fileId" });
            return;
        }
        const userId = req.user?._id;
        const role = req.user?.role || "student";
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        await assertAccess({ userId: String(userId), role, fileId });
        const ticket = jsonwebtoken_1.default.sign({ sub: String(userId), fid: fileId, typ: "preview" }, TICKET_SECRET, { expiresIn: "90s" });
        res.json({
            ticket,
            iframeSrc: `/api/recordings/ticket/${ticket}`,
            url: `/api/recordings/ticket/${ticket}`,
        });
    }
    catch (e) {
        const code = e.status || 500;
        console.error("createPreviewTicketHandler error:", e);
        res.status(code).json({ message: e.message || "Failed to create ticket" });
    }
};
exports.createPreviewTicketHandler = createPreviewTicketHandler;
const previewByTicketPublic = async (req, res) => {
    try {
        const { ticket } = req.params;
        if (!ticket) {
            res.status(400).send("Bad request");
            return;
        }
        if (ticket === 'local') {
            res.status(400).send("Local files are served directly");
            return;
        }
        const payload = jsonwebtoken_1.default.verify(ticket, TICKET_SECRET);
        const fileId = payload?.fid;
        if (!DRIVE_ID_RE.test(fileId || "")) {
            res.status(400).send("Bad file id");
            return;
        }
        if (fileId && fileId.length === 11 && !fileId.includes('-') && !fileId.includes('_')) {
            res.redirect(302, `https://www.youtube.com/embed/${fileId}?rel=0`);
            return;
        }
        res.redirect(302, (0, driveHelpers_1.drivePreviewUrl)(fileId));
    }
    catch (e) {
        console.error("previewByTicketPublic error:", e);
        res.status(410).send("Link expired");
    }
};
exports.previewByTicketPublic = previewByTicketPublic;
