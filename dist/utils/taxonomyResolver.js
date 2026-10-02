"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSubject = resolveSubject;
exports.resolveGrade = resolveGrade;
const mongoose_1 = __importDefault(require("mongoose"));
const Subject_1 = require("../models/Subject");
const Grade_1 = require("../models/Grade");
async function resolveSubject(subjectInput) {
    if (!subjectInput)
        return undefined;
    let val = subjectInput;
    if (typeof val === 'object' && val !== null) {
        if (val._id)
            val = val._id;
        else if (val.name)
            val = val.name;
        else if (val.title)
            val = val.title;
    }
    if (mongoose_1.default.Types.ObjectId.isValid(val)) {
        return new mongoose_1.default.Types.ObjectId(val);
    }
    const clean = String(val).trim();
    if (!clean || clean.toLowerCase() === 'none' || clean.toLowerCase() === 'all' || clean.toLowerCase() === 'undefined') {
        return undefined;
    }
    let found = await Subject_1.Subject.findOne({ name: new RegExp(`^${clean}$`, 'i') });
    if (!found) {
        found = await Subject_1.Subject.findOne({ name: new RegExp(clean, 'i') });
    }
    if (!found) {
        found = await Subject_1.Subject.create({ name: clean, is_active: true });
    }
    return found._id;
}
async function resolveGrade(gradeInput) {
    if (!gradeInput)
        return undefined;
    let val = gradeInput;
    if (typeof val === 'object' && val !== null) {
        if (val._id)
            val = val._id;
        else if (val.name)
            val = val.name;
        else if (val.title)
            val = val.title;
    }
    if (mongoose_1.default.Types.ObjectId.isValid(val)) {
        return new mongoose_1.default.Types.ObjectId(val);
    }
    const clean = String(val).replace(/^grade\s*/i, '').trim();
    if (!clean || clean.toLowerCase() === 'none' || clean.toLowerCase() === 'all' || clean.toLowerCase() === 'undefined') {
        return undefined;
    }
    let found = await Grade_1.Grade.findOne({
        $or: [
            { name: new RegExp(`^${clean}$`, 'i') },
            { name: new RegExp(`^Grade\\s*${clean}$`, 'i') },
        ],
    });
    if (!found) {
        const displayName = clean.toLowerCase().startsWith('grade') ? clean : `Grade ${clean}`;
        found = await Grade_1.Grade.create({ name: displayName, is_active: true });
    }
    return found._id;
}
