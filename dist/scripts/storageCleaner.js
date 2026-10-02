"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initStorageCleaner = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const File_1 = require("../models/File");
const mediaService_1 = require("../services/mediaService");
const initStorageCleaner = () => {
    // Run every night at 3:00 AM
    node_cron_1.default.schedule("0 3 * * *", async () => {
        console.log("[CRON] Running storage cleaner job...");
        try {
            const now = new Date();
            const expiredFiles = await File_1.File.find({
                expiresAt: { $exists: true, $ne: null, $lt: now }
            }).limit(100);
            let deletedCount = 0;
            for (const file of expiredFiles) {
                try {
                    if (file.filePath) {
                        await (0, mediaService_1.deleteMedia)(file.filePath, process.env.SUPABASE_BUCKET || 'files');
                    }
                    await File_1.File.findByIdAndDelete(file._id);
                    deletedCount++;
                }
                catch (fileErr) {
                    console.error(`[CRON] Failed to delete file ${file._id} (${file.filePath}):`, fileErr);
                }
            }
            console.log(`[CRON] Storage cleaner job finished. Swept ${deletedCount} expired files.`);
        }
        catch (error) {
            console.error("[CRON] Storage cleaner job failed:", error);
        }
    });
};
exports.initStorageCleaner = initStorageCleaner;
