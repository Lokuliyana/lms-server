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
exports.AssessmentSubmission = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const assessmentSubmissionSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    assessment_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    subject: { type: String },
    paper_title: { type: String },
    answers: [
        {
            question_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AssessmentQuestion', required: true },
            answer: mongoose_1.Schema.Types.Mixed,
            is_correct: { type: Boolean, required: true },
            score: { type: Number, required: true, default: 0 },
            time_ms: { type: Number, default: 0 },
        },
    ],
    total_score: { type: Number, required: true },
    max_score: { type: Number, required: true, default: 0 },
    total_questions: { type: Number },
    correct_answers: { type: Number },
    time_spent: { type: Number, required: true },
    submitted_at: { type: Date, default: Date.now },
    attempt_number: { type: Number, default: 1 },
    feedback_given: { type: Boolean, default: false },
    device_info: { type: String },
    ip_address: { type: String },
});
assessmentSubmissionSchema.index({ user_id: 1, assessment_id: 1, attempt_number: 1 }, { unique: true });
assessmentSubmissionSchema.index({ assessment_id: 1, attempt_number: 1, submitted_at: 1 });
assessmentSubmissionSchema.index({ user_id: 1, assessment_id: 1, submitted_at: -1 });
exports.AssessmentSubmission = mongoose_1.default.models.AssessmentSubmission || mongoose_1.default.model('AssessmentSubmission', assessmentSubmissionSchema);
