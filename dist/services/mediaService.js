"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMedia = exports.uploadMedia = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supabaseClient_1 = require("../utils/supabaseClient");
const env_1 = require("../config/env");
const File_1 = require("../models/File");
const mongoose_1 = __importDefault(require("mongoose"));
const BUCKET = process.env.SUPABASE_BUCKET || 'files';
const VALID_OWNER_TYPES = ['class', 'quiz', 'answer', 'enrollment', 'assignment', 'user', 'other'];
const uploadMedia = async ({ fileBuffer, path: targetPath, ownerType, ownerId, contentType, }) => {
    const safeOwnerType = VALID_OWNER_TYPES.includes(ownerType) ? ownerType : 'other';
    const safeOwnerId = mongoose_1.default.Types.ObjectId.isValid(ownerId) ? new mongoose_1.default.Types.ObjectId(ownerId) : undefined;
    let cleanPath = targetPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (cleanPath.includes('/uploads/')) {
        cleanPath = cleanPath.split('/uploads/').pop();
    }
    else if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.slice('uploads/'.length);
    }
    // Check if offline local storage mode is active or Supabase client is missing
    if (env_1.LOCAL_STORAGE_MODE || !supabaseClient_1.supabase) {
        const fullPath = path_1.default.join(process.cwd(), 'public/uploads', cleanPath);
        const dir = path_1.default.dirname(fullPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        fs_1.default.writeFileSync(fullPath, fileBuffer);
        const port = process.env.PORT || 5000;
        const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
        const publicUrl = `${baseUrl}/uploads/${cleanPath}`;
        const fileDoc = await File_1.File.create({
            ownerType: safeOwnerType,
            ownerId: safeOwnerId,
            filePath: cleanPath,
            previewUrl: publicUrl,
            contentType,
            size: fileBuffer.length,
        });
        return {
            fileId: fileDoc?._id,
            filePath: cleanPath,
            publicUrl,
        };
    }
    // Cloud Supabase upload
    const { error: uploadError } = await supabaseClient_1.supabase.storage
        .from(BUCKET)
        .upload(cleanPath, fileBuffer, {
        upsert: true,
        contentType: contentType || 'application/octet-stream',
        cacheControl: '3600',
    });
    if (uploadError)
        throw uploadError;
    const { data: pub } = supabaseClient_1.supabase.storage.from(BUCKET).getPublicUrl(cleanPath);
    const fileDoc = await File_1.File.create({
        ownerType: safeOwnerType,
        ownerId: safeOwnerId,
        filePath: cleanPath,
        previewUrl: pub.publicUrl,
        contentType,
        size: fileBuffer.length,
    });
    return {
        fileId: fileDoc?._id,
        filePath: cleanPath,
        publicUrl: pub.publicUrl,
    };
};
exports.uploadMedia = uploadMedia;
const deleteMedia = async (filePath, bucket = BUCKET) => {
    let cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (cleanPath.includes('/uploads/')) {
        cleanPath = cleanPath.split('/uploads/').pop();
    }
    else if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.slice('uploads/'.length);
    }
    if (env_1.LOCAL_STORAGE_MODE || !supabaseClient_1.supabase) {
        const fullPath = path_1.default.join(process.cwd(), 'public/uploads', cleanPath);
        if (fs_1.default.existsSync(fullPath)) {
            try {
                fs_1.default.unlinkSync(fullPath);
            }
            catch (err) {
                console.warn('Failed to delete local file:', err);
            }
        }
        await File_1.File.deleteOne({
            $or: [
                { filePath: { $in: [filePath, cleanPath] } },
                { previewUrl: filePath },
            ],
        });
        return true;
    }
    const { error } = await supabaseClient_1.supabase.storage.from(bucket).remove([cleanPath]);
    if (error)
        throw error;
    await File_1.File.deleteOne({
        $or: [
            { filePath: { $in: [filePath, cleanPath] } },
            { previewUrl: filePath },
        ],
    });
    return true;
};
exports.deleteMedia = deleteMedia;
