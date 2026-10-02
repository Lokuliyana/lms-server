"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizQuestion = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const quizQuestionSchema = new Schema({
    frontend_id: { type: String, sparse: true, unique: true },
    quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    type: {
        type: String,
        enum: ['mcq', 'true-false', 'fill-blank', 'multiple-select', 'slider', 'drag-drop'],
        required: true
    },
    question: { type: String, required: true },
    options: {
        type: [String], // For MCQ, multiple-select
        default: undefined
    },
    image: { type: String, default: null },
    correct_answer: {
        type: Schema.Types.Mixed, // Can be index, string, array, boolean, or number
        required: true
    },
    explanation: { type: String },
    marks: { type: Number, required: true },
    // Optional fields for advanced types
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
quizQuestionSchema.index({ quiz_id: 1 });
exports.QuizQuestion = mongoose_1.default.model('QuizQuestion', quizQuestionSchema);
