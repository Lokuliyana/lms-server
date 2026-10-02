import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { uploadMedia, deleteMedia } from '../services/mediaService';

// Dynamic import for file-type (ESM)
// @ts-ignore
const fileTypePromise = new Function('return import("file-type")')();

export const upload = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Fix 3.2: Validate magic numbers to prevent MIME forgery and block malicious executables
    let actualMimeType = req.file.mimetype;
    try {
      const fileType = await fileTypePromise;
      const typeInfo = await fileType.fileTypeFromBuffer(req.file.buffer);
      if (typeInfo) {
        const dangerousMimes = [
          'application/x-msdownload',
          'application/x-dosexec',
          'application/x-executable',
          'application/x-sh'
        ];
        if (dangerousMimes.includes(typeInfo.mime)) {
          res.status(400).json({ message: 'Executable files are not permitted' });
          return;
        }
        actualMimeType = typeInfo.mime;
      }
    } catch {
      // Fallback safely to req.file.mimetype if file-type detection is unavailable
    }

    const { ownerType, ownerId } = req.body || {};
    const validOwnerTypes = ['class', 'quiz', 'answer', 'enrollment', 'assignment', 'user', 'other'];
    const resolvedOwnerType = validOwnerTypes.includes(ownerType) ? ownerType : 'other';
    const userId = req.user ? (req.user._id || req.user.userId) : undefined;
    const finalOwnerId = mongoose.Types.ObjectId.isValid(ownerId)
      ? ownerId
      : (userId && mongoose.Types.ObjectId.isValid(userId) ? userId : undefined);

    const safeName = req.file.originalname.replace(/\s+/g, '-');
    const path = `${resolvedOwnerType}/${finalOwnerId ? finalOwnerId.toString() : 'general'}/${Date.now()}-${safeName}`;

    const { publicUrl, filePath, fileId } = await uploadMedia({
      fileBuffer: req.file.buffer,
      contentType: actualMimeType,
      path,
      ownerType: resolvedOwnerType,
      ownerId: finalOwnerId,
    });

    res.json({ success: true, publicUrl, filePath, fileId });
  } catch (e: any) {
    console.error('Error uploading file:', e);
    res.status(500).json({ message: e.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filePath, bucket } = req.body;
    if (!filePath) {
      res.status(400).json({ message: 'filePath required' });
      return;
    }

    await deleteMedia(filePath, bucket || 'files');
    res.status(200).json({ success: true, message: 'File deleted' });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: error.message });
  }
};
