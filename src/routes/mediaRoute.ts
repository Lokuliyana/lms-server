import express from 'express';
import multer from 'multer';
import { upload, remove } from '../controllers/mediaController';
import { requirePermission } from '../middlewares/auth';

const router = express.Router();
const uploadMiddleware = multer({ storage: multer.memoryStorage() });

// Fix 3.1: Apply requirePermission("recordings.create") and "recordings.delete" to upload/delete endpoints.
// We apply it here since media endpoints handle uploads.
router.post(
  '/upload',
  requirePermission('recordings.create'),
  uploadMiddleware.single('file'),
  upload
);

router.delete(
  '/delete',
  requirePermission('recordings.delete'),
  remove
);

export default router;
