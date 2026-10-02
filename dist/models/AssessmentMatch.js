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
exports.AssessmentMatch = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const assessmentMatchSchema = new mongoose_1.Schema({
    assessment_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    mode: { type: String, enum: ['live', 'async'], required: true },
    status: {
        type: String,
        enum: ['queued', 'in_progress', 'completed', 'expired', 'cancelled'],
        default: 'queued',
    },
    p1_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    p2_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    class_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Class' },
    requires_enrollment: { type: Boolean, default: false },
    question_seed: { type: String, required: true },
    assessment_version: { type: Number, required: true },
    time_limit_sec: { type: Number, default: 0 },
    p1_submission_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AssessmentSubmission' },
    p2_submission_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AssessmentSubmission' },
    p1_score_pct: Number,
    p2_score_pct: Number,
    p1_time_ms: Number,
    p2_time_ms: Number,
    winner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    p1_powerups: [
        {
            key: { type: String, enum: ['fifty_fifty', '+15s', 'double'] },
            at_ms: Number,
            qid: mongoose_1.Schema.Types.ObjectId,
        },
    ],
    p2_powerups: [
        {
            key: { type: String, enum: ['fifty_fifty', '+15s', 'double'] },
            at_ms: Number,
            qid: mongoose_1.Schema.Types.ObjectId,
        },
    ],
    p1_streak_max: { type: Number, default: 0 },
    p2_streak_max: { type: Number, default: 0 },
    tiebreak: {
        type: String,
        enum: ['faster_time', 'sudden_death', 'none'],
        default: 'none',
    },
    p1_elo_before: Number,
    p2_elo_before: Number,
    p1_elo_after: Number,
    p2_elo_after: Number,
    created_at: { type: Date, default: Date.now },
    started_at: { type: Date },
    completed_at: { type: Date },
});
assessmentMatchSchema.index({ status: 1, mode: 1, class_id: 1 });
assessmentMatchSchema.index({ p1_id: 1, status: 1 });
assessmentMatchSchema.index({ p2_id: 1, status: 1 });
assessmentMatchSchema.index({ assessment_id: 1, created_at: 1 });
exports.AssessmentMatch = mongoose_1.default.models.AssessmentMatch || mongoose_1.default.model('AssessmentMatch', assessmentMatchSchema);
