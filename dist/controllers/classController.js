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
exports.manualEnrollStudents = exports.getCandidateStudents = exports.revokeStudentAccess = exports.getAllClassesWithStudents = exports.getEnrolledClasses = exports.getEnrolledStudents = exports.deleteClass = exports.updateClass = exports.getClassById = exports.getClasses = exports.createClass = void 0;
const classService = __importStar(require("../services/classService"));
const createClass = async (req, res) => {
    try {
        const classData = req.body;
        const userId = (req.user?._id || req.user?.userId || '').toString();
        const newClass = await classService.createClass(classData, userId);
        res.status(201).json({ success: true, data: newClass });
    }
    catch (error) {
        console.error('Error creating class:', error);
        if (error?.name === 'ValidationError' || error?.name === 'CastError') {
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.createClass = createClass;
function sanitizeClassForGuest(cls) {
    if (!cls)
        return cls;
    const raw = typeof cls.toObject === 'function' ? cls.toObject() : { ...cls };
    delete raw.zoom_meeting_id;
    delete raw.zoom_join_url;
    delete raw.zoom_start_url;
    delete raw.enrolled_students;
    raw.recordings = [];
    raw.is_enrolled = false;
    raw.has_access = false;
    if (raw.special_session) {
        raw.special_session = {
            title: raw.special_session.title || '',
            date: raw.special_session.date || '',
            start: raw.special_session.start || '',
            end: raw.special_session.end || '',
            is_active: raw.special_session.is_active,
            description: raw.special_session.description || '',
        };
    }
    return raw;
}
const getClasses = async (req, res) => {
    try {
        const filters = req.query || {};
        const classes = await classService.getClasses(filters);
        const isPrivileged = req.user && (req.user.permissions?.includes('classes.update') || req.user.permissions?.includes('classes.create'));
        if (!isPrivileged) {
            const sanitized = classes.map((c) => sanitizeClassForGuest(c));
            return res.json({ success: true, data: sanitized });
        }
        res.json({ success: true, data: classes });
    }
    catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getClasses = getClasses;
const getClassById = async (req, res) => {
    try {
        const { id } = req.params;
        const cls = await classService.getClassById(id);
        if (!cls) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }
        const isPrivileged = !!(req.user &&
            (['teacher', 'moderator', 'admin'].includes(req.user.role || '') ||
                req.user.permissions?.includes('classes.update') ||
                req.user.permissions?.includes('classes.create')));
        const userId = req.user ? (req.user._id || req.user.userId || '').toString() : null;
        let isEnrolled = false;
        if (userId) {
            isEnrolled = cls.enrolled_students?.some((sid) => (sid?._id || sid).toString() === userId) || false;
            if (!isEnrolled) {
                const { ClassEnrollment } = await Promise.resolve().then(() => __importStar(require('../models/ClassEnrollment')));
                const hasEnrollment = await ClassEnrollment.exists({ classId: cls._id, userId, status: 'active' });
                isEnrolled = !!hasEnrollment;
                if (isEnrolled) {
                    const { Class } = await Promise.resolve().then(() => __importStar(require('../models/Class')));
                    await Class.updateOne({ _id: cls._id }, { $addToSet: { enrolled_students: userId } });
                }
            }
        }
        if (!isPrivileged && !isEnrolled) {
            return res.json({ success: true, data: sanitizeClassForGuest(cls) });
        }
        const safeData = typeof cls.toObject === 'function' ? cls.toObject() : { ...cls };
        safeData.is_enrolled = isEnrolled;
        safeData.has_access = isEnrolled || isPrivileged;
        if (!isPrivileged) {
            delete safeData.enrolled_students;
            delete safeData.students;
        }
        res.json({ success: true, data: safeData });
    }
    catch (error) {
        console.error('Error fetching class:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getClassById = getClassById;
const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedClass = await classService.updateClass(id, req.body);
        res.json({ success: true, data: updatedClass });
    }
    catch (error) {
        console.error('Error updating class:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.updateClass = updateClass;
const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await classService.deleteClass(id);
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.deleteClass = deleteClass;
const getEnrolledStudents = async (req, res) => {
    try {
        const isStaffOrTeacher = !!(req.user &&
            (['teacher', 'moderator', 'admin'].includes(req.user.role || '') ||
                req.user.permissions?.includes('classes.update') ||
                req.user.permissions?.includes('classes.create') ||
                req.user.permissions?.includes('attendance.mark') ||
                req.user.permissions?.includes('grades.record')));
        if (!isStaffOrTeacher) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Only teachers and staff can view enrolled student rosters',
                count: 0,
                students: [],
                data: []
            });
        }
        const { id } = req.params;
        const { month } = req.query;
        const students = await classService.getEnrolledStudents(id, month);
        res.json({ success: true, count: students.length, students, data: students, month });
    }
    catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getEnrolledStudents = getEnrolledStudents;
const getEnrolledClasses = async (req, res) => {
    try {
        const userId = (req.user?._id || req.user?.userId || '').toString();
        const classes = await classService.getEnrolledClassesForUser(userId);
        res.json({ success: true, data: classes });
    }
    catch (error) {
        console.error('Error fetching enrolled classes:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getEnrolledClasses = getEnrolledClasses;
const getAllClassesWithStudents = async (req, res) => {
    try {
        const isStaffOrTeacher = !!(req.user &&
            (['teacher', 'moderator', 'admin'].includes(req.user.role || '') ||
                req.user.permissions?.includes('classes.update') ||
                req.user.permissions?.includes('classes.create')));
        if (!isStaffOrTeacher) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Only teachers and staff can view student rosters',
                data: []
            });
        }
        const classes = await classService.getAllClassesWithStudents();
        res.json({ success: true, data: classes });
    }
    catch (error) {
        console.error('Error fetching all classes with students:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getAllClassesWithStudents = getAllClassesWithStudents;
const revokeStudentAccess = async (req, res) => {
    try {
        const { id, studentId } = req.params;
        const { month } = req.query;
        const result = await classService.revokeStudentAccess(id, studentId, month);
        res.json(result);
    }
    catch (error) {
        console.error('Error revoking student access:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to revoke access' });
    }
};
exports.revokeStudentAccess = revokeStudentAccess;
const getCandidateStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const { search, birthYear, age, ageOrYear, filter } = req.query;
        const candidates = await classService.getCandidateStudents(id, {
            search: search,
            birthYear: birthYear ? Number(birthYear) : undefined,
            age: age ? Number(age) : undefined,
            ageOrYear: (ageOrYear || filter),
        });
        res.json({ success: true, count: candidates.length, data: candidates });
    }
    catch (error) {
        console.error('Error fetching candidate students:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch candidate students' });
    }
};
exports.getCandidateStudents = getCandidateStudents;
const manualEnrollStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const { studentIds, month } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'studentIds array is required' });
        }
        const result = await classService.manualEnrollStudents(id, studentIds, month);
        res.json(result);
    }
    catch (error) {
        console.error('Error manually enrolling students:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to manually enroll students' });
    }
};
exports.manualEnrollStudents = manualEnrollStudents;
