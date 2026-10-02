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
exports.AssessmentQuestion = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const assessmentQuestionSchema = new mongoose_1.Schema({
    frontend_id: { type: String, sparse: true, unique: true },
    assessment_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    type: {
        type: String,
        enum: ['mcq', 'true-false', 'fill-blank', 'multiple-select', 'slider', 'drag-drop'],
        required: true
    },
    question: { type: String, required: true },
    options: {
        type: [String],
        default: undefined
    },
    image: { type: String, default: null },
    correct_answer: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true
    },
    explanation: { type: String },
    marks: { type: Number, required: true },
    sliderRange: {
        min: { type: Number },
        max: { type: Number },
        step: { type: Number }
    },
    dragItems: {
        items: [String],
        matches: [String]
    }
});
assessmentQuestionSchema.index({ assessment_id: 1 });
exports.AssessmentQuestion = mongoose_1.default.models.AssessmentQuestion || mongoose_1.default.model('AssessmentQuestion', assessmentQuestionSchema);
