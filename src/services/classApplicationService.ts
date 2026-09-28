import mongoose from 'mongoose';
import { ClassApplication } from '../models/ClassApplication';
import { Class } from '../models/Class';
import { User } from '../models/User';
import { ClassEntitlement } from '../models/ClassEntitlement';
import { RolePermission } from '../models/RolePermission';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';

const monthKey = (date: Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const applyForClass = async (data: any, userId: string) => {
  const { class_id, supporting_document, month } = data;

  const existing = await ClassApplication.findOne({
    user_id: userId,
    class_id,
    status: 'pending',
    ...(month ? { requested_month: month } : { requested_month: { $in: [null, undefined] } }),
  });
  if (existing) throw new Error("You have already applied for this class");

  if (month) {
    const existsEnt = await ClassEntitlement.exists({
      user_id: userId,
      class_id,
      month_key: month,
    });
    if (existsEnt) throw new Error("You already have access to that month");
  }

  const application = new ClassApplication({
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

export const handleApplication = async (applicationId: string, status: 'approved' | 'rejected', approverUserId: string) => {
  const application = await ClassApplication.findById(applicationId);
  if (!application) throw new Error("Application not found");

  const classId = application.class_id;
  const studentId = application.user_id;

  if (status === 'rejected') {
    await ClassApplication.findByIdAndDelete(applicationId);
    return { message: "Application rejected and deleted" };
  }

  if (status === 'approved') {
    const mkey = application.requested_month || monthKey(new Date());

    // idempotent membership
    await Class.updateOne({ _id: classId }, { $addToSet: { enrolled_students: studentId } });
    
    // Check if user has student role
    let studentRole = await Role.findOne({ name: 'Student' });
    if (!studentRole) studentRole = await Role.create({ name: 'Student' });

    await User.updateOne(
      { _id: studentId },
      { $addToSet: { role_ids: studentRole._id } }
    );

    // idempotent monthly entitlement
    await ClassEntitlement.updateOne(
      { user_id: studentId, class_id: classId, month_key: mkey },
      {
        $setOnInsert: {
          source: 'subscription',
          payment_ref: null,
          granted_at: new Date(),
        },
      },
      { upsert: true }
    );

    await ClassApplication.findByIdAndDelete(applicationId);

    return { message: "Application approved and access granted", month_key: mkey };
  }

  throw new Error("Invalid status provided");
};

export const getApplications = async (filters: any, requesterId: string, options: any) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  
  const query: any = {};
  if (filters.class_id) query.class_id = filters.class_id;
  if (filters.status) query.status = filters.status;
  if (filters.student_id) query.user_id = filters.student_id;
  
  // Fix 2.5: Replaced 270-line aggregation pipeline with simple Mongoose query using Virtuals
  // Populate user and class to leverage virtuals
  const data = await ClassApplication.find(query)
    .populate('user_id', 'first_name last_name email avatar')
    .populate('class_id', 'title code grade')
    .sort({ applied_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean({ virtuals: true }); // virtuals: true includes the computedName

  const total = await ClassApplication.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  return { data, page, limit, total, totalPages };
};
