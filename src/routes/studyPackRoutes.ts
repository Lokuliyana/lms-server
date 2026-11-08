import { Router } from 'express';
import { authenticate, optionalAuth, requirePermission } from '../middlewares/auth';
import {
  getStudyPacks,
  getStudyPackById,
  createStudyPack,
  updateStudyPack,
  deleteStudyPack,
  getClassRecordingsForStudyPack,
  getStudyPackMediaTicket,
  verifyStudyPackMediaTicket,
  purchaseStudyPack,
} from '../controllers/studyPackController';

const router = Router();

// Public / student catalog
router.get('/', optionalAuth, getStudyPacks);
router.get('/class-recordings/:classId', authenticate, getClassRecordingsForStudyPack);

// Secure media ticket gate & verification
router.get('/:id/media-ticket', authenticate, getStudyPackMediaTicket);
router.post('/verify-media-ticket', verifyStudyPackMediaTicket);
router.get('/:id/verify-media-ticket', verifyStudyPackMediaTicket);

// Hybrid purchase
router.post('/purchase', authenticate, purchaseStudyPack);
router.post('/:id/purchase', authenticate, purchaseStudyPack);

// Study pack detail (sanitized for non-entitled visitors, full access for enrolled students)
router.get('/:id', optionalAuth, getStudyPackById);

// Staff management
router.post('/', authenticate, requirePermission('study_packs.manage'), createStudyPack);
router.put('/:id', authenticate, requirePermission('study_packs.manage'), updateStudyPack);
router.delete('/:id', authenticate, requirePermission('study_packs.manage'), deleteStudyPack);

export default router;
