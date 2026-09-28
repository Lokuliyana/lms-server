"use strict";
// @ts-nocheck
const { getDriveClient, getDriveFolderId } = require('./driveClient');
function getDrive() {
    return getDriveClient();
}
// -------------------------------
// 📤 Upload file to Google Drive
// -------------------------------
exports.uploadFileToDrive = async (fileStream, filename, mimeType) => {
    console.log('🚀 uploadFileToDrive() called');
    const drive = getDrive();
    const folderId = getDriveFolderId();
    if (folderId) {
        console.log('[DriveUpload] Target folder:', folderId);
    }
    else {
        console.log('[DriveUpload] GOOGLE_DRIVE_FOLDER_ID not set; using service account My Drive.');
    }
    // Log the email being used (for debugging)
    const auth = drive.context._options.auth;
    if (auth && auth.email) {
        console.log('📧 [DriveUpload] Authenticated as:', auth.email);
    }
    else {
        console.log('📧 [DriveUpload] Authenticated as: (unknown/oauth)');
    }
    const requestBody = {
        name: filename,
        mimeType,
    };
    if (folderId)
        requestBody.parents = [folderId];
    try {
        const response = await drive.files.create({
            requestBody,
            media: {
                mimeType,
                body: fileStream,
            },
            fields: 'id',
            supportsAllDrives: true,
            resumable: true, // Better for large video files
        });
        console.log(`✅ Upload complete: ${response.data.id}`);
        return response.data.id;
    }
    catch (err) {
        const status = err?.response?.status || err?.code;
        const data = err?.response?.data;
        console.error('❌ Drive upload failed:', { status, message: err.message, data });
        // Check for specific Service Account Quota error
        const errorMsg = (err.message || '') + JSON.stringify(err.response?.data || {});
        if (errorMsg.includes('Service Accounts do not have storage quota')) {
            console.error('\n⚠️  [DriveUpload] SERVICE ACCOUNT STORAGE ERROR');
            console.error('   Service Accounts have 0 bytes of storage.');
            console.error('   YOU MUST:');
            console.error('   1. Create a folder in your personal Google Drive.');
            console.error('   2. Share it with the Service Account Email (Editor Role).');
            console.error('   3. Set GOOGLE_DRIVE_FOLDER_ID in your .env or Vercel settings.\n');
        }
        throw new Error('Failed to upload file to Google Drive');
    }
};
/**
 * Fetch metadata for debugging access issues.
 */
exports.getDriveFileMeta = async (fileId) => {
    const drive = getDrive();
    try {
        const resp = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, owners(emailAddress,displayName), driveId, trashed',
            supportsAllDrives: true,
        });
        return resp.data;
    }
    catch (err) {
        // Include Drive's message when available
        console.error('❌ Drive metadata error:', err?.errors || err?.message || err);
        throw err;
    }
};
/**
 * Get a streamable file from Google Drive by file ID.
 * For videos, we may get partial content via Range requests.
 */
exports.getDriveStream = async (fileId, rangeHeader) => {
    const drive = getDrive();
    try {
        const options = {
            responseType: 'stream',
            headers: {},
        };
        if (rangeHeader) {
            options.headers.Range = rangeHeader; // e.g. "bytes=0-"
        }
        const response = await drive.files.get({
            fileId,
            alt: 'media',
            supportsAllDrives: true,
        }, options);
        return response.data; // Node Readable stream
    }
    catch (err) {
        const code = err?.code || err?.response?.status;
        const msg = err?.errors?.[0]?.message || err?.message;
        console.error('❌ Drive stream error:', { code, msg });
        throw err;
    }
};
// -------------------------------
// ❌ Delete file from Drive
// -------------------------------
exports.deleteFileFromDrive = async (fileId) => {
    const drive = getDrive();
    try {
        await drive.files.delete({ fileId, supportsAllDrives: true });
        console.log(`🗑️ File ${fileId} deleted from Drive`);
    }
    catch (err) {
        const status = err?.response?.status || err?.code;
        console.error('❌ Drive delete error:', { status, message: err.message });
        throw new Error('Failed to delete file from Google Drive');
    }
};
