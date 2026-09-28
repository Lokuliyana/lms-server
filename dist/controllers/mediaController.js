"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.upload = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const mediaService_1 = require("../services/mediaService");
// Dynamic import for file-type (ESM)
// @ts-ignore
const fileTypePromise = Promise.resolve().then(() => __importStar(require('file-type')));
const upload = async (req, res) => {
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
        const finalOwnerId = mongoose_1.default.Types.ObjectId.isValid(ownerId) ? ownerId : undefined;
        const safeName = req.file.originalname.replace(/\s+/g, '-');
        const path = `${ownerType}/${ownerId}/${Date.now()}-${safeName}`;
        const { publicUrl, filePath, fileId } = await (0, mediaService_1.uploadMedia)({
            fileBuffer: req.file.buffer,
            contentType: actualMimeType,
            path,
            ownerType,
            ownerId: finalOwnerId,
        });
        res.json({ success: true, publicUrl, filePath, fileId });
    }
    catch (e) {
        console.error('Error uploading file:', e);
        res.status(500).json({ message: e.message });
    }
};
exports.upload = upload;
const remove = async (req, res) => {
    try {
        const { filePath, bucket } = req.body;
        if (!filePath) {
            res.status(400).json({ message: 'filePath required' });
            return;
        }
        await (0, mediaService_1.deleteMedia)(filePath, bucket || 'files');
        res.status(200).json({ success: true, message: 'File deleted' });
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.remove = remove;
