import { supabase } from '../utils/supabaseClient';
import { File } from '../models/File';
import mongoose from 'mongoose';

const BUCKET = process.env.SUPABASE_BUCKET || 'files';

export const uploadMedia = async ({
  fileBuffer,
  path,
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
  if (!supabase) throw new Error('Supabase client not initialized');
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBuffer, {
      upsert: true,
      contentType: contentType || 'application/octet-stream',
      cacheControl: '3600',
    });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const fileDoc = await File.create({
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

export const deleteMedia = async (filePath: string, bucket: string = BUCKET) => {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) throw error;
  await File.deleteOne({ filePath });
  return true;
};
