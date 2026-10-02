import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Class } from '../models/Class';
import { Recording } from '../models/Recording';
import { ClassEntitlement } from '../models/ClassEntitlement';
import { hasActiveEntitlement } from '../services/entitlementService';
import { getProviderAndId, drivePreviewUrl } from '../utils/driveHelpers';
import { monthKey } from '../utils/monthKey';

import * as recordingService from '../services/recordingService';

const TICKET_SECRET = process.env.TICKET_SECRET || process.env.JWT_SECRET || "dev-secret";
const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,}$/;

async function assertAccess({ userId, role, fileId }: { userId: string, role: string, fileId: string }) {
  const recording = await Recording.findOne({ $or: [{ video_url: fileId }, { driveFileId: fileId }] }).lean();
  if (!recording || recording.is_expired) {
    const err: any = new Error("Access denied to this recording.");
    err.status = 403;
    throw err;
  }

  const classData = await Class.findById(recording.class_id).lean();
  if (!classData || classData.is_deleted) {
    const err: any = new Error("Class not found.");
    err.status = 404;
    throw err;
  }

  const privileged = ["teacher", "moderator", "admin"].includes(role || "student");
  if (privileged) return;

  const enrolledArray = classData.enrolled_students || [];
  const isEnrolled = enrolledArray.some((s: any) => String(s._id || s) === String(userId));

  if (!isEnrolled) {
    const err: any = new Error("You are not enrolled in this class.");
    err.status = 403;
    throw err;
  }

  // Fix 3.6: Check ClassEntitlement just like assignments
  const targetMonthKey = recording.month_key || (recording.session_date ? monthKey(new Date(recording.session_date), "Asia/Colombo") : monthKey(new Date(), "Asia/Colombo"));

  const hasEntitlement = await hasActiveEntitlement(userId.toString(), recording.class_id.toString(), targetMonthKey);

  if (!hasEntitlement) {
    const err: any = new Error("No active monthly payment (Entitlement missing)");
    err.status = 403;
    throw err;
  }
}

export const createRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await recordingService.createRecording(req.body);
    res.status(201).json({ message: "Recording created.", recording: doc });
  } catch (err: any) {
    console.error("Create error:", err);
    res.status(err.status || 500).json({ message: err.message || "Failed to create recording." });
  }
};

export const updateRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rec = await recordingService.updateRecording(String(id), req.body);
    if (!rec) {
      res.status(404).json({ message: "Recording not found." });
      return;
    }
    res.status(200).json({ message: "Recording updated.", recording: rec });
  } catch (err: any) {
    console.error("Update error:", err);
    res.status(err.status || 500).json({ message: err.message || "Failed to update recording." });
  }
};

export const deleteRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rec = await recordingService.deleteRecording(String(id));
    if (!rec) {
      res.status(404).json({ message: "Recording not found." });
      return;
    }
    res.status(200).json({ message: "Recording deleted." });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Failed to delete recording." });
  }
};

export const expireRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rec = await recordingService.expireRecording(String(id));
    if (!rec) {
      res.status(404).json({ message: "Recording not found." });
      return;
    }
    res.status(200).json({ message: "Recording expired." });
  } catch (err) {
    console.error("Expire error:", err);
    res.status(500).json({ message: "Failed to expire recording." });
  }
};

export const getRecordingsByClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawClassId = req.params.classId || req.params.id;
    if (!rawClassId) {
      res.status(400).json({ message: "classId is required" });
      return;
    }
    const recordings = await recordingService.getRecordingsByClass(String(rawClassId));
    res.status(200).json({ success: true, recordings, data: recordings });
  } catch (err: any) {
    console.error("getRecordingsByClass error:", err);
    res.status(500).json({ message: "Failed to fetch class recordings" });
  }
};

export const getRecordingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    if (!rawId || !mongoose.Types.ObjectId.isValid(String(rawId))) {
      res.status(400).json({ message: "Invalid recording ID" });
      return;
    }
    const doc: any = await recordingService.getRecordingById(String(rawId));
    if (!doc) {
      res.status(404).json({ message: "Recording not found" });
      return;
    }

    const classData: any = doc.class_id;
    const user = (req as any).user;
    const role = user?.role || 'student';
    const userId = (user?._id || user?.userId || '').toString();

    const isStaff = ['teacher', 'admin', 'moderator'].includes(role) ||
      user?.permissions?.includes('recordings.manage') ||
      user?.permissions?.includes('classes.update') ||
      user?.permissions?.includes('recordings.read');

    if (user && !isStaff) {
      const enrolledArray = classData?.enrolled_students || [];
      const isEnrolled = enrolledArray.some((s: any) => String(s?._id || s) === userId);
      if (!isEnrolled) {
        const { ClassEnrollment } = await import('../models/ClassEnrollment');
        const hasEnrollment = await ClassEnrollment.exists({ classId: classData?._id || doc.class_id, userId, status: 'active' });
        if (!hasEnrollment) {
          res.status(403).json({ message: "You are not enrolled in this class." });
          return;
        }
      }
    }

    res.json({ success: true, recording: doc, data: doc });
  } catch (e: any) {
    console.error("getRecordingById error:", e);
    res.status(500).json({ message: "Failed to fetch recording" });
  }
};

export const createPreviewTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.body || {};
    if (!fileId) {
      res.status(400).json({ message: "Invalid fileId" });
      return;
    }

    // Local / direct storage playback support
    if (fileId.startsWith('/uploads') || fileId.startsWith('http://') || fileId.startsWith('https://')) {
      res.json({ ticket: 'local', iframeSrc: fileId, url: fileId });
      return;
    }

    if (!DRIVE_ID_RE.test(fileId)) {
      res.status(400).json({ message: "Invalid fileId" });
      return;
    }

    const userId = (req as any).user?._id;
    const role = (req as any).user?.role || "student";
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await assertAccess({ userId: String(userId), role, fileId });

    const ticket = jwt.sign(
      { sub: String(userId), fid: fileId, typ: "preview" },
      TICKET_SECRET,
      { expiresIn: "90s" }
    );

    res.json({
      ticket,
      iframeSrc: `/api/recordings/ticket/${ticket}`,
      url: `/api/recordings/ticket/${ticket}`,
    });
  } catch (e: any) {
    const code = e.status || 500;
    console.error("createPreviewTicketHandler error:", e);
    res.status(code).json({ message: e.message || "Failed to create ticket" });
  }
};

export const previewByTicketPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticket } = req.params;
    if (!ticket) {
      res.status(400).send("Bad request");
      return;
    }

    if (ticket === 'local') {
      res.status(400).send("Local files are served directly");
      return;
    }

    const payload: any = jwt.verify(ticket as string, TICKET_SECRET);
    const fileId = payload?.fid;
    if (!DRIVE_ID_RE.test(fileId || "")) {
      res.status(400).send("Bad file id");
      return;
    }

    if (fileId && fileId.length === 11 && !fileId.includes('-') && !fileId.includes('_')) {
      res.redirect(302, `https://www.youtube.com/embed/${fileId}?rel=0`);
      return;
    }

    res.redirect(302, drivePreviewUrl(fileId));
  } catch (e) {
    console.error("previewByTicketPublic error:", e);
    res.status(410).send("Link expired");
  }
};

