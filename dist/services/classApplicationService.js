"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApplications = exports.handleApplication = exports.applyForClass = void 0;
const ClassApplication_1 = require("../models/ClassApplication");
const Class_1 = require("../models/Class");
const User_1 = require("../models/User");
const ClassEntitlement_1 = require("../models/ClassEntitlement");
const Role_1 = require("../models/Role");
const monthKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const applyForClass = async (data, userId) => {
    const { class_id, supporting_document, month } = data;
    const existing = await ClassApplication_1.ClassApplication.findOne({
        user_id: userId,
        class_id,
        status: 'pending',
        ...(month ? { requested_month: month } : { requested_month: { $in: [null, undefined] } }),
    });
    if (existing)
        throw new Error("You have already applied for this class");
    if (month) {
        const existsEnt = await ClassEntitlement_1.ClassEntitlement.exists({
            user_id: userId,
            class_id,
            month_key: month,
        });
        if (existsEnt)
            throw new Error("You already have access to that month");
    }
    const application = new ClassApplication_1.ClassApplication({
        user_id: userId,
        class_id,
        status: 'pending',
        supporting_document: supporting_document || null,
        requested_month: month || null,
        applied_at: new Date(),
    });
    await application.save();
    return application;
};
exports.applyForClass = applyForClass;
const handleApplication = async (applicationId, status, approverUserId) => {
    const application = await ClassApplication_1.ClassApplication.findById(applicationId);
    if (!application)
        throw new Error("Application not found");
    const classId = application.class_id;
    const studentId = application.user_id;
    if (status === 'rejected') {
        application.status = 'rejected';
        application.approved_by = approverUserId || null;
        application.approved_at = new Date();
        await application.save();
        return { message: "Application rejected", status: 'rejected', application };
    }
    if (status === 'approved') {
        const mkey = application.requested_month || monthKey(new Date());
        // idempotent membership
        await Class_1.Class.updateOne({ _id: classId }, { $addToSet: { enrolled_students: studentId } });
        // Auto-create ClassEnrollment as unified source of truth
        const { ClassEnrollment } = await Promise.resolve().then(() => __importStar(require('../models/ClassEnrollment')));
        await ClassEnrollment.updateOne({ classId, userId: studentId }, { $setOnInsert: { classId, userId: studentId, status: 'active', enrolledAt: new Date() } }, { upsert: true });
        // Check if user has student role
        let studentRole = await Role_1.Role.findOne({ name: 'Student' });
        if (!studentRole)
            studentRole = await Role_1.Role.create({ name: 'Student' });
        await User_1.User.updateOne({ _id: studentId }, { $addToSet: { role_ids: studentRole._id } });
        // idempotent monthly entitlement
        await ClassEntitlement_1.ClassEntitlement.updateOne({ user_id: studentId, class_id: classId, month_key: mkey }, {
            $setOnInsert: {
                source: 'subscription',
                payment_ref: null,
                granted_at: new Date(),
            },
        }, { upsert: true });
        // Non-destructive: Persist approval status and audit trails instead of deleting
        application.status = 'approved';
        application.approved_by = approverUserId || null;
        application.approved_at = new Date();
        await application.save();
        // Delivery order fulfillment hook if required
        const classDoc = await Class_1.Class.findById(classId);
        if (classDoc?.has_delivery_pack || application.requires_delivery) {
            const { DeliveryOrder } = await Promise.resolve().then(() => __importStar(require('../models/DeliveryOrder')));
            await DeliveryOrder.create({
                order_id: `DEL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                student_id: studentId,
                class_id: classDoc._id,
                month_key: mkey,
                delivery_method: application.delivery_method || 'Courier',
                shipping_address: application.shipping_address || 'Profile Address',
                status: 'pending_processing',
                created_at: new Date(),
            });
        }
        return { message: "Application approved and access granted", month_key: mkey, application };
    }
    throw new Error("Invalid status provided");
};
exports.handleApplication = handleApplication;
const getApplications = async (filters, requesterId, options) => {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const query = {};
    if (filters.class_id)
        query.class_id = filters.class_id;
    if (filters.status)
        query.status = filters.status;
    if (filters.student_id)
        query.user_id = filters.student_id;
    // Fix 2.5: Replaced 270-line aggregation pipeline with simple Mongoose query using Virtuals
    // Populate user and class to leverage virtuals
    const data = await ClassApplication_1.ClassApplication.find(query)
        .populate('user_id', 'first_name last_name email avatar')
        .populate('class_id', 'title code grade')
        .sort({ applied_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }); // virtuals: true includes the computedName
    const total = await ClassApplication_1.ClassApplication.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    return { data, page, limit, total, totalPages };
};
exports.getApplications = getApplications;
