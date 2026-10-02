"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentProfile = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const studentProfileSchema = new mongoose_1.default.Schema({
    // Fix 1.8: user_id not unique on profile models -> Add unique: true index
    user_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    full_name: { type: String, required: true },
    avatar_url: { type: String },
    school: { type: String },
    grade: { type: String },
    birth_date: { type: Date },
    ol_year: { type: String },
    al_year: { type: String },
    bio: { type: String },
    qualifications: { type: String }
}, { timestamps: true });
exports.StudentProfile = mongoose_1.default.model('StudentProfile', studentProfileSchema);
