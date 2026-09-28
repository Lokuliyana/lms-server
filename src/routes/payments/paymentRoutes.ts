import express from "express";
import { createCheckout, handleWebhook } from "../../controllers/payments/paymentController";
import { requirePermission } from "../../middlewares/auth";

const router = express.Router();

router.post("/checkout", requirePermission("payments.create"), createCheckout);
router.post("/webhook", express.raw({type: 'application/json'}), handleWebhook);

export default router;
