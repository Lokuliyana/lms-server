"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const mediaController_1 = require("../controllers/mediaController");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
const uploadMiddleware = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Fix 3.1: Apply requirePermission("recordings.create") and "recordings.delete" to upload/delete endpoints.
// We apply it here since media endpoints handle uploads.
router.post('/upload', (0, auth_1.requirePermission)('recordings.create'), uploadMiddleware.single('file'), mediaController_1.upload);
router.delete('/delete', (0, auth_1.requirePermission)('recordings.delete'), mediaController_1.remove);
exports.default = router;
