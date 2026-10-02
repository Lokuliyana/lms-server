import { Request, Response } from "express";
import mongoose from "mongoose";
import { getPaymentProvider } from "../../services/payments/paymentFactory";
import { Transaction } from "../../models/Transaction";
import { Class } from "../../models/Class";
import { ClassEntitlement } from "../../models/ClassEntitlement";
import { ClassEnrollment } from "../../models/ClassEnrollment";
import { User } from "../../models/User";
import { Role } from "../../models/Role";

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
      gateway: (process.env.ACTIVE_PAYMENT_GATEWAY as "stripe" | "payhere" | "manual") || "stripe",
      amount: Number(classData.price) || 0,
      currency: String(classData.currency) || "LKR"
    });

    const { redirectUrl } = await provider.createCheckout({
      classId,
      monthKey,
      userId,
      amount: Number(classData.price) || 0,
      currency: String(classData.currency) || "LKR"
    });

    res.status(200).json({ url: redirectUrl, transactionId: transaction?._id });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const provider = getPaymentProvider();
    const result = await provider.verifyWebhook(req.body, req.headers);

    if (!result || !result.success) {
      res.status(400).send("Webhook verification failed: invalid signature");
      return;
    }

    if (result.classId && result.userId) {
      const topologyType = (mongoose.connection as any)?.client?.topology?.description?.type;
      const isReplicaOrSharded = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

      if (isReplicaOrSharded) {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            // 1. Mark Transaction as success
            await Transaction.findOneAndUpdate(
              { user_id: result.userId, class_id: result.classId, month_key: result.monthKey },
              { status: "success", gateway_transaction_id: result.transactionId },
              { session }
            );

            // 2. Upsert ClassEntitlement ({ upsert: true })
            await ClassEntitlement.findOneAndUpdate(
              { class_id: result.classId, user_id: result.userId, month_key: result.monthKey },
              { source: "online", payment_ref: result.transactionId },
              { upsert: true, session }
            );

            // 3. Upsert ClassEnrollment with status 'active'
            await ClassEnrollment.findOneAndUpdate(
              { classId: result.classId, userId: result.userId },
              { $setOnInsert: { status: "active", enrolledAt: new Date() } },
              { upsert: true, session }
            );

            // 4. Push student ID to Class.enrolled_students via $addToSet
            await Class.findByIdAndUpdate(
              result.classId,
              { $addToSet: { enrolled_students: result.userId } },
              { session }
            );

            // 5. Add 'Student' role to User.role_ids if not already present
            const studentRole = await Role.findOne({ name: { $in: ["Student", "student"] } }).session(session);
            if (studentRole) {
              await User.findByIdAndUpdate(
                result.userId,
                { $addToSet: { role_ids: studentRole._id } },
                { session }
              );
            }
          });
        } finally {
          await session.endSession();
        }
      } else {
        // Fallback for standalone Mongo instances where transactions are unsupported
        await Transaction.findOneAndUpdate(
          { user_id: result.userId, class_id: result.classId, month_key: result.monthKey },
          { status: "success", gateway_transaction_id: result.transactionId }
        );

        await ClassEntitlement.findOneAndUpdate(
          { class_id: result.classId, user_id: result.userId, month_key: result.monthKey },
          { source: "online", payment_ref: result.transactionId },
          { upsert: true }
        );

        await ClassEnrollment.findOneAndUpdate(
          { classId: result.classId, userId: result.userId },
          { $setOnInsert: { status: "active", enrolledAt: new Date() } },
          { upsert: true }
        );

        await Class.findByIdAndUpdate(result.classId, {
          $addToSet: { enrolled_students: result.userId }
        });

        const studentRole = await Role.findOne({ name: { $in: ["Student", "student"] } });
        if (studentRole) {
          await User.findByIdAndUpdate(result.userId, {
            $addToSet: { role_ids: studentRole._id }
          });
        }
      }
    }

    res.status(200).send("Webhook received");
  } catch (error: any) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};
