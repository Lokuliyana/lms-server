import mongoose from 'mongoose';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { RolePermission } from '../models/RolePermission';
import { User } from '../models/User';

export const CANONICAL_PERMISSIONS = [
  // Classes
  { key: 'classes.create', module: 'classes', action: 'create', label: 'Create Classes' },
  { key: 'classes.update', module: 'classes', action: 'update', label: 'Update Classes' },
  { key: 'classes.delete', module: 'classes', action: 'delete', label: 'Delete Classes' },
  { key: 'classes.read', module: 'classes', action: 'read', label: 'Read Classes' },
  { key: 'classes.apply', module: 'classes', action: 'apply', label: 'Apply for Classes' },

  // Live Sessions (Zoom)
  { key: 'zoom.create', module: 'zoom', action: 'create', label: 'Create Live Zoom Sessions' },
  { key: 'zoom.manage', module: 'zoom', action: 'manage', label: 'Manage Live Zoom Sessions' },
  { key: 'zoom.join', module: 'zoom', action: 'join', label: 'Join Live Zoom Sessions' },

  // Recordings & Media
  { key: 'recordings.create', module: 'recordings', action: 'create', label: 'Create/Upload Recordings' },
  { key: 'recordings.delete', module: 'recordings', action: 'delete', label: 'Delete Recordings' },
  { key: 'recordings.read', module: 'recordings', action: 'read', label: 'Read Recordings' },

  // Quizzes
  { key: 'quizzes.manage', module: 'quizzes', action: 'manage', label: 'Manage Quizzes' },
  { key: 'quizzes.grade', module: 'quizzes', action: 'grade', label: 'Grade Quizzes' },
  { key: 'quizzes.attempt', module: 'quizzes', action: 'attempt', label: 'Attempt Quizzes' },
  { key: 'quizzes.reviewOwn', module: 'quizzes', action: 'reviewOwn', label: 'Review Own Quiz Submissions' },

  // Challenges
  { key: 'challenges.manage', module: 'challenges', action: 'manage', label: 'Manage Challenges' },
  { key: 'challenges.grade', module: 'challenges', action: 'grade', label: 'Grade Challenges' },
  { key: 'challenges.attempt', module: 'challenges', action: 'attempt', label: 'Attempt Challenges' },

  // Assignments
  { key: 'assignments.manage', module: 'assignments', action: 'manage', label: 'Manage Assignments' },
  { key: 'assignments.grade', module: 'assignments', action: 'grade', label: 'Grade Assignments' },
  { key: 'assignments.submit', module: 'assignments', action: 'submit', label: 'Submit Assignments' },

  // Attendance (New)
  { key: 'attendance.mark', module: 'attendance', action: 'mark', label: 'Mark Attendance' },
  { key: 'attendance.update', module: 'attendance', action: 'update', label: 'Update Attendance' },
  { key: 'attendance.view', module: 'attendance', action: 'view', label: 'View Attendance' },

  // Exam Results (New)
  { key: 'grades.record', module: 'grades', action: 'record', label: 'Record Exam Grades' },
  { key: 'grades.publish', module: 'grades', action: 'publish', label: 'Publish Exam Grades' },
  { key: 'grades.view', module: 'grades', action: 'view', label: 'View Exam Grades' },
  { key: 'grades.exportReport', module: 'grades', action: 'exportReport', label: 'Export Grade Reports' },

  // Payments & Entitlements
  { key: 'payments.manage', module: 'payments', action: 'manage', label: 'Manage Payments and Entitlements' },
  { key: 'payments.create', module: 'payments', action: 'create', label: 'Initiate Digital Checkout' },
  { key: 'payments.viewOwn', module: 'payments', action: 'viewOwn', label: 'View Own Payments' },

  // User Management
  { key: 'users.create', module: 'users', action: 'create', label: 'Create Users' },
  { key: 'users.read', module: 'users', action: 'read', label: 'Read Users' },
  { key: 'users.update', module: 'users', action: 'update', label: 'Update Users' },
  { key: 'users.delete', module: 'users', action: 'delete', label: 'Delete Users' },

  // Branding
  { key: 'branding.manage', module: 'branding', action: 'manage', label: 'Manage Site Branding' },
  { key: 'branding.view', module: 'branding', action: 'view', label: 'View Site Branding' },

  // Store & Study Packs
  { key: 'store.view', module: 'store', action: 'view', label: 'Browse Store Products' },
  { key: 'store.purchase', module: 'store', action: 'purchase', label: 'Purchase Store Products' },
  { key: 'store.manage', module: 'store', action: 'manage', label: 'Manage Store Products' },

  // Deliveries & Physical Dispatch
  { key: 'delivery.manage', module: 'delivery', action: 'manage', label: 'Manage Delivery Dispatch' },
  { key: 'delivery.viewOwn', module: 'delivery', action: 'viewOwn', label: 'View Own Deliveries' },

  // Digital Study Packs
  { key: 'study_packs.view', module: 'study_packs', action: 'view', label: 'View Digital Study Packs' },
  { key: 'study_packs.manage', module: 'study_packs', action: 'manage', label: 'Manage Digital Study Packs' }
];

export const seedPermissionsAndRoles = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms');
    }
    console.log('Seeding canonical permissions...');
    
    // 1. Seed all canonical permissions idempotently
    const permMap = new Map<string, any>();
    for (const p of CANONICAL_PERMISSIONS) {
      const doc = await Permission.findOneAndUpdate(
        { key: p.key },
        { $set: { module: p.module, action: p.action, label: p.label } },
        { upsert: true, new: true }
      );
      permMap.set(p.key, doc._id);
    }

    // 2. Ensure all 4 standard roles exist
    const roleNames = ['Teacher', 'teacher', 'Moderator', 'moderator', 'Student', 'student', 'Admin', 'admin'];
    const roles: Record<string, any> = {};

    for (const name of roleNames) {
      let r = await Role.findOne({ name });
      if (!r) {
        r = await Role.create({ name, is_system_role: true });
      }
      roles[name] = r;
    }

    // 3. Define Role Permission Grants per matrix
    // Teacher & Admin: full access to ALL keys
    const teacherKeys = CANONICAL_PERMISSIONS.map(p => p.key);

    // Moderator: operations, user viewing, store & deliveries
    const moderatorKeys = [
      'classes.update',
      'classes.read',
      'zoom.create',
      'zoom.manage',
      'zoom.join',
      'recordings.create',
      'recordings.delete',
      'recordings.read',
      'quizzes.manage',
      'quizzes.grade',
      'challenges.manage',
      'challenges.grade',
      'assignments.manage',
      'assignments.grade',
      'attendance.mark',
      'attendance.update',
      'attendance.view',
      'grades.record',
      'grades.publish',
      'grades.view',
      'grades.exportReport',
      'payments.manage',
      'branding.view',
      'users.read',
      'store.view',
      'store.manage',
      'delivery.manage',
      'delivery.viewOwn',
      'study_packs.view',
      'study_packs.manage'
    ];

    // Student: apply, attempt, submit, own-scoped reads, store purchase & delivery tracking
    const studentKeys = [
      'classes.read',
      'classes.apply',
      'zoom.join',
      'recordings.read',
      'quizzes.attempt',
      'quizzes.reviewOwn',
      'challenges.attempt',
      'assignments.submit',
      'attendance.view',
      'grades.view',
      'payments.viewOwn',
      'payments.create',
      'branding.view',
      'store.view',
      'store.purchase',
      'delivery.viewOwn',
      'study_packs.view'
    ];

    const linkRolePermissions = async (roleDoc: any, keys: string[]) => {
      if (!roleDoc) return;
      // Get all current valid permIds for this key list
      const targetPermIds = keys.map(k => permMap.get(k)).filter(Boolean);
      // Remove stale permissions that are no longer in this role's key list
      await RolePermission.deleteMany({
        role_id: roleDoc._id,
        permission_id: { $nin: targetPermIds }
      });
      for (const permId of targetPermIds) {
        await RolePermission.updateOne(
          { role_id: roleDoc._id, permission_id: permId },
          { $set: { role_id: roleDoc._id, permission_id: permId } },
          { upsert: true }
        );
      }
    };

    console.log('Linking role permissions...');
    await linkRolePermissions(roles['Teacher'], teacherKeys);
    await linkRolePermissions(roles['teacher'], teacherKeys);
    await linkRolePermissions(roles['Admin'], teacherKeys);
    await linkRolePermissions(roles['admin'], teacherKeys);

    await linkRolePermissions(roles['Moderator'], moderatorKeys);
    await linkRolePermissions(roles['moderator'], moderatorKeys);

    await linkRolePermissions(roles['Student'], studentKeys);
    await linkRolePermissions(roles['student'], studentKeys);

    // 4. Assign Primary Accounts Explicitly
    console.log('Migrating existing user role bindings...');
    const teacherUser = await User.findOne({ email: 'teacher@lms.com' });
    if (teacherUser) {
      teacherUser.role_ids = [roles['Teacher']._id, roles['teacher']._id];
      await teacherUser.save();
      console.log('Assigned teacher@lms.com to Teacher role.');
    }

    const studentUser = await User.findOne({ email: 'student@lms.com' });
    if (studentUser) {
      studentUser.role_ids = [roles['Student']._id, roles['student']._id];
      await studentUser.save();
      console.log('Assigned student@lms.com to Student role.');
    }

    const moderatorUser = await User.findOne({ email: 'moderator@lms.com' });
    if (moderatorUser) {
      moderatorUser.role_ids = [roles['Moderator']._id, roles['moderator']._id];
      await moderatorUser.save();
      console.log('Assigned moderator@lms.com to Moderator role.');
    }

    const adminUser = await User.findOne({ email: 'admin@lms.com' });
    if (adminUser) {
      adminUser.role_ids = [roles['Admin']._id, roles['admin']._id, roles['Teacher']._id];
      await adminUser.save();
      console.log('Assigned admin@lms.com to Admin/Teacher role.');
    }

    // 5. Ensure default Subjects and Grades exist
    const { Subject } = await import('../models/Subject');
    const { Grade } = await import('../models/Grade');
    const defaultSubjects = ['Mathematics', 'Science', 'Physics'];
    for (const subName of defaultSubjects) {
      await Subject.updateOne(
        { name: subName },
        { $setOnInsert: { name: subName, is_active: true } },
        { upsert: true }
      );
    }
    const defaultGrades = ['Grade 10', 'Grade 11', 'Grade 12'];
    for (const grdName of defaultGrades) {
      await Grade.updateOne(
        { name: grdName },
        { $setOnInsert: { name: grdName, is_active: true } },
        { upsert: true }
      );
    }

    console.log('Permission and Role seeding complete!');
  } catch (err) {
    console.error('Seeding error:', err);
    throw err;
  }
};

if (require.main === module) {
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms')
    .then(async () => {
      await seedPermissionsAndRoles();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err: any) => {
      console.error(err);
      process.exit(1);
    });
}

