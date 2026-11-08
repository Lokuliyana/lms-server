"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fulfillStudyPackOrder = exports.isValidPhoneNumber = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const StudyPack_1 = require("../models/StudyPack");
const StudyPackOrder_1 = require("../models/StudyPackOrder");
const DeliveryOrder_1 = require("../models/DeliveryOrder");
const Transaction_1 = require("../models/Transaction");
/**
 * Validates phone numbers (must contain only valid phone characters: digits, spaces, hyphens, parentheses, optional +, and 7-15 digits total).
 */
const isValidPhoneNumber = (phone) => {
    if (!phone || typeof phone !== 'string')
        return false;
    const trimmed = phone.trim();
    const phonePattern = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phonePattern.test(trimmed)) {
        return false;
    }
    const digits = trimmed.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
};
exports.isValidPhoneNumber = isValidPhoneNumber;
/**
 * Unified hybrid fulfillment service for study packs.
 * - Handles instant digital entitlement unlock.
 * - Handles physical printed tute notes delivery order creation when requested.
 * - Validates shipping address and recipient phone for physical deliveries.
 */
const fulfillStudyPackOrder = async (input) => {
    const { userId, studyPackId, includePhysicalDelivery = false, shippingAddress, recipientPhone, recipientName, paymentMethod = 'mock', paymentProof, paymentSlipName, notes, } = input;
    if (!userId || !mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid or missing student/user ID');
    }
    if (!studyPackId || !mongoose_1.default.Types.ObjectId.isValid(studyPackId)) {
        throw new Error('Invalid or missing study pack ID');
    }
    const userObjId = new mongoose_1.default.Types.ObjectId(userId);
    const packObjId = new mongoose_1.default.Types.ObjectId(studyPackId);
    const pack = await StudyPack_1.StudyPack.findById(packObjId);
    if (!pack) {
        throw new Error('Study pack not found');
    }
    // Validate physical delivery inputs if requested
    if (includePhysicalDelivery) {
        if (!shippingAddress || typeof shippingAddress !== 'string' || shippingAddress.trim().length < 5) {
            throw new Error('A valid delivery shipping address is required (minimum 5 characters)');
        }
        if (!recipientPhone || !(0, exports.isValidPhoneNumber)(recipientPhone)) {
            throw new Error('A valid recipient phone number is required for physical notes delivery');
        }
    }
    // Check existing active orders for idempotency & upgrades
    const existingOrder = await StudyPackOrder_1.StudyPackOrder.findOne({
        $or: [{ student_id: userObjId }, { user_id: userObjId }],
        study_pack_id: packObjId,
        status: { $ne: 'cancelled' },
        digital_access_granted: true,
    });
    if (existingOrder) {
        // Case A: Student already has access and did not request physical delivery, or already had physical delivery
        if (!includePhysicalDelivery || existingOrder.include_physical_delivery) {
            const existingDelivery = existingOrder.delivery_order_id
                ? await DeliveryOrder_1.DeliveryOrder.findById(existingOrder.delivery_order_id)
                : null;
            return {
                success: true,
                message: 'Study pack is already unlocked for this student',
                order: existingOrder,
                delivery: existingDelivery,
                digitalAccessUnlocked: true,
                alreadyOwned: true,
                studyPack: {
                    _id: pack._id,
                    title: pack.title,
                    price: pack.price,
                },
            };
        }
        // Case B: Student has digital access and now orders physical printed notes
        const upgradeDeliveryOrderId = `DEL-SPO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const upgradeDelivery = await DeliveryOrder_1.DeliveryOrder.create({
            order_id: upgradeDeliveryOrderId,
            student_id: userObjId,
            study_pack_id: packObjId,
            delivery_method: 'Courier Delivery',
            shipping_address: (shippingAddress || '').trim(),
            recipient_phone: (recipientPhone || '').trim(),
            recipient_name: (recipientName || '').trim(),
            status: 'pending_processing',
            items: [
                {
                    title: `Study Pack Printed Notes: ${pack.title}`,
                    quantity: 1,
                    price: pack.price,
                },
            ],
            created_at: new Date(),
        });
        existingOrder.include_physical_delivery = true;
        existingOrder.shipping_address = (shippingAddress || '').trim();
        existingOrder.recipient_phone = (recipientPhone || '').trim();
        existingOrder.recipient_name = (recipientName || '').trim();
        existingOrder.delivery_order_id = upgradeDelivery._id;
        if (typeof existingOrder.save === 'function') {
            await existingOrder.save();
        }
        return {
            success: true,
            message: 'Physical delivery order queued successfully for existing study pack',
            order: existingOrder,
            delivery: upgradeDelivery,
            digitalAccessUnlocked: true,
            alreadyOwned: false,
            studyPack: {
                _id: pack._id,
                title: pack.title,
                price: pack.price,
            },
        };
    }
    // Generate unique order ID
    const orderId = `SPO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    let deliveryOrder = null;
    // 1. If physical notes are requested, create DeliveryOrder linked to student & study pack
    if (includePhysicalDelivery) {
        const deliveryOrderId = `DEL-${orderId}`;
        deliveryOrder = await DeliveryOrder_1.DeliveryOrder.create({
            order_id: deliveryOrderId,
            student_id: userObjId,
            study_pack_id: packObjId,
            delivery_method: 'Courier Delivery',
            shipping_address: (shippingAddress || '').trim(),
            recipient_phone: (recipientPhone || '').trim(),
            recipient_name: (recipientName || '').trim(),
            status: 'pending_processing',
            items: [
                {
                    title: `Study Pack Printed Notes: ${pack.title}`,
                    quantity: 1,
                    price: pack.price,
                },
            ],
            created_at: new Date(),
        });
    }
    // 2. Instant digital entitlement unlock (runs in the same flow without waiting for postal delivery)
    const isFree = Number(pack.price) === 0;
    const paymentStatus = isFree ? 'free' : 'paid';
    // 3. Record transaction for financial tracking
    let transactionDoc = null;
    try {
        const gateway = paymentMethod === 'stripe' ? 'stripe' : paymentMethod === 'payhere' ? 'payhere' : 'manual';
        transactionDoc = await Transaction_1.Transaction.create({
            user_id: userObjId,
            order_id: orderId,
            order_type: 'study_pack_purchase',
            amount: pack.price || 0,
            currency: 'LKR',
            gateway,
            status: 'success',
            metadata: {
                study_pack_id: pack._id.toString(),
                include_physical_delivery: !!includePhysicalDelivery,
                delivery_order_id: deliveryOrder?._id?.toString(),
            },
            created_at: new Date(),
        });
    }
    catch (err) {
        // Transaction failure should not block non-payment flows
        console.warn('Transaction record creation failed during study pack order:', err);
    }
    // 4. Create StudyPackOrder with rollback protection
    let studyPackOrder;
    try {
        studyPackOrder = await StudyPackOrder_1.StudyPackOrder.create({
            order_id: orderId,
            student_id: userObjId,
            user_id: userObjId,
            study_pack_id: packObjId,
            include_physical_delivery: !!includePhysicalDelivery,
            shipping_address: includePhysicalDelivery ? (shippingAddress || '').trim() : undefined,
            recipient_phone: includePhysicalDelivery ? (recipientPhone || '').trim() : undefined,
            recipient_name: includePhysicalDelivery ? (recipientName || '').trim() : undefined,
            delivery_order_id: deliveryOrder ? deliveryOrder._id : undefined,
            digital_access_granted: true,
            digital_access_granted_at: new Date(),
            status: 'active',
            payment_status: paymentStatus,
            amount_paid: pack.price || 0,
            transaction_id: transactionDoc ? transactionDoc._id : undefined,
            payment_proof: paymentProof || '',
            payment_slip_name: paymentSlipName || '',
            notes: notes || '',
        });
    }
    catch (orderErr) {
        // Clean up created deliveryOrder and transaction if order creation fails
        if (deliveryOrder && deliveryOrder._id) {
            await DeliveryOrder_1.DeliveryOrder.findByIdAndDelete(deliveryOrder._id).catch(() => { });
        }
        if (transactionDoc && transactionDoc._id) {
            await Transaction_1.Transaction.findByIdAndDelete(transactionDoc._id).catch(() => { });
        }
        throw orderErr;
    }
    return {
        success: true,
        message: includePhysicalDelivery
            ? 'Instant digital access unlocked and physical delivery order queued successfully'
            : 'Instant digital access unlocked successfully',
        order: studyPackOrder,
        delivery: deliveryOrder,
        digitalAccessUnlocked: true,
        studyPack: {
            _id: pack._id,
            title: pack.title,
            price: pack.price,
        },
    };
};
exports.fulfillStudyPackOrder = fulfillStudyPackOrder;
