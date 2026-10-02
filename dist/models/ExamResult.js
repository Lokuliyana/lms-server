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
exports.ExamResult = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StudentScoreSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    marksObtained: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, default: "F" },
    isAbsent: { type: Boolean, default: false },
    remarks: { type: String, default: "" },
}, { _id: false });
const ExamResultSchema = new mongoose_1.Schema({
    examId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Exam", required: false, index: true },
    classId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    examTitle: { type: String, required: true },
    examDate: { type: Date, required: true },
    termOrMonth: { type: String, default: "" },
    maxMarks: { type: Number, required: true, default: 100 },
    passMarks: { type: Number, default: 40 },
    isPublished: { type: Boolean, default: false, index: true },
    recordedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    scores: [StudentScoreSchema],
    notes: { type: String, default: "" },
}, { timestamps: true });
ExamResultSchema.index({ classId: 1, isPublished: 1, examDate: -1 });
ExamResultSchema.index({ "scores.studentId": 1 });
exports.ExamResult = mongoose_1.default.models.ExamResult || mongoose_1.default.model("ExamResult", ExamResultSchema);
exports.default = exports.ExamResult;
