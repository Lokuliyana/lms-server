"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.createCheckout = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const paymentFactory_1 = require("../../services/payments/paymentFactory");
const Transaction_1 = require("../../models/Transaction");
const Class_1 = require("../../models/Class");
const ClassEntitlement_1 = require("../../models/ClassEntitlement");
const ClassEnrollment_1 = require("../../models/ClassEnrollment");
const User_1 = require("../../models/User");
const Role_1 = require("../../models/Role");
const createCheckout = async (req, res) => {
    try {
        const { classId, monthKey } = req.body;
        const userId = req.user?.userId;
        const classData = await Class_1.Class.findById(classId);
        if (!classData) {
            res.status(404).json({ message: "Class not found" });
            return;
        }
        const provider = (0, paymentFactory_1.getPaymentProvider)();
        // Create pending transaction
        const transaction = await Transaction_1.Transaction.create({
            user_id: userId,
            class_id: classId,
            month_key: monthKey,
            gateway: process.env.ACTIVE_PAYMENT_GATEWAY || "stripe",
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createCheckout = createCheckout;
const handleWebhook = async (req, res) => {
    try {
        const provider = (0, paymentFactory_1.getPaymentProvider)();
        const result = await provider.verifyWebhook(req.body, req.headers);
        if (!result || !result.success) {
            res.status(400).send("Webhook verification failed: invalid signature");
            return;
        }
        if (result.classId && result.userId) {
            const topologyType = mongoose_1.default.connection?.client?.topology?.description?.type;
            const isReplicaOrSharded = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';
            if (isReplicaOrSharded) {
                const session = await mongoose_1.default.startSession();
                try {
                    await session.withTransaction(async () => {
                        // 1. Mark Transaction as success
                        await Transaction_1.Transaction.findOneAndUpdate({ user_id: result.userId, class_id: result.classId, month_key: result.monthKey }, { status: "success", gateway_transaction_id: result.transactionId }, { session });
                        // 2. Upsert ClassEntitlement ({ upsert: true })
                        await ClassEntitlement_1.ClassEntitlement.findOneAndUpdate({ class_id: result.classId, user_id: result.userId, month_key: result.monthKey }, { source: "online", payment_ref: result.transactionId }, { upsert: true, session });
                        // 3. Upsert ClassEnrollment with status 'active'
                        await ClassEnrollment_1.ClassEnrollment.findOneAndUpdate({ classId: result.classId, userId: result.userId }, { $setOnInsert: { status: "active", enrolledAt: new Date() } }, { upsert: true, session });
                        // 4. Push student ID to Class.enrolled_students via $addToSet
                        await Class_1.Class.findByIdAndUpdate(result.classId, { $addToSet: { enrolled_students: result.userId } }, { session });
                        // 5. Add 'Student' role to User.role_ids if not already present
                        const studentRole = await Role_1.Role.findOne({ name: { $in: ["Student", "student"] } }).session(session);
                        if (studentRole) {
                            await User_1.User.findByIdAndUpdate(result.userId, { $addToSet: { role_ids: studentRole._id } }, { session });
                        }
                    });
                }
                finally {
                    await session.endSession();
                }
            }
            else {
                // Fallback for standalone Mongo instances where transactions are unsupported
                await Transaction_1.Transaction.findOneAndUpdate({ user_id: result.userId, class_id: result.classId, month_key: result.monthKey }, { status: "success", gateway_transaction_id: result.transactionId });
                await ClassEntitlement_1.ClassEntitlement.findOneAndUpdate({ class_id: result.classId, user_id: result.userId, month_key: result.monthKey }, { source: "online", payment_ref: result.transactionId }, { upsert: true });
                await ClassEnrollment_1.ClassEnrollment.findOneAndUpdate({ classId: result.classId, userId: result.userId }, { $setOnInsert: { status: "active", enrolledAt: new Date() } }, { upsert: true });
                await Class_1.Class.findByIdAndUpdate(result.classId, {
                    $addToSet: { enrolled_students: result.userId }
                });
                const studentRole = await Role_1.Role.findOne({ name: { $in: ["Student", "student"] } });
                if (studentRole) {
                    await User_1.User.findByIdAndUpdate(result.userId, {
                        $addToSet: { role_ids: studentRole._id }
                    });
                }
            }
        }
        res.status(200).send("Webhook received");
    }
    catch (error) {
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
};
exports.handleWebhook = handleWebhook;
