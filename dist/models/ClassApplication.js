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
exports.ClassApplication = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const classApplicationSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    class_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Class', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], required: true, default: 'pending' },
    requested_month: { type: String, match: [/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM"], default: null, index: true },
    supporting_document: { type: String, default: null }, // URL or base64
    applied_at: { type: Date, default: Date.now },
    approved_by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
}, {
    collection: 'classApplications',
    timestamps: true,
});
classApplicationSchema.index({ user_id: 1, class_id: 1, requested_month: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });
classApplicationSchema.index({ status: 1, createdAt: -1 });
classApplicationSchema.index({ class_id: 1, status: 1, createdAt: -1 });
classApplicationSchema.index({ user_id: 1, status: 1, createdAt: -1 });
exports.ClassApplication = mongoose_1.default.model('ClassApplication', classApplicationSchema);
