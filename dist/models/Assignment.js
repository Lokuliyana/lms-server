"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Assignment = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.Assignment = mongoose_1.default.model('Assignment', new mongoose_1.default.Schema({}));
