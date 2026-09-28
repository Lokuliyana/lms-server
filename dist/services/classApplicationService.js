"use strict";
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
        await ClassApplication_1.ClassApplication.findByIdAndDelete(applicationId);
        return { message: "Application rejected and deleted" };
    }
    if (status === 'approved') {
        const mkey = application.requested_month || monthKey(new Date());
        // idempotent membership
        await Class_1.Class.updateOne({ _id: classId }, { $addToSet: { enrolled_students: studentId } });
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
        await ClassApplication_1.ClassApplication.findByIdAndDelete(applicationId);
        return { message: "Application approved and access granted", month_key: mkey };
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
