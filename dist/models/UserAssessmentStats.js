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
exports.UserAssessmentStats = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const userAssessmentStatsSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', unique: true },
    elo: { type: Number, default: 1200 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    ties: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    last_played_at: { type: Date },
    by_subject: [{
            subject: String,
            elo: Number,
            wins: Number,
            losses: Number
        }],
    by_class: [{
            class_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Class' },
            elo: Number,
            wins: Number,
            losses: Number
        }]
}, { timestamps: true });
userAssessmentStatsSchema.index({ elo: -1 });
userAssessmentStatsSchema.index({ 'by_subject.subject': 1, 'by_subject.elo': -1 });
userAssessmentStatsSchema.index({ 'by_class.class_id': 1, 'by_class.elo': -1 });
exports.UserAssessmentStats = mongoose_1.default.models.UserAssessmentStats || mongoose_1.default.model('UserAssessmentStats', userAssessmentStatsSchema);
