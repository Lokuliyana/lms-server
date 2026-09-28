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
exports.Class = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const classSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    batches: [
        {
            batch_name: { type: String, required: true },
            day: { type: String, required: true },
            start: { type: String, required: true },
            end: { type: String, required: true },
        },
    ],
    format: {
        type: String,
        enum: ["theory", "revision", "seminar"],
        required: true,
    },
    type: {
        type: String,
        enum: ["special", "regular", "custom"],
        required: true,
    },
    subject: { type: String, required: true },
    grade: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
    zoom_meeting_id: { type: String },
    zoom_join_url: { type: String },
    zoom_start_url: { type: String },
    is_deleted: { type: Boolean, default: false },
    created_by: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    quizzes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Quiz" }],
    recordings: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Recording" }],
    // Fix 2.1: Drop ClassEnrollment, use enrolled_students directly
    enrolled_students: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true }],
    created_at: { type: Date, default: Date.now },
});
exports.Class = mongoose_1.default.model("Class", classSchema);
