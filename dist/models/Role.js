"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const roleSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    client_id: { type: mongoose_1.default.Schema.Types.ObjectId }, // Optional for multi-tenant isolation if needed
    is_system_role: { type: Boolean, default: false }
}, { timestamps: true });
exports.Role = mongoose_1.default.model('Role', roleSchema);
