"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = exports.updateSiteSettings = exports.getSiteSettings = exports.deleteGrade = exports.updateGrade = exports.createGrade = exports.getGrades = exports.deleteSubject = exports.updateSubject = exports.createSubject = exports.getSubjects = exports.getPublicTaxonomy = void 0;
const Subject_1 = require("../models/Subject");
const Grade_1 = require("../models/Grade");
const SiteSettings_1 = require("../models/SiteSettings");
const path_1 = __importDefault(require("path"));
// --- Public Taxonomy Controller ---
const getPublicTaxonomy = async (req, res) => {
    try {
        const [subjects, grades] = await Promise.all([
            Subject_1.Subject.find({ is_active: { $ne: false } }).sort({ name: 1 }),
            Grade_1.Grade.find({ is_active: { $ne: false } }).sort({ name: 1 }),
        ]);
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        res.json({ subjects, grades });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching taxonomy', error });
    }
};
exports.getPublicTaxonomy = getPublicTaxonomy;
// --- Subject Controllers ---
const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject_1.Subject.find().sort({ name: 1 });
        res.json(subjects);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching subjects', error });
    }
};
exports.getSubjects = getSubjects;
const createSubject = async (req, res) => {
    try {
        const { name, code, is_active } = req.body;
        const newSubject = new Subject_1.Subject({ name, code, is_active });
        await newSubject.save();
        res.status(201).json(newSubject);
    }
    catch (error) {
        res.status(400).json({ message: 'Error creating subject', error: error.message });
    }
};
exports.createSubject = createSubject;
const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, is_active } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (code !== undefined)
            updateData.code = code;
        if (is_active !== undefined)
            updateData.is_active = is_active;
        const subject = await Subject_1.Subject.findByIdAndUpdate(id, updateData, { new: true });
        if (!subject)
            return res.status(404).json({ message: 'Subject not found' });
        res.json(subject);
    }
    catch (error) {
        res.status(400).json({ message: 'Error updating subject', error });
    }
};
exports.updateSubject = updateSubject;
const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const subject = await Subject_1.Subject.findByIdAndDelete(id);
        if (!subject)
            return res.status(404).json({ message: 'Subject not found' });
        res.json({ message: 'Subject deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ message: 'Error deleting subject', error });
    }
};
exports.deleteSubject = deleteSubject;
// --- Grade Controllers ---
const getGrades = async (req, res) => {
    try {
        const grades = await Grade_1.Grade.find().sort({ level: 1, name: 1 });
        res.json(grades);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching grades', error });
    }
};
exports.getGrades = getGrades;
const createGrade = async (req, res) => {
    try {
        const { name, level, is_active } = req.body;
        const newGrade = new Grade_1.Grade({ name, level, is_active });
        await newGrade.save();
        res.status(201).json(newGrade);
    }
    catch (error) {
        res.status(400).json({ message: 'Error creating grade', error: error.message });
    }
};
exports.createGrade = createGrade;
const updateGrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, level, is_active } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (level !== undefined)
            updateData.level = level;
        if (is_active !== undefined)
            updateData.is_active = is_active;
        const grade = await Grade_1.Grade.findByIdAndUpdate(id, updateData, { new: true });
        if (!grade)
            return res.status(404).json({ message: 'Grade not found' });
        res.json(grade);
    }
    catch (error) {
        res.status(400).json({ message: 'Error updating grade', error });
    }
};
exports.updateGrade = updateGrade;
const deleteGrade = async (req, res) => {
    try {
        const { id } = req.params;
        const grade = await Grade_1.Grade.findByIdAndDelete(id);
        if (!grade)
            return res.status(404).json({ message: 'Grade not found' });
        res.json({ message: 'Grade deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ message: 'Error deleting grade', error });
    }
};
exports.deleteGrade = deleteGrade;
// --- SiteSettings Controllers ---
const getSiteSettings = async (req, res) => {
    try {
        let settings = await SiteSettings_1.SiteSettings.findOne();
        if (!settings) {
            // Return empty or default if not found
            return res.json({});
        }
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching site settings', error });
    }
};
exports.getSiteSettings = getSiteSettings;
const updateSiteSettings = async (req, res) => {
    try {
        const { site, pages } = req.body;
        let settings = await SiteSettings_1.SiteSettings.findOne();
        if (!settings) {
            settings = new SiteSettings_1.SiteSettings({ site, pages });
        }
        else {
            settings.site = site;
            settings.pages = pages;
        }
        await settings.save();
        res.json(settings);
    }
    catch (error) {
        res.status(400).json({ message: 'Error updating site settings', error });
    }
};
exports.updateSiteSettings = updateSiteSettings;
// --- Image Upload Controller ---
const mediaService_1 = require("../services/mediaService");
const fs_1 = __importDefault(require("fs"));
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const pathKey = `customization/${Date.now()}-${safeName}`;
        try {
            const uploadRes = await (0, mediaService_1.uploadMedia)({
                fileBuffer: req.file.buffer,
                path: pathKey,
                ownerType: 'system',
                contentType: req.file.mimetype,
            });
            return res.json({ url: uploadRes.publicUrl, publicUrl: uploadRes.publicUrl });
        }
        catch (storageErr) {
            console.warn('Cloud storage failed in customization upload, falling back to local file:', storageErr);
            const uploadDir = path_1.default.join(__dirname, '../../public/uploads/customization');
            if (!fs_1.default.existsSync(uploadDir)) {
                fs_1.default.mkdirSync(uploadDir, { recursive: true });
            }
            const localFileName = `${Date.now()}-${safeName}`;
            const localFilePath = path_1.default.join(uploadDir, localFileName);
            fs_1.default.writeFileSync(localFilePath, req.file.buffer);
            const localUrl = `/uploads/customization/${localFileName}`;
            return res.json({ url: localUrl, publicUrl: localUrl });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Error uploading file', error: error.message });
    }
};
exports.uploadImage = uploadImage;
