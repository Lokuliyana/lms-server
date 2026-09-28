"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecordingStreamFromDrive = exports.deleteRecordingFromDrive = exports.replaceRecordingOnDrive = exports.uploadRecordingToDrive = void 0;
const googleDrive = require('../utils/googleDrive');
const stream_1 = require("stream");
/**
 * Upload a new recording video to Google Drive.
 * @param file - Multer file object
 * @param title - Recording title
 */
const uploadRecordingToDrive = async (file, title) => {
    const stream = stream_1.Readable.from(file.buffer);
    const fileId = await googleDrive.uploadFileToDrive(stream, `${title}.mp4`, file.mimetype);
    return fileId;
};
exports.uploadRecordingToDrive = uploadRecordingToDrive;
/**
 * Replace an existing video file on Google Drive with a new one.
 * @param oldFileId - The file ID to be replaced
 * @param newFile - Multer file object for new video
 * @param newTitle - New file title
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
 * @param fileId - Google Drive file ID
 */
const deleteRecordingFromDrive = async (fileId) => {
    await googleDrive.deleteFileFromDrive(fileId);
};
exports.deleteRecordingFromDrive = deleteRecordingFromDrive;
/**
 * Get a streamable file from Google Drive by file ID
 * @param fileId - The ID of the file to stream
 */
const getRecordingStreamFromDrive = async (fileId) => {
    const stream = await googleDrive.getDriveStream(fileId);
    return stream;
};
exports.getRecordingStreamFromDrive = getRecordingStreamFromDrive;
