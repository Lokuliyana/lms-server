const googleDrive = require('../utils/googleDrive');
import { Readable } from 'stream';

/**
 * Upload a new recording video to Google Drive.
 * @param file - Multer file object
 * @param title - Recording title
 */
export const uploadRecordingToDrive = async (file: Express.Multer.File, title: string) => {
  const stream = Readable.from(file.buffer);
  const fileId = await googleDrive.uploadFileToDrive(stream, `${title}.mp4`, file.mimetype);
  return fileId;
};

/**
 * Replace an existing video file on Google Drive with a new one.
 * @param oldFileId - The file ID to be replaced
 * @param newFile - Multer file object for new video
 * @param newTitle - New file title
 */
export const replaceRecordingOnDrive = async (oldFileId: string, newFile: Express.Multer.File, newTitle: string) => {
  await googleDrive.deleteFileFromDrive(oldFileId);
  const stream = Readable.from(newFile.buffer);
  const newFileId = await googleDrive.uploadFileToDrive(stream, `${newTitle}.mp4`, newFile.mimetype);
  return newFileId;
};

/**
 * Delete a recording video file from Google Drive
 * @param fileId - Google Drive file ID
 */
export const deleteRecordingFromDrive = async (fileId: string) => {
  await googleDrive.deleteFileFromDrive(fileId);
};

/**
 * Get a streamable file from Google Drive by file ID
 * @param fileId - The ID of the file to stream
 */
export const getRecordingStreamFromDrive = async (fileId: string) => {
  const stream = await googleDrive.getDriveStream(fileId);
  return stream;
};
