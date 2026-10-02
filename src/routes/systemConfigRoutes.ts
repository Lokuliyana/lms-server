import { Router } from 'express';
import multer from 'multer';
import { getSystemConfig, updateSystemConfig } from '../controllers/systemConfigController';
import { requirePermission } from '../middlewares/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public GET config endpoint
router.get('/config', getSystemConfig);

// PUT config protected by branding.manage
router.put(
  '/config',
  requirePermission('branding.manage'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'logoUrl', maxCount: 1 },
    { name: 'favicon', maxCount: 1 },
    { name: 'faviconUrl', maxCount: 1 },
    { name: 'heroBanner', maxCount: 1 },
    { name: 'heroBannerUrl', maxCount: 1 },
    { name: 'loginIllustration', maxCount: 1 },
    { name: 'loginIllustrationUrl', maxCount: 1 },
    { name: 'defaultAvatar', maxCount: 1 },
    { name: 'defaultAvatarUrl', maxCount: 1 },
  ]),
  updateSystemConfig
);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
