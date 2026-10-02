import mongoose from 'mongoose';
import { Readable } from 'stream';
import { Recording, IRecording } from '../models/Recording';
import { Class } from '../models/Class';
import { getProviderAndId } from '../utils/driveHelpers';
import { monthKey } from '../utils/monthKey';

const googleDrive = require('../utils/googleDrive');

/**
 * Resolve direct playback URL based on provider and local/direct storage.
 */
export const resolvePlaybackUrl = (doc: any): string => {
  if (!doc) return '';
  if (doc.provider === 'local' || (doc.driveUrl && doc.driveUrl.includes('/uploads/'))) {
    return doc.driveUrl || doc.video_url;
  }
  if (doc.provider === 'youtube') {
    const ytId = doc.driveFileId || doc.video_url;
    return `https://www.youtube.com/embed/${ytId}`;
  }
  return doc.video_url || doc.driveUrl || doc.driveFileId || '';
};

/**
 * Create a new recording and link it reliably to the corresponding Class.
 */
export const createRecording = async (data: {
  class_id: string;
  title: string;
  driveUrl: string;
  session_date: string | Date;
  batch_name?: string;
}) => {
  const { class_id, title, driveUrl, session_date, batch_name } = data;
  if (!class_id || !title || !driveUrl || !session_date) {
    const err: any = new Error("class_id, title, driveUrl, session_date are required.");
    err.status = 400;
    throw err;
  }

  let fileId = '';
  let provider = 'drive';

  const result = getProviderAndId(driveUrl);
  if (result) {
    fileId = result.id;
    provider = result.provider;
  } else if (driveUrl.includes('/uploads/') || driveUrl.startsWith('http://') || driveUrl.startsWith('https://') || driveUrl.startsWith('/uploads/')) {
    fileId = driveUrl.trim();
    provider = 'local';
  } else {
    const err: any = new Error("Invalid video link (must be Google Drive, YouTube, or direct upload URL).");
    err.status = 400;
    throw err;
  }

  const dt = new Date(session_date);
  if (isNaN(dt.getTime())) {
    const err: any = new Error("Invalid session_date format.");
    err.status = 400;
    throw err;
  }
  const mk = monthKey(dt, "Asia/Colombo");

  const doc = await Recording.create({
    class_id,
    title: String(title).trim(),
    driveUrl: String(driveUrl).trim(),
    driveFileId: fileId,
    video_url: fileId,
    provider: provider as any,
    session_date: dt,
    month_key: mk,
    batch_name,
    is_deleted: false,
  });

  // Link recording directly into Class recordings list
  if (mongoose.Types.ObjectId.isValid(class_id)) {
    await Class.updateOne({ _id: class_id }, { $addToSet: { recordings: doc._id } });
  }

  return doc;
};

/**
 * Fetch all recordings for a class, populated and sorted by session date.
 */
export const getRecordingsByClass = async (rawClassId: string) => {
  const query: any = { is_deleted: { $ne: true } };
  if (mongoose.Types.ObjectId.isValid(rawClassId)) {
    query.class_id = new mongoose.Types.ObjectId(rawClassId);
  } else {
    query.class_id = rawClassId;
  }

  const recordings = await Recording.find(query)
    .populate({
      path: 'class_id',
      select: 'title subject grade',
      populate: [
        { path: 'subject', select: 'name' },
        { path: 'grade', select: 'name' },
      ],
    })
    .sort({ session_date: -1 })
    .lean();

  return recordings.map((r: any) => ({
    ...r,
    playback_url: resolvePlaybackUrl(r),
  }));
};

/**
 * Fetch a single recording by ID, populating class and taxonomy references.
 */
export const getRecordingById = async (rawId: string) => {
  if (!rawId || !mongoose.Types.ObjectId.isValid(String(rawId))) {
    return null;
  }

  const doc = await Recording.findById(rawId)
    .populate({
      path: 'class_id',
      select: 'title subject grade enrolled_students is_deleted',
      populate: [
        { path: 'subject', select: 'name' },
        { path: 'grade', select: 'name' },
      ],
    })
    .lean();

  if (!doc || doc.is_deleted) {
    return null;
  }

  return {
    ...doc,
    playback_url: resolvePlaybackUrl(doc),
  };
};

/**
 * Update recording metadata.
 */
export const updateRecording = async (id: string, updates: any) => {
  const rec = await Recording.findById(id);
  if (!rec) return null;

  const { title, driveUrl, session_date, batch_name, is_expired } = updates;
  if (typeof title === 'string' && title.trim()) rec.title = title.trim();
  if (typeof driveUrl === 'string' && driveUrl.trim()) {
    const result = getProviderAndId(driveUrl);
    if (result) {
      rec.driveUrl = driveUrl.trim();
      rec.driveFileId = result.id;
      rec.video_url = result.id;
      rec.provider = result.provider as any;
    } else if (driveUrl.includes('/uploads/') || driveUrl.startsWith('http://') || driveUrl.startsWith('https://') || driveUrl.startsWith('/uploads/')) {
      rec.driveUrl = driveUrl.trim();
      rec.driveFileId = driveUrl.trim();
      rec.video_url = driveUrl.trim();
      rec.provider = 'local' as any;
    } else {
      const err: any = new Error("Invalid video link.");
      err.status = 400;
      throw err;
    }
  }

  if (typeof batch_name === 'string') rec.batch_name = batch_name;
  if (typeof is_expired === 'boolean') rec.is_expired = is_expired;
  if (typeof session_date !== 'undefined') {
    const dt = new Date(session_date);
    if (isNaN(dt.getTime())) {
      const err: any = new Error("Invalid session_date format.");
      err.status = 400;
      throw err;
    }
    rec.session_date = dt;
    rec.month_key = monthKey(dt, "Asia/Colombo");
  }

  await rec.save();
  return rec;
};

/**
 * Soft delete recording and unlink from Class.
 */
export const deleteRecording = async (id: string) => {
  const rec = await Recording.findById(id);
  if (!rec) return null;

  rec.is_deleted = true;
  await rec.save();

  if (rec.class_id) {
    await Class.updateOne({ _id: rec.class_id }, { $pull: { recordings: rec._id } });
  }

  return rec;
};

/**
 * Mark recording as expired.
 */
export const expireRecording = async (id: string) => {
  const rec = await Recording.findById(id);
  if (!rec) return null;

  rec.is_expired = true;
  await rec.save();
  return rec;
};

/**
 * Upload a new recording video to Google Drive.
 */
export const uploadRecordingToDrive = async (file: Express.Multer.File, title: string) => {
  const stream = Readable.from(file.buffer);
  const fileId = await googleDrive.uploadFileToDrive(stream, `${title}.mp4`, file.mimetype);
  return fileId;
};

/**
 * Replace an existing video file on Google Drive with a new one.
 */
export const replaceRecordingOnDrive = async (oldFileId: string, newFile: Express.Multer.File, newTitle: string) => {
  await googleDrive.deleteFileFromDrive(oldFileId);
  const stream = Readable.from(newFile.buffer);
  const newFileId = await googleDrive.uploadFileToDrive(stream, `${newTitle}.mp4`, newFile.mimetype);
  return newFileId;
};

/**
 * Delete a recording video file from Google Drive
 */
export const deleteRecordingFromDrive = async (fileId: string) => {
  await googleDrive.deleteFileFromDrive(fileId);
};

/**
 * Get a streamable file from Google Drive by file ID
 */
export const getRecordingStreamFromDrive = async (fileId: string) => {
  const stream = await googleDrive.getDriveStream(fileId);
  return stream;
};
