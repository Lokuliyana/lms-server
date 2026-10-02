import { Router } from 'express';
import { authenticate, optionalAuth, requirePermission } from '../middlewares/auth';
import {
  getStudyPacks,
  getStudyPackById,
  createStudyPack,
  updateStudyPack,
  deleteStudyPack,
  getClassRecordingsForStudyPack,
} from '../controllers/studyPackController';

const router = Router();

// Public / student catalog
router.get('/', optionalAuth, getStudyPacks);
router.get('/class-recordings/:classId', authenticate, getClassRecordingsForStudyPack);
router.get('/:id', optionalAuth, getStudyPackById);

// Staff management
router.post('/', authenticate, requirePermission('study_packs.manage'), createStudyPack);
router.put('/:id', authenticate, requirePermission('study_packs.manage'), updateStudyPack);
router.delete('/:id', authenticate, requirePermission('study_packs.manage'), deleteStudyPack);

export default router;
