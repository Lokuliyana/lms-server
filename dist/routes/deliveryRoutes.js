"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const deliveryController_1 = require("../controllers/deliveryController");
const router = (0, express_1.Router)();
// Student access to own deliveries
router.get('/my', auth_1.authenticate, deliveryController_1.getMyDeliveries);
// Admin / Moderator delivery management
router.get('/', auth_1.authenticate, (0, auth_1.requirePermission)('delivery.manage'), deliveryController_1.getDeliveries);
router.put('/:id/status', auth_1.authenticate, (0, auth_1.requirePermission)('delivery.manage'), deliveryController_1.updateDeliveryStatus);
router.put('/:id/tracking', auth_1.authenticate, (0, auth_1.requirePermission)('delivery.manage'), deliveryController_1.updateTracking);
exports.default = router;
