"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecordingStreamFromDrive = exports.deleteRecordingFromDrive = exports.replaceRecordingOnDrive = exports.uploadRecordingToDrive = exports.expireRecording = exports.deleteRecording = exports.updateRecording = exports.getRecordingById = exports.getRecordingsByClass = exports.createRecording = exports.resolvePlaybackUrl = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const stream_1 = require("stream");
const Recording_1 = require("../models/Recording");
const Class_1 = require("../models/Class");
const driveHelpers_1 = require("../utils/driveHelpers");
const monthKey_1 = require("../utils/monthKey");
const googleDrive = require('../utils/googleDrive');
/**
 * Resolve direct playback URL based on provider and local/direct storage.
 */
const resolvePlaybackUrl = (doc) => {
    if (!doc)
        return '';
    if (doc.provider === 'local' || (doc.driveUrl && doc.driveUrl.includes('/uploads/'))) {
        return doc.driveUrl || doc.video_url;
    }
    if (doc.provider === 'youtube') {
        const ytId = doc.driveFileId || doc.video_url;
        return `https://www.youtube.com/embed/${ytId}`;
    }
    return doc.video_url || doc.driveUrl || doc.driveFileId || '';
};
exports.resolvePlaybackUrl = resolvePlaybackUrl;
/**
 * Create a new recording and link it reliably to the corresponding Class.
 */
const createRecording = async (data) => {
    const { class_id, title, driveUrl, session_date, batch_name } = data;
    if (!class_id || !title || !driveUrl || !session_date) {
        const err = new Error("class_id, title, driveUrl, session_date are required.");
        err.status = 400;
        throw err;
    }
    let fileId = '';
    let provider = 'drive';
    const result = (0, driveHelpers_1.getProviderAndId)(driveUrl);
    if (result) {
        fileId = result.id;
        provider = result.provider;
    }
    else if (driveUrl.includes('/uploads/') || driveUrl.startsWith('http://') || driveUrl.startsWith('https://') || driveUrl.startsWith('/uploads/')) {
        fileId = driveUrl.trim();
        provider = 'local';
    }
    else {
        const err = new Error("Invalid video link (must be Google Drive, YouTube, or direct upload URL).");
        err.status = 400;
        throw err;
    }
    const dt = new Date(session_date);
    if (isNaN(dt.getTime())) {
        const err = new Error("Invalid session_date format.");
        err.status = 400;
        throw err;
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
        is_deleted: false,
    });
    // Link recording directly into Class recordings list
    if (mongoose_1.default.Types.ObjectId.isValid(class_id)) {
        await Class_1.Class.updateOne({ _id: class_id }, { $addToSet: { recordings: doc._id } });
    }
    return doc;
};
exports.createRecording = createRecording;
/**
 * Fetch all recordings for a class, populated and sorted by session date.
 */
const getRecordingsByClass = async (rawClassId) => {
    const query = { is_deleted: { $ne: true } };
    if (mongoose_1.default.Types.ObjectId.isValid(rawClassId)) {
        query.class_id = new mongoose_1.default.Types.ObjectId(rawClassId);
    }
    else {
        query.class_id = rawClassId;
    }
    const recordings = await Recording_1.Recording.find(query)
        .populate({
        path: 'class_id',
        select: 'title subject grade',
        populate: [
            { path: 'subject', select: 'name' },
            { path: 'grade', select: 'name' },
        ],
    })
        .sort({ session_date: -1 })
        .lean();
    return recordings.map((r) => ({
        ...r,
        playback_url: (0, exports.resolvePlaybackUrl)(r),
    }));
};
exports.getRecordingsByClass = getRecordingsByClass;
/**
 * Fetch a single recording by ID, populating class and taxonomy references.
 */
const getRecordingById = async (rawId) => {
    if (!rawId || !mongoose_1.default.Types.ObjectId.isValid(String(rawId))) {
        return null;
    }
    const doc = await Recording_1.Recording.findById(rawId)
        .populate({
        path: 'class_id',
        select: 'title subject grade enrolled_students is_deleted',
        populate: [
            { path: 'subject', select: 'name' },
            { path: 'grade', select: 'name' },
        ],
    })
        .lean();
    if (!doc || doc.is_deleted) {
        return null;
    }
    return {
        ...doc,
        playback_url: (0, exports.resolvePlaybackUrl)(doc),
    };
};
exports.getRecordingById = getRecordingById;
/**
 * Update recording metadata.
 */
const updateRecording = async (id, updates) => {
    const rec = await Recording_1.Recording.findById(id);
    if (!rec)
        return null;
    const { title, driveUrl, session_date, batch_name, is_expired } = updates;
    if (typeof title === 'string' && title.trim())
        rec.title = title.trim();
    if (typeof driveUrl === 'string' && driveUrl.trim()) {
        const result = (0, driveHelpers_1.getProviderAndId)(driveUrl);
        if (result) {
            rec.driveUrl = driveUrl.trim();
            rec.driveFileId = result.id;
            rec.video_url = result.id;
            rec.provider = result.provider;
        }
        else if (driveUrl.includes('/uploads/') || driveUrl.startsWith('http://') || driveUrl.startsWith('https://') || driveUrl.startsWith('/uploads/')) {
            rec.driveUrl = driveUrl.trim();
            rec.driveFileId = driveUrl.trim();
            rec.video_url = driveUrl.trim();
            rec.provider = 'local';
        }
        else {
            const err = new Error("Invalid video link.");
            err.status = 400;
            throw err;
        }
    }
    if (typeof batch_name === 'string')
        rec.batch_name = batch_name;
    if (typeof is_expired === 'boolean')
        rec.is_expired = is_expired;
    if (typeof session_date !== 'undefined') {
        const dt = new Date(session_date);
        if (isNaN(dt.getTime())) {
            const err = new Error("Invalid session_date format.");
            err.status = 400;
            throw err;
        }
        rec.session_date = dt;
        rec.month_key = (0, monthKey_1.monthKey)(dt, "Asia/Colombo");
    }
    await rec.save();
    return rec;
};
exports.updateRecording = updateRecording;
/**
 * Soft delete recording and unlink from Class.
 */
const deleteRecording = async (id) => {
    const rec = await Recording_1.Recording.findById(id);
    if (!rec)
        return null;
    rec.is_deleted = true;
    await rec.save();
    if (rec.class_id) {
        await Class_1.Class.updateOne({ _id: rec.class_id }, { $pull: { recordings: rec._id } });
    }
    return rec;
};
exports.deleteRecording = deleteRecording;
/**
 * Mark recording as expired.
 */
const expireRecording = async (id) => {
    const rec = await Recording_1.Recording.findById(id);
    if (!rec)
        return null;
    rec.is_expired = true;
    await rec.save();
    return rec;
};
exports.expireRecording = expireRecording;
/**
 * Upload a new recording video to Google Drive.
 */
const uploadRecordingToDrive = async (file, title) => {
    const stream = stream_1.Readable.from(file.buffer);
    const fileId = await googleDrive.uploadFileToDrive(stream, `${title}.mp4`, file.mimetype);
    return fileId;
};
exports.uploadRecordingToDrive = uploadRecordingToDrive;
/**
 * Replace an existing video file on Google Drive with a new one.
 */
const replaceRecordingOnDrive = async (oldFileId, newFile, newTitle) => {
    await googleDrive.deleteFileFromDrive(oldFileId);
    const stream = stream_1.Readable.from(newFile.buffer);
    const newFileId = await googleDrive.uploadFileToDrive(stream, `${newTitle}.mp4`, newFile.mimetype);
    return newFileId;
};
exports.replaceRecordingOnDrive = replaceRecordingOnDrive;
/**
 * Delete a recording video file from Google Drive
 */
const deleteRecordingFromDrive = async (fileId) => {
    await googleDrive.deleteFileFromDrive(fileId);
};
exports.deleteRecordingFromDrive = deleteRecordingFromDrive;
/**
 * Get a streamable file from Google Drive by file ID
 */
const getRecordingStreamFromDrive = async (fileId) => {
    const stream = await googleDrive.getDriveStream(fileId);
    return stream;
};
exports.getRecordingStreamFromDrive = getRecordingStreamFromDrive;
