import fs from 'fs';
import path from 'path';
import { supabase } from '../utils/supabaseClient';
import { LOCAL_STORAGE_MODE } from '../config/env';
import { File } from '../models/File';
import mongoose from 'mongoose';

const BUCKET = process.env.SUPABASE_BUCKET || 'files';
const VALID_OWNER_TYPES = ['class', 'quiz', 'answer', 'enrollment', 'assignment', 'user', 'other'];

export const uploadMedia = async ({
  fileBuffer,
  path: targetPath,
  ownerType,
  ownerId,
  contentType,
}: {
  fileBuffer: Buffer;
  path: string;
  ownerType: string;
  ownerId?: any;
  contentType: string;
}) => {
  const safeOwnerType = VALID_OWNER_TYPES.includes(ownerType) ? ownerType : 'other';
  const safeOwnerId = mongoose.Types.ObjectId.isValid(ownerId) ? new mongoose.Types.ObjectId(ownerId) : undefined;
  let cleanPath = targetPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (cleanPath.includes('/uploads/')) {
    cleanPath = cleanPath.split('/uploads/').pop()!;
  } else if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.slice('uploads/'.length);
  }

  // Check if offline local storage mode is active or Supabase client is missing
  if (LOCAL_STORAGE_MODE || !supabase) {
    const fullPath = path.join(process.cwd(), 'public/uploads', cleanPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, fileBuffer);

    const port = process.env.PORT || 5000;
    const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
    const publicUrl = `${baseUrl}/uploads/${cleanPath}`;

    const fileDoc = await File.create({
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
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(cleanPath, fileBuffer, {
      upsert: true,
      contentType: contentType || 'application/octet-stream',
      cacheControl: '3600',
    });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(cleanPath);

  const fileDoc = await File.create({
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

export const deleteMedia = async (filePath: string, bucket: string = BUCKET) => {
  let cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (cleanPath.includes('/uploads/')) {
    cleanPath = cleanPath.split('/uploads/').pop()!;
  } else if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.slice('uploads/'.length);
  }

  if (LOCAL_STORAGE_MODE || !supabase) {
    const fullPath = path.join(process.cwd(), 'public/uploads', cleanPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.warn('Failed to delete local file:', err);
      }
    }
    await File.deleteOne({
      $or: [
        { filePath: { $in: [filePath, cleanPath] } },
        { previewUrl: filePath },
      ],
    });
    return true;
  }

  const { error } = await supabase.storage.from(bucket).remove([cleanPath]);
  if (error) throw error;
  await File.deleteOne({
    $or: [
      { filePath: { $in: [filePath, cleanPath] } },
      { previewUrl: filePath },
    ],
  });
  return true;
};

