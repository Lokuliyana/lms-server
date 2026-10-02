import express from "express";
import { 
  createRecording, 
  updateRecording, 
  deleteRecording, 
  expireRecording, 
  getRecordingById, 
  getRecordingsByClass,
  createPreviewTicketHandler, 
  previewByTicketPublic 
} from "../controllers/recordingController";
import { requirePermission } from "../middlewares/auth";

const router = express.Router();

router.post(
  "/",
  requirePermission("recordings.create"), // Fix 3.1
  createRecording
);

router.put(
  "/:id",
  requirePermission("recordings.create"),
  updateRecording
);

router.delete(
  "/:id",
  requirePermission("recordings.delete"), // Fix 3.1
  deleteRecording
);

router.put(
  "/:id/expire",
  requirePermission("recordings.create"),
  expireRecording
);

router.post(
  "/ticket",
  requirePermission("recordings.read"), // Fix 3.6
  createPreviewTicketHandler
);

router.post(
  "/proxy-ticket",
  requirePermission("recordings.read"),
  createPreviewTicketHandler
);

// Stream via ticket (PUBLIC; no JWT)
router.get('/ticket/:ticket', previewByTicketPublic);

router.get(
  "/class/:classId",
  requirePermission("recordings.read"),
  getRecordingsByClass
);

router.get(
  "/:id",
  requirePermission("recordings.read"),
  getRecordingById
);

export default router;

