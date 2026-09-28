"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMedia = exports.uploadMedia = void 0;
const supabaseClient_1 = require("../utils/supabaseClient");
const File_1 = require("../models/File");
const BUCKET = process.env.SUPABASE_BUCKET || 'files';
const uploadMedia = async ({ fileBuffer, path, ownerType, ownerId, contentType, }) => {
    if (!supabaseClient_1.supabase)
        throw new Error('Supabase client not initialized');
    const { error: uploadError } = await supabaseClient_1.supabase.storage
        .from(BUCKET)
        .upload(path, fileBuffer, {
        upsert: true,
        contentType: contentType || 'application/octet-stream',
        cacheControl: '3600',
    });
    if (uploadError)
        throw uploadError;
    const { data: pub } = supabaseClient_1.supabase.storage.from(BUCKET).getPublicUrl(path);
    const fileDoc = await File_1.File.create({
        ownerType,
        ownerId,
        filePath: path,
        previewUrl: pub.publicUrl,
        contentType,
    });
    return {
        fileId: fileDoc?._id,
        filePath: path,
        publicUrl: pub.publicUrl,
    };
};
exports.uploadMedia = uploadMedia;
const deleteMedia = async (filePath, bucket = BUCKET) => {
    if (!supabaseClient_1.supabase)
        throw new Error('Supabase client not initialized');
    const { error } = await supabaseClient_1.supabase.storage.from(bucket).remove([filePath]);
    if (error)
        throw error;
    await File_1.File.deleteOne({ filePath });
    return true;
};
exports.deleteMedia = deleteMedia;
