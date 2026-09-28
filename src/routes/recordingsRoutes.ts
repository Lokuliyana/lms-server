import express from "express";
import { 
  createRecording, 
  updateRecording, 
  deleteRecording, 
  expireRecording, 
  getRecordingById, 
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
  requirePermission("recordings.update"),
  updateRecording
);

router.delete(
  "/:id",
  requirePermission("recordings.delete"), // Fix 3.1
  deleteRecording
);

router.put(
  "/:id/expire",
  requirePermission("recordings.update"),
  expireRecording
);

router.post(
  "/ticket",
  requirePermission("recordings.read"), // Fix 3.6
  createPreviewTicketHandler
);

// Stream via ticket (PUBLIC; no JWT)
router.get('/ticket/:ticket', previewByTicketPublic);

router.get(
  "/:id",
  requirePermission("recordings.read"),
  getRecordingById
);

// Note: Fix 3.6 says "DELETING the byte-proxy flow", so we do not include /proxy-ticket or /proxy/:fileId

export default router;
