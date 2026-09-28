import { Request, Response } from "express";
import { getPaymentProvider } from "../../services/payments/paymentFactory";
import { Transaction } from "../../models/Transaction";
import { Class } from "../../models/Class";
import { ClassEntitlement } from "../../models/ClassEntitlement";

export const createCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, monthKey } = req.body;
    const userId = req.user?.userId;

    const classData = await Class.findById(classId);
    if (!classData) {
      res.status(404).json({ message: "Class not found" });
      return;
    }

    const provider = getPaymentProvider();
    
    // Create pending transaction
    const transaction = await Transaction.create({
      user_id: userId,
      class_id: classId,
      month_key: monthKey,
      gateway: process.env.ACTIVE_PAYMENT_GATEWAY || "stripe",
      amount: classData.price || 0,
      currency: classData.currency || "LKR"
    });

    const { redirectUrl } = await provider.createCheckout({
      classId,
      monthKey,
      userId,
      amount: classData.price || 0,
      currency: classData.currency || "LKR"
    });

    res.status(200).json({ url: redirectUrl, transactionId: transaction._id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const provider = getPaymentProvider();
    const result = await provider.verifyWebhook(req.body, req.headers);

    if (result.success) {
      // Find pending transaction and update
      await Transaction.findOneAndUpdate(
        { user_id: result.userId, class_id: result.classId, month_key: result.monthKey },
        { status: "success", gateway_transaction_id: result.transactionId }
      );

      // Grant ClassEntitlement
      await ClassEntitlement.findOneAndUpdate(
        { class_id: result.classId, user_id: result.userId, month_key: result.monthKey },
        { source: "online", payment_ref: result.transactionId },
      );
    } // added closing brace

    res.status(200).send("Webhook received");
  } catch (error: any) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};
