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

    // Fix 3.2: Use file-type to validate magic numbers to prevent MIME forgery.
    const fileType = await fileTypePromise;
    const typeInfo = await fileType.fileTypeFromBuffer(req.file.buffer);
    
    if (!typeInfo) {
      res.status(400).json({ message: 'Invalid file format or unable to detect magic number' });
      return;
    }
    
    const actualMimeType = typeInfo.mime;
    
    const { ownerType, ownerId } = req.body;
    const finalOwnerId = mongoose.Types.ObjectId.isValid(ownerId) ? ownerId : undefined;

    const safeName = req.file.originalname.replace(/\s+/g, '-');
    const path = `${ownerType}/${ownerId}/${Date.now()}-${safeName}`;

    const { publicUrl, filePath, fileId } = await uploadMedia({
      fileBuffer: req.file.buffer,
      contentType: actualMimeType,
      path,
      ownerType,
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
