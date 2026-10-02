"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../../controllers/payments/paymentController");
const auth_1 = require("../../middlewares/auth");
const router = express_1.default.Router();
router.post("/checkout", (0, auth_1.requirePermission)("payments.create"), paymentController_1.createCheckout);
router.post("/webhook", express_1.default.raw({ type: 'application/json' }), paymentController_1.handleWebhook);
exports.default = router;
