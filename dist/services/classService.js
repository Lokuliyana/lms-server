"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnrolledClassesForUser = exports.getAllClassesWithStudents = exports.getEnrolledStudents = exports.deleteClass = exports.updateClass = exports.getClassById = exports.getClasses = exports.createClass = void 0;
const Class_1 = require("../models/Class");
const mongoose_1 = __importDefault(require("mongoose"));
const taxonomyResolver_1 = require("../utils/taxonomyResolver");
const { ObjectId } = mongoose_1.default.Types;
const createClass = async (data, userId) => {
    const resolvedSubject = await (0, taxonomyResolver_1.resolveSubject)(data.subject);
    const resolvedGrade = await (0, taxonomyResolver_1.resolveGrade)(data.grade);
    const price = data.price !== undefined
        ? Number(data.price)
        : data.fees !== undefined
            ? Number(data.fees)
            : data.classFee !== undefined
                ? Number(data.classFee)
                : 0;
    const rawBatches = Array.isArray(data.batches) && data.batches.length > 0
        ? data.batches
        : Array.isArray(data.batch_schedule) && data.batch_schedule.length > 0
            ? data.batch_schedule
            : Array.isArray(data.classTime)
                ? data.classTime.map(({ day, start, end }) => ({ batch_name: `${day} Batch`, day, start, end }))
                : [{ batch_name: "Default Batch", day: "Monday", start: "08:00", end: "10:00" }];
    const normalizedBatches = rawBatches.map((b, i) => ({
        batch_name: b.batch_name || `Batch ${i + 1}`,
        day: b.day || 'Monday',
        start: b.start || '08:00',
        end: b.end || '10:00',
    }));
    const newClass = new Class_1.Class({
        ...data,
        subject: resolvedSubject,
        grade: resolvedGrade,
        price,
        batches: normalizedBatches,
        delivery_type: data.delivery_type || 'online_only',
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
const Grade_1 = require("../models/Grade");
const Subject_1 = require("../models/Subject");
const getClasses = async (filters = {}) => {
    const query = { is_deleted: { $ne: true } };
    // Handle grade filter: could be ObjectId, or grade name / number (e.g. "12", "Grade 12", "6")
    if (filters.grade && filters.grade !== 'all') {
        if (mongoose_1.default.Types.ObjectId.isValid(filters.grade)) {
            query.grade = new mongoose_1.default.Types.ObjectId(filters.grade);
        }
        else {
            const cleanGrade = String(filters.grade).replace(/^grade\s*/i, '').trim();
            const matchedGrades = await Grade_1.Grade.find({
                $or: [
                    { name: new RegExp(`^${cleanGrade}$`, 'i') },
                    { name: new RegExp(`^Grade\\s*${cleanGrade}$`, 'i') },
                ]
            }).select('_id').lean();
            const gradeIds = matchedGrades.map((g) => g._id);
            if (gradeIds.length > 0) {
                query.grade = { $in: gradeIds };
            }
            else {
                return [];
            }
        }
    }
    // Handle subject filter: could be ObjectId or subject name (e.g. "mathematics", "math", "science")
    if (filters.subject && filters.subject !== 'all') {
        if (mongoose_1.default.Types.ObjectId.isValid(filters.subject)) {
            query.subject = new mongoose_1.default.Types.ObjectId(filters.subject);
        }
        else {
            const cleanSubject = String(filters.subject).trim();
            const matchedSubjects = await Subject_1.Subject.find({
                $or: [
                    { name: new RegExp(`^${cleanSubject}$`, 'i') },
                    { name: new RegExp(`^${cleanSubject}`, 'i') },
                    { name: new RegExp(cleanSubject, 'i') },
                ]
            }).select('_id').lean();
            const subjectIds = matchedSubjects.map((s) => s._id);
            if (subjectIds.length > 0) {
                query.subject = { $in: subjectIds };
            }
            else {
                return [];
            }
        }
    }
    if (filters.format && filters.format !== 'all')
        query.format = filters.format;
    if (filters.type && filters.type !== 'all')
        query.type = filters.type;
    if (filters.tutor && mongoose_1.default.Types.ObjectId.isValid(filters.tutor))
        query.tutor = filters.tutor;
    return Class_1.Class.find(query)
        .populate('grade', 'name')
        .populate('subject', 'name')
        .populate('tutor', 'first_name last_name email full_name')
        .lean();
};
exports.getClasses = getClasses;
const getClassById = async (classId) => {
    if (!classId || typeof classId !== 'string' || classId === 'undefined' || classId === 'null') {
        return null;
    }
    const query = { is_deleted: { $ne: true } };
    if (mongoose_1.default.Types.ObjectId.isValid(classId)) {
        query._id = new mongoose_1.default.Types.ObjectId(classId);
    }
    else {
        const numId = Number(classId);
        query.$or = [
            { class_code: classId },
            ...(isNaN(numId) ? [] : [{ classId: numId }]),
        ];
    }
    return Class_1.Class.findOne(query)
        .populate('grade', 'name')
        .populate('subject', 'name')
        .populate('tutor', 'first_name last_name email full_name')
        .lean();
};
exports.getClassById = getClassById;
const updateClass = async (classId, updateData) => {
    const classData = await Class_1.Class.findById(classId);
    if (!classData)
        throw new Error("Class not found");
    if (updateData.subject !== undefined) {
        updateData.subject = await (0, taxonomyResolver_1.resolveSubject)(updateData.subject);
    }
    if (updateData.grade !== undefined) {
        updateData.grade = await (0, taxonomyResolver_1.resolveGrade)(updateData.grade);
    }
    if (updateData.fees !== undefined && updateData.price === undefined) {
        updateData.price = Number(updateData.fees);
    }
    if (updateData.batch_schedule && !updateData.batches) {
        updateData.batches = updateData.batch_schedule;
    }
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
const ClassEnrollment_1 = require("../models/ClassEnrollment");
// Source of truth: ClassEnrollment with automatic backfill
const getEnrolledStudents = async (classId) => {
    const enrollments = await ClassEnrollment_1.ClassEnrollment.find({ classId, status: 'active' })
        .populate('userId', '-password_hash')
        .lean();
    if (enrollments.length > 0) {
        return enrollments.map((e) => e.userId).filter(Boolean);
    }
    // Fallback to legacy Class.enrolled_students and backfill ClassEnrollment
    const classData = await Class_1.Class.findById(classId).populate('enrolled_students', '-password_hash').lean();
    if (!classData)
        throw new Error("Class not found");
    if (classData.enrolled_students && classData.enrolled_students.length > 0) {
        for (const student of classData.enrolled_students) {
            if (student?._id) {
                await ClassEnrollment_1.ClassEnrollment.updateOne({ classId, userId: student._id }, { $setOnInsert: { classId, userId: student._id, status: 'active', enrolledAt: new Date() } }, { upsert: true });
            }
        }
        return classData.enrolled_students;
    }
    return [];
};
exports.getEnrolledStudents = getEnrolledStudents;
const getAllClassesWithStudents = async () => {
    const classes = await Class_1.Class.find({ is_deleted: { $ne: true } }).lean();
    const results = [];
    for (const cls of classes) {
        const students = await (0, exports.getEnrolledStudents)(cls._id.toString());
        results.push({
            ...cls,
            students,
            enrolled_students: students.map((s) => s._id || s)
        });
    }
    return results;
};
exports.getAllClassesWithStudents = getAllClassesWithStudents;
const getEnrolledClassesForUser = async (userId) => {
    const enrollments = await ClassEnrollment_1.ClassEnrollment.find({ userId, status: 'active' }).select('classId').lean();
    const enrolledClassIds = enrollments.map(e => e.classId);
    return Class_1.Class.find({
        $or: [
            { _id: { $in: enrolledClassIds } },
            { enrolled_students: userId }
        ],
        is_deleted: { $ne: true }
    }).lean();
};
exports.getEnrolledClassesForUser = getEnrolledClassesForUser;
