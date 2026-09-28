"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermission = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const rolePermissionSchema = new mongoose_1.default.Schema({
    role_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Role', required: true },
    permission_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Permission', required: true }
}, { timestamps: true });
rolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });
exports.RolePermission = mongoose_1.default.model('RolePermission', rolePermissionSchema);
