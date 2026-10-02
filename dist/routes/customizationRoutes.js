"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const customizationController_1 = require("../controllers/customizationController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Public Taxonomy Route
router.get('/public/taxonomy', customizationController_1.getPublicTaxonomy);
// Configure multer for memory storage for cloud uploads
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Subject Routes
router.get('/subjects', customizationController_1.getSubjects);
router.post('/subjects', (0, auth_1.requirePermission)('branding.manage'), customizationController_1.createSubject);
router.put('/subjects/:id', (0, auth_1.requirePermission)('branding.manage'), customizationController_1.updateSubject);
router.delete('/subjects/:id', (0, auth_1.requirePermission)('branding.manage'), customizationController_1.deleteSubject);
// Grade Routes
router.get('/grades', customizationController_1.getGrades);
router.post('/grades', (0, auth_1.requirePermission)('branding.manage'), customizationController_1.createGrade);
router.put('/grades/:id', (0, auth_1.requirePermission)('branding.manage'), customizationController_1.updateGrade);
router.delete('/grades/:id', (0, auth_1.requirePermission)('branding.manage'), customizationController_1.deleteGrade);
// SiteSettings Routes
router.get('/settings', customizationController_1.getSiteSettings);
router.put('/settings', (0, auth_1.requirePermission)('branding.manage'), customizationController_1.updateSiteSettings);
// Image Upload
router.post('/upload', (0, auth_1.requirePermission)('branding.manage'), upload.single('image'), customizationController_1.uploadImage);
exports.default = router;
