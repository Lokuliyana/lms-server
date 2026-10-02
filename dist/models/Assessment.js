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
exports.Assessment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const assessmentSchema = new mongoose_1.Schema({
    frontend_id: { type: String, sparse: true, unique: true },
    type: { type: String, enum: ['quiz', 'challenge'], required: true, default: 'quiz' },
    class_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Class', required: false },
    title: { type: String, required: true },
    instructions: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
    subject: { type: String },
    time_limit_sec: { type: Number, default: 0 },
    question_count: { type: Number },
    version: { type: Number, default: 1 },
    matchmaking_enabled: { type: Boolean, default: true },
    async_enabled: { type: Boolean, default: true },
    created_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now },
    is_deleted: { type: Boolean, default: false },
});
assessmentSchema.index({ class_id: 1, is_active: 1 });
assessmentSchema.index({ subject: 1, difficulty: 1 });
assessmentSchema.index({ type: 1 });
exports.Assessment = mongoose_1.default.models.Assessment || mongoose_1.default.model('Assessment', assessmentSchema);
