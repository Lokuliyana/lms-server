"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeMatch = void 0;
// models/ChallengeMatch.js
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const challengeMatchSchema = new Schema({
    quiz_id: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    mode: { type: String, enum: ["live", "async"], required: true },
    status: {
        type: String,
        enum: ["queued", "in_progress", "completed", "expired", "cancelled"],
        default: "queued",
    },
    p1_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    p2_id: { type: Schema.Types.ObjectId, ref: "User" },
    class_id: { type: Schema.Types.ObjectId, ref: "Class" },
    requires_enrollment: { type: Boolean, default: false },
    question_seed: { type: String, required: true },
    quiz_version: { type: Number, required: true },
    time_limit_sec: { type: Number, default: 0 },
    // attach submissions (normal QuizSubmission ids)
    p1_submission_id: { type: Schema.Types.ObjectId, ref: "QuizSubmission" },
    p2_submission_id: { type: Schema.Types.ObjectId, ref: "QuizSubmission" },
    p1_score_pct: Number,
    p2_score_pct: Number,
    p1_time_ms: Number,
    p2_time_ms: Number,
    winner: { type: Schema.Types.ObjectId, ref: "User" },
    p1_powerups: [
        {
            key: { type: String, enum: ["fifty_fifty", "+15s", "double"] },
            at_ms: Number,
            qid: Schema.Types.ObjectId,
        },
    ],
    p2_powerups: [
        {
            key: { type: String, enum: ["fifty_fifty", "+15s", "double"] },
            at_ms: Number,
            qid: Schema.Types.ObjectId,
        },
    ],
    p1_streak_max: { type: Number, default: 0 },
    p2_streak_max: { type: Number, default: 0 },
    tiebreak: {
        type: String,
        enum: ["faster_time", "sudden_death", "none"],
        default: "none",
    },
    p1_elo_before: Number,
    p2_elo_before: Number,
    p1_elo_after: Number,
    p2_elo_after: Number,
    created_at: { type: Date, default: Date.now },
    started_at: { type: Date },
    completed_at: { type: Date },
});
challengeMatchSchema.index({ status: 1, mode: 1, class_id: 1 });
challengeMatchSchema.index({ p1_id: 1, status: 1 });
challengeMatchSchema.index({ p2_id: 1, status: 1 });
challengeMatchSchema.index({ quiz_id: 1, created_at: 1 });
exports.ChallengeMatch = mongoose_1.default.model('ChallengeMatch', challengeMatchSchema);
