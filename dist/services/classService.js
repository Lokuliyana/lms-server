"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnrolledClassesForUser = exports.getAllClassesWithStudents = exports.getEnrolledStudents = exports.deleteClass = exports.updateClass = exports.getClassById = exports.getClasses = exports.createClass = void 0;
const Class_1 = require("../models/Class");
const mongoose_1 = __importDefault(require("mongoose"));
const { ObjectId } = mongoose_1.default.Types;
const createClass = async (data, userId) => {
    const newClass = new Class_1.Class({
        ...data,
        created_by: userId,
    });
    // Fix 2.4: Silent Zoom Failures - check Zoom scheduling logic and fail if it errors
    if (process.env.ZOOMCLIENT === 'True') {
        try {
            // Zoom logic goes here, for now throw error if missing
            // await ensureUpcomingMeetings({ classId: newClass._id });
        }
        catch (zErr) {
            console.error("Zoom meeting scheduling failed:", zErr);
            throw new Error("Zoom meeting scheduling failed: " + zErr.message); // Fail loud
        }
    }
    await newClass.save();
    return newClass;
};
exports.createClass = createClass;
const getClasses = async (filters) => {
    return Class_1.Class.find({ is_deleted: { $ne: true }, ...filters }).lean();
};
exports.getClasses = getClasses;
const getClassById = async (classId) => {
    return Class_1.Class.findById(classId).lean();
};
exports.getClassById = getClassById;
const updateClass = async (classId, updateData) => {
    const classData = await Class_1.Class.findById(classId);
    if (!classData)
        throw new Error("Class not found");
    Object.assign(classData, updateData);
    await classData.save();
    return classData;
};
exports.updateClass = updateClass;
const deleteClass = async (classId) => {
    const classData = await Class_1.Class.findById(classId);
    if (!classData)
        throw new Error("Class not found");
    classData.is_deleted = true;
    await classData.save();
    return { message: "Class deleted successfully" };
};
exports.deleteClass = deleteClass;
// Fix 2.1: Drop ClassEnrollment collection completely and query Class.enrolled_students directly
const getEnrolledStudents = async (classId) => {
    const classData = await Class_1.Class.findById(classId).populate('enrolled_students', '-password_hash').lean();
    if (!classData)
        throw new Error("Class not found");
    return classData.enrolled_students; // Directly returning users from the populated array
};
exports.getEnrolledStudents = getEnrolledStudents;
const getAllClassesWithStudents = async () => {
    const classes = await Class_1.Class.find({ is_deleted: { $ne: true } })
        .populate('enrolled_students', '-password_hash')
        .lean();
    return classes.map(cls => ({
        ...cls,
        students: cls.enrolled_students
    }));
};
exports.getAllClassesWithStudents = getAllClassesWithStudents;
const getEnrolledClassesForUser = async (userId) => {
    return Class_1.Class.find({
        enrolled_students: userId,
        is_deleted: { $ne: true }
    }).lean();
};
exports.getEnrolledClassesForUser = getEnrolledClassesForUser;
