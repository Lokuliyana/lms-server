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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudyPack = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const customVideoSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    provider: {
        type: String,
        enum: ['youtube', 'upload', 'vimeo', 'external'],
        default: 'youtube',
    },
}, { _id: true });
const studyMaterialSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    file_url: { type: String, required: true, trim: true },
    file_type: { type: String, default: 'pdf' },
    size_bytes: { type: Number, default: 0 },
}, { _id: true });
const studyPackSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    grade: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Grade' },
    class_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Class' },
    subject: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Subject' },
    price: { type: Number, required: true, default: 0, min: 0 },
    thumbnail_url: { type: String, default: '' },
    recordings: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Recording' }],
    custom_videos: [customVideoSchema],
    materials: [studyMaterialSchema],
    is_published: { type: Boolean, default: true },
    created_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
studyPackSchema.index({ is_published: 1, grade: 1, class_id: 1 });
studyPackSchema.index({ title: 'text', description: 'text' });
exports.StudyPack = mongoose_1.default.models.StudyPack || mongoose_1.default.model('StudyPack', studyPackSchema);
