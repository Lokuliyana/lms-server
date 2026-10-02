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
exports.AttendanceRecord = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const StudentAttendanceSchema = new mongoose_1.Schema({
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
        type: String,
        enum: ["present", "absent", "late", "excused"],
        default: "present",
        required: true,
    },
    note: { type: String, default: "" },
}, { _id: false });
const AttendanceRecordSchema = new mongoose_1.Schema({
    classId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    date: { type: Date, required: true, index: true },
    sessionTitle: { type: String, default: "Regular Class Session" },
    sessionType: {
        type: String,
        enum: ["lecture", "tutorial", "revision", "exam", "other"],
        default: "lecture",
    },
    markedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    records: [StudentAttendanceSchema],
    notes: { type: String, default: "" },
}, { timestamps: true });
// Index for query optimization
AttendanceRecordSchema.index({ classId: 1, date: -1 });
AttendanceRecordSchema.index({ "records.studentId": 1 });
exports.AttendanceRecord = mongoose_1.default.model("AttendanceRecord", AttendanceRecordSchema);
exports.default = exports.AttendanceRecord;
