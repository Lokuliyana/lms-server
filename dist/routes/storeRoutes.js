"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const storeController_1 = require("../controllers/storeController");
const router = (0, express_1.Router)();
// Public catalogue routes
router.get('/', storeController_1.getProducts);
router.get('/products', storeController_1.getProducts);
router.get('/products/:id', storeController_1.getProductById);
router.get('/:id', storeController_1.getProductById);
// Admin / Moderator product management
router.post('/products', auth_1.authenticate, (0, auth_1.requirePermission)('store.manage'), storeController_1.createProduct);
router.put('/products/:id', auth_1.authenticate, (0, auth_1.requirePermission)('store.manage'), storeController_1.updateProduct);
router.delete('/products/:id', auth_1.authenticate, (0, auth_1.requirePermission)('store.manage'), storeController_1.deleteProduct);
// Orders & Checkout
router.post('/checkout', auth_1.authenticate, (0, auth_1.requirePermission)('store.purchase'), storeController_1.createStoreCheckout);
router.get('/orders/my', auth_1.authenticate, storeController_1.getMyStoreOrders);
router.get('/orders', auth_1.authenticate, (0, auth_1.requirePermission)('store.manage'), storeController_1.getAllStoreOrders);
exports.default = router;
