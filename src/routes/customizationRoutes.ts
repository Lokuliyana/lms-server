import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getPublicTaxonomy,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  getSiteSettings,
  updateSiteSettings,
  uploadImage
} from '../controllers/customizationController';
import { requirePermission } from '../middlewares/auth';

const router = Router();

// Public Taxonomy Route
router.get('/public/taxonomy', getPublicTaxonomy);

// Configure multer for memory storage for cloud uploads
const upload = multer({ storage: multer.memoryStorage() });

// Subject Routes
router.get('/subjects', getSubjects);
router.post('/subjects', requirePermission('branding.manage'), createSubject);
router.put('/subjects/:id', requirePermission('branding.manage'), updateSubject);
router.delete('/subjects/:id', requirePermission('branding.manage'), deleteSubject);

// Grade Routes
router.get('/grades', getGrades);
router.post('/grades', requirePermission('branding.manage'), createGrade);
router.put('/grades/:id', requirePermission('branding.manage'), updateGrade);
router.delete('/grades/:id', requirePermission('branding.manage'), deleteGrade);

// SiteSettings Routes
router.get('/settings', getSiteSettings);
router.put('/settings', requirePermission('branding.manage'), updateSiteSettings);

// Image Upload
router.post('/upload', requirePermission('branding.manage'), upload.single('image'), uploadImage);

export default router;
