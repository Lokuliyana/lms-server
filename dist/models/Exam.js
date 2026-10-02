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
exports.Exam = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const examSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    class_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    exam_type: {
        type: String,
        enum: ['paper', 'online', 'hybrid'],
        default: 'paper',
    },
    total_marks: { type: Number, required: true, default: 100, min: 1 },
    pass_marks: { type: Number, required: true, default: 40, min: 0 },
    held_date: { type: Date, required: true, default: Date.now },
    question_paper_url: { type: String, default: '' },
    marking_scheme_url: { type: String, default: '' },
    is_published: { type: Boolean, default: false, index: true },
    created_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
examSchema.index({ class_id: 1, held_date: -1 });
exports.Exam = mongoose_1.default.models.Exam || mongoose_1.default.model('Exam', examSchema);
