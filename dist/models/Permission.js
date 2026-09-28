"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const permissionSchema = new mongoose_1.default.Schema({
    key: { type: String, required: true, unique: true }, // e.g. "classes.create"
    module: { type: String, required: true },
    action: { type: String, required: true },
    label: { type: String, required: true }
}, { timestamps: true });
exports.Permission = mongoose_1.default.model('Permission', permissionSchema);
