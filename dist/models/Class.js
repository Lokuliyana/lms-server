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
    classId: { type: Number, unique: true, sparse: true, index: true },
    class_code: { type: String, unique: true, sparse: true, index: true },
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
    subject: { type: mongoose_1.Schema.Types.ObjectId, ref: "Subject", required: true },
    grade: { type: mongoose_1.Schema.Types.ObjectId, ref: "Grade", required: true },
    price: { type: Number, required: true },
    delivery_type: {
        type: String,
        enum: ['online_only', 'physical_tute', 'both'],
        default: 'online_only'
    },
    institute_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Institute',
        default: null
    },
    physical_location: { type: String, default: '' },
    has_delivery_pack: { type: Boolean, default: false },
    delivery_fee: { type: Number, default: 0 },
    image: { type: String },
    zoom_meeting_id: { type: String },
    zoom_join_url: { type: String },
    zoom_start_url: { type: String },
    is_deleted: { type: Boolean, default: false },
    created_by: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    tutor: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    monthly_fee: { type: Number },
    quizzes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Quiz" }],
    recordings: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Recording" }],
    currency: { type: String, default: "LKR" },
    gateway_product_id: { type: String },
    gateway_price_id: { type: String },
    enrolled_students: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true }],
    created_at: { type: Date, default: Date.now },
});
classSchema.index({ subject: 1, grade: 1, is_deleted: 1 });
// Sequential enterprise identifier generator (e.g. classId: 1, 2, ... and class_code: CLS-0001, CLS-0002)
classSchema.pre('save', async function () {
    if (this.classId === undefined || this.classId === null) {
        const lastClass = await mongoose_1.default.model('Class').findOne({ classId: { $ne: null } }).sort({ classId: -1 }).select('classId').lean();
        this.classId = lastClass?.classId ? lastClass.classId + 1 : 1;
    }
    if (!this.class_code) {
        this.class_code = `CLS-${String(this.classId).padStart(4, '0')}`;
    }
});
exports.Class = mongoose_1.default.model("Class", classSchema);
