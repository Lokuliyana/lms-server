"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewByTicketPublic = exports.createPreviewTicketHandler = exports.getRecordingById = exports.expireRecording = exports.deleteRecording = exports.updateRecording = exports.createRecording = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Class_1 = require("../models/Class");
const Recording_1 = require("../models/Recording");
const ClassEntitlement_1 = require("../models/ClassEntitlement");
const driveHelpers_1 = require("../utils/driveHelpers");
const monthKey_1 = require("../utils/monthKey");
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
    const hasEntitlement = await ClassEntitlement_1.ClassEntitlement.exists({
        user_id: userId,
        class_id: recording.class_id,
        month_key: recording.month_key,
    });
    if (!hasEntitlement) {
        const err = new Error("No active monthly payment (Entitlement missing)");
        err.status = 403;
        throw err;
    }
}
const createRecording = async (req, res) => {
    try {
        const { class_id, title, driveUrl, session_date, batch_name } = req.body;
        if (!class_id || !title || !driveUrl || !session_date) {
            res.status(400).json({ message: "class_id, title, driveUrl, session_date are required." });
            return;
        }
        const result = (0, driveHelpers_1.getProviderAndId)(driveUrl);
        if (!result) {
            res.status(400).json({ message: "Invalid video link (must be Google Drive or YouTube)." });
            return;
        }
        const { id: fileId, provider } = result;
        const dt = new Date(session_date);
        if (isNaN(dt.getTime())) {
            res.status(400).json({ message: "Invalid session_date format." });
            return;
        }
        const mk = (0, monthKey_1.monthKey)(dt, "Asia/Colombo");
        const doc = await Recording_1.Recording.create({
            class_id,
            title: String(title).trim(),
            driveUrl: String(driveUrl).trim(),
            driveFileId: fileId,
            video_url: fileId,
            provider: provider,
            session_date: dt,
            month_key: mk,
            batch_name,
        });
        res.status(201).json({ message: "Recording created.", recording: doc });
    }
    catch (err) {
        console.error("Create error:", err);
        res.status(500).json({ message: "Failed to create recording." });
    }
};
exports.createRecording = createRecording;
const updateRecording = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, driveUrl, session_date, batch_name, is_expired } = req.body;
        const rec = await Recording_1.Recording.findById(id);
        if (!rec) {
            res.status(404).json({ message: "Recording not found." });
            return;
        }
        if (typeof title === "string" && title.trim())
            rec.title = title.trim();
        if (typeof driveUrl === "string" && driveUrl.trim()) {
            const result = (0, driveHelpers_1.getProviderAndId)(driveUrl);
            if (!result) {
                res.status(400).json({ message: "Invalid video link." });
                return;
            }
            rec.driveUrl = driveUrl.trim();
            rec.driveFileId = result.id;
            rec.video_url = result.id;
            rec.provider = result.provider;
        }
        if (typeof batch_name === "string")
            rec.batch_name = batch_name;
        if (typeof is_expired === "boolean")
            rec.is_expired = is_expired;
        if (typeof session_date !== "undefined") {
            const dt = new Date(session_date);
            if (isNaN(dt.getTime())) {
                res.status(400).json({ message: "Invalid session_date format." });
                return;
            }
            rec.session_date = dt;
            rec.month_key = (0, monthKey_1.monthKey)(dt, "Asia/Colombo");
        }
        await rec.save();
        res.status(200).json({ message: "Recording updated.", recording: rec });
    }
    catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "Failed to update recording." });
    }
};
exports.updateRecording = updateRecording;
const deleteRecording = async (req, res) => {
    try {
        const { id } = req.params;
        const rec = await Recording_1.Recording.findById(id);
        if (!rec) {
            res.status(404).json({ message: "Recording not found." });
            return;
        }
        await Recording_1.Recording.deleteOne({ _id: id });
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
        const rec = await Recording_1.Recording.findById(id);
        if (!rec) {
            res.status(404).json({ message: "Recording not found." });
            return;
        }
        rec.is_expired = true;
        await rec.save();
        res.status(200).json({ message: "Recording expired." });
    }
    catch (err) {
        console.error("Expire error:", err);
        res.status(500).json({ message: "Failed to expire recording." });
    }
};
exports.expireRecording = expireRecording;
const getRecordingById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await Recording_1.Recording.findById(id).lean();
        if (!doc) {
            res.status(404).json({ message: "Recording not found" });
            return;
        }
        res.json({ recording: doc });
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
        if (!DRIVE_ID_RE.test(fileId || "")) {
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
        res.json({ ticket, iframeSrc: `/api/recordings/ticket/${ticket}` });
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
