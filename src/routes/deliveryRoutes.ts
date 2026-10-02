import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth';
import {
  getDeliveries,
  getMyDeliveries,
  updateDeliveryStatus,
  updateTracking,
} from '../controllers/deliveryController';

const router = Router();

// Student access to own deliveries
router.get('/my', authenticate, getMyDeliveries);

// Admin / Moderator delivery management
router.get('/', authenticate, requirePermission('delivery.manage'), getDeliveries);
router.put('/:id/status', authenticate, requirePermission('delivery.manage'), updateDeliveryStatus);
router.put('/:id/tracking', authenticate, requirePermission('delivery.manage'), updateTracking);

export default router;
