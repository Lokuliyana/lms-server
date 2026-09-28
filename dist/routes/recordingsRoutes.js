"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const recordingController_1 = require("../controllers/recordingController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.post("/", (0, auth_1.requirePermission)("recordings.create"), // Fix 3.1
recordingController_1.createRecording);
router.put("/:id", (0, auth_1.requirePermission)("recordings.update"), recordingController_1.updateRecording);
router.delete("/:id", (0, auth_1.requirePermission)("recordings.delete"), // Fix 3.1
recordingController_1.deleteRecording);
router.put("/:id/expire", (0, auth_1.requirePermission)("recordings.update"), recordingController_1.expireRecording);
router.post("/ticket", (0, auth_1.requirePermission)("recordings.read"), // Fix 3.6
recordingController_1.createPreviewTicketHandler);
// Stream via ticket (PUBLIC; no JWT)
router.get('/ticket/:ticket', recordingController_1.previewByTicketPublic);
router.get("/:id", (0, auth_1.requirePermission)("recordings.read"), recordingController_1.getRecordingById);
// Note: Fix 3.6 says "DELETING the byte-proxy flow", so we do not include /proxy-ticket or /proxy/:fileId
exports.default = router;
