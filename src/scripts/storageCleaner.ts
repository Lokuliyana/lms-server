import cron from "node-cron";
import { File } from "../models/File";
import { deleteMedia } from "../services/mediaService";

export const initStorageCleaner = () => {
  // Run every night at 3:00 AM
  cron.schedule("0 3 * * *", async () => {
    console.log("[CRON] Running storage cleaner job...");
    try {
      const now = new Date();
      const expiredFiles = await File.find({
        expiresAt: { $exists: true, $ne: null, $lt: now }
      }).limit(100);

      let deletedCount = 0;
      for (const file of expiredFiles) {
        try {
          if (file.filePath) {
            await deleteMedia(file.filePath, process.env.SUPABASE_BUCKET || 'files');
          }
          await File.findByIdAndDelete(file._id);
          deletedCount++;
        } catch (fileErr) {
          console.error(`[CRON] Failed to delete file ${file._id} (${file.filePath}):`, fileErr);
        }
      }

      console.log(`[CRON] Storage cleaner job finished. Swept ${deletedCount} expired files.`);
    } catch (error) {
      console.error("[CRON] Storage cleaner job failed:", error);
    }
  });
};
