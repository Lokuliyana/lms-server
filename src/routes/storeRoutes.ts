import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createStoreCheckout,
  getMyStoreOrders,
  getAllStoreOrders,
} from '../controllers/storeController';

const router = Router();

// Public catalogue routes
router.get('/', getProducts);
router.get('/products', getProducts);
router.get('/products/:id', getProductById);
router.get('/:id', getProductById);

// Admin / Moderator product management
router.post('/products', authenticate, requirePermission('store.manage'), createProduct);
router.put('/products/:id', authenticate, requirePermission('store.manage'), updateProduct);
router.delete('/products/:id', authenticate, requirePermission('store.manage'), deleteProduct);

// Orders & Checkout
router.post('/checkout', authenticate, requirePermission('store.purchase'), createStoreCheckout);
router.get('/orders/my', authenticate, getMyStoreOrders);
router.get('/orders', authenticate, requirePermission('store.manage'), getAllStoreOrders);

export default router;
