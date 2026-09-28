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
exports.getEnrolledStudents = exports.deleteClass = exports.updateClass = exports.getClassById = exports.getClasses = exports.createClass = void 0;
const classService = __importStar(require("../services/classService"));
const createClass = async (req, res) => {
    try {
        const classData = req.body;
        const userId = req.user._id;
        const newClass = await classService.createClass(classData, userId);
        res.status(201).json({ success: true, data: newClass });
    }
    catch (error) {
        // Fix 2.6: Information Disclosure - Don't blindly return error.message for HTTP 500
        console.error('Error creating class:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.createClass = createClass;
const getClasses = async (req, res) => {
    try {
        const filters = req.query || {};
        const classes = await classService.getClasses(filters);
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
        res.json({ success: true, data: cls });
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
        const { id } = req.params;
        const students = await classService.getEnrolledStudents(id);
        res.json({ success: true, data: students });
    }
    catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getEnrolledStudents = getEnrolledStudents;
