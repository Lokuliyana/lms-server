import express from 'express';
import multer from 'multer';
import { upload, remove } from '../controllers/mediaController';
import { authenticate, requirePermission } from '../middlewares/auth';

const router = express.Router();
const uploadMiddleware = multer({ storage: multer.memoryStorage() });

// Unblocked shared media upload for authenticated students and staff
router.post(
  '/upload',
  authenticate,
  uploadMiddleware.single('file'),
  upload
);

router.delete(
  '/delete',
  requirePermission('recordings.delete'),
  remove
);

router.post(
  '/delete',
  requirePermission('recordings.delete'),
  remove
);

router.delete(
  '/',
  requirePermission('recordings.delete'),
  remove
);

export default router;
