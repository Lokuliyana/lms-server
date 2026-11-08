import { Class } from '../models/Class';
import { ClassEntitlement } from '../models/ClassEntitlement';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { resolveSubject, resolveGrade } from '../utils/taxonomyResolver';

const { ObjectId } = mongoose.Types;

export const createClass = async (data: any, userId: string) => {
  const resolvedSubject = await resolveSubject(data.subject);
  const resolvedGrade = await resolveGrade(data.grade);

  const price = data.price !== undefined
    ? Number(data.price)
    : data.fees !== undefined
    ? Number(data.fees)
    : data.classFee !== undefined
    ? Number(data.classFee)
    : 0;

  const rawBatches = Array.isArray(data.batches) && data.batches.length > 0
    ? data.batches
    : Array.isArray(data.batch_schedule) && data.batch_schedule.length > 0
    ? data.batch_schedule
    : Array.isArray(data.classTime)
    ? data.classTime.map(({ day, start, end }: any) => ({ batch_name: `${day} Batch`, day, start, end }))
    : [{ batch_name: "Default Batch", day: "Monday", start: "08:00", end: "10:00" }];

  const normalizedBatches = rawBatches.map((b: any, i: number) => ({
    batch_name: b.batch_name || `Batch ${i + 1}`,
    day: b.day || 'Monday',
    start: b.start || '08:00',
    end: b.end || '10:00',
  }));

  const newClass = new Class({
    ...data,
    subject: resolvedSubject,
    grade: resolvedGrade,
    price,
    batches: normalizedBatches,
    delivery_type: data.delivery_type || 'online_only',
    created_by: userId,
  });

  await newClass.save();
  return newClass;
};


import { Grade } from '../models/Grade';
import { Subject } from '../models/Subject';

export const getClasses = async (filters: any = {}) => {
  const query: any = { is_deleted: { $ne: true } };

  // Handle grade filter: could be ObjectId, or grade name / number (e.g. "12", "Grade 12", "6")
  if (filters.grade && filters.grade !== 'all') {
    if (mongoose.Types.ObjectId.isValid(filters.grade)) {
      query.grade = new mongoose.Types.ObjectId(filters.grade);
    } else {
      const cleanGrade = String(filters.grade).replace(/^grade\s*/i, '').trim();
      const matchedGrades = await Grade.find({
        $or: [
          { name: new RegExp(`^${cleanGrade}$`, 'i') },
          { name: new RegExp(`^Grade\\s*${cleanGrade}$`, 'i') },
        ]
      }).select('_id').lean();
      
      const gradeIds = matchedGrades.map((g: any) => g._id);
      if (gradeIds.length > 0) {
        query.grade = { $in: gradeIds };
      } else {
        return [];
      }
    }
  }

  // Handle subject filter: could be ObjectId or subject name (e.g. "mathematics", "math", "science")
  if (filters.subject && filters.subject !== 'all') {
    if (mongoose.Types.ObjectId.isValid(filters.subject)) {
      query.subject = new mongoose.Types.ObjectId(filters.subject);
    } else {
      const cleanSubject = String(filters.subject).trim();
      const matchedSubjects = await Subject.find({
        $or: [
          { name: new RegExp(`^${cleanSubject}$`, 'i') },
          { name: new RegExp(`^${cleanSubject}`, 'i') },
          { name: new RegExp(cleanSubject, 'i') },
        ]
      }).select('_id').lean();

      const subjectIds = matchedSubjects.map((s: any) => s._id);
      if (subjectIds.length > 0) {
        query.subject = { $in: subjectIds };
      } else {
        return [];
      }
    }
  }

  if (filters.format && filters.format !== 'all') query.format = filters.format;
  if (filters.type && filters.type !== 'all') query.type = filters.type;
  if (filters.tutor && mongoose.Types.ObjectId.isValid(filters.tutor)) query.tutor = filters.tutor;

  return Class.find(query)
    .populate('grade', 'name')
    .populate('subject', 'name')
    .populate('tutor', 'first_name last_name email full_name')
    .lean();
};

export const getClassById = async (classId: string) => {
  if (!classId || typeof classId !== 'string' || classId === 'undefined' || classId === 'null') {
    return null;
  }

  const query: any = { is_deleted: { $ne: true } };
  if (mongoose.Types.ObjectId.isValid(classId)) {
    query._id = new mongoose.Types.ObjectId(classId);
  } else {
    const numId = Number(classId);
    query.$or = [
      { class_code: classId },
      ...(isNaN(numId) ? [] : [{ classId: numId }]),
    ];
  }

  const cls: any = await Class.findOne(query)
    .populate('grade', 'name')
    .populate('subject', 'name')
    .populate('tutor', 'first_name last_name email full_name')
    .populate('enrolled_students', 'first_name last_name email phone avatar')
    .lean();

  if (cls && Array.isArray(cls.enrolled_students)) {
    const sIds = cls.enrolled_students.map((s: any) => s._id || s);
    const profiles = await StudentProfile.find({ user_id: { $in: sIds } }).lean();
    const profileMap = new Map<string, any>();
    profiles.forEach((p) => {
      if (p.user_id) profileMap.set(String(p.user_id), p);
    });
    cls.enrolled_students = cls.enrolled_students.map((s: any) => {
      const p = profileMap.get(String(s._id || s));
      return normalizeStudentUser(s, p);
    });
    cls.students = cls.enrolled_students;
  }

  return cls;
};

export const updateClass = async (classId: string, updateData: any) => {
  const classData = await Class.findById(classId);
  if (!classData) throw new Error("Class not found");

  if (updateData.subject !== undefined) {
    updateData.subject = await resolveSubject(updateData.subject);
  }
  if (updateData.grade !== undefined) {
    updateData.grade = await resolveGrade(updateData.grade);
  }
  if (updateData.fees !== undefined && updateData.price === undefined) {
    updateData.price = Number(updateData.fees);
  }
  if (updateData.batch_schedule && !updateData.batches) {
    updateData.batches = updateData.batch_schedule;
  }

  Object.assign(classData, updateData);
  await classData.save();
  return classData;
};


export const deleteClass = async (classId: string) => {
  const classData = await Class.findById(classId);
  if (!classData) throw new Error("Class not found");
  
  classData.is_deleted = true;
  await classData.save();
  return { message: "Class deleted successfully" };
};

import { ClassEnrollment } from '../models/ClassEnrollment';
import { StudentProfile } from '../models/StudentProfile';

function normalizeStudentUser(u: any, profile?: any) {
  if (!u) return u;
  const raw = typeof u.toObject === 'function' ? u.toObject() : { ...u };
  const first = raw.first_name || raw.firstName || '';
  const last = raw.last_name || raw.lastName || '';
  const combined = `${first} ${last}`.trim();
  const fullName =
    profile?.full_name ||
    raw.full_name ||
    raw.fullName ||
    (combined.length > 0 ? combined : null) ||
    raw.computedName ||
    raw.name ||
    raw.email ||
    'Student';

  raw.full_name = fullName;
  raw.name = fullName;
  if (profile) {
    raw.student_profile = profile;
  }
  return raw;
}

// Source of truth: ClassEnrollment & ClassEntitlement with monthly filtering
export const getEnrolledStudents = async (classId: string, month?: string) => {
  const classObjId = mongoose.Types.ObjectId.isValid(classId)
    ? new mongoose.Types.ObjectId(classId)
    : classId;

  let rawStudents: any[] = [];

  if (month && /^\d{4}-\d{2}$/.test(month.trim())) {
    const targetMonth = month.trim();
    const studentMap = new Map<string, any>();

    // 1. Query ClassEntitlement records for target month
    const entitlements = await ClassEntitlement.find({
      $or: [{ class_id: classId }, { class_id: classObjId }],
      month_key: targetMonth,
    })
      .populate('user_id', '-password_hash')
      .lean();

    for (const ent of entitlements) {
      if (ent.user_id && (ent.user_id as any)._id) {
        studentMap.set(String((ent.user_id as any)._id), ent.user_id);
      }
    }

    // 2. Query ClassEnrollments enrolled in that month
    const [y, m] = targetMonth.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const monthlyEnrollments = await ClassEnrollment.find({
      $or: [{ classId: classId }, { classId: classObjId }],
      status: 'active',
      enrolledAt: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .populate('userId', '-password_hash')
      .lean();

    for (const enr of monthlyEnrollments) {
      if (enr.userId && (enr.userId as any)._id) {
        studentMap.set(String((enr.userId as any)._id), enr.userId);
      }
    }

    // 3. For free classes (price === 0), all active students have access to each month
    const classDoc = await Class.findById(classId).lean();
    if (classDoc && (!classDoc.price || classDoc.price === 0)) {
      const allActive = await ClassEnrollment.find({
        $or: [{ classId: classId }, { classId: classObjId }],
        status: 'active',
      })
        .populate('userId', '-password_hash')
        .lean();

      for (const enr of allActive) {
        if (enr.userId && (enr.userId as any)._id) {
          studentMap.set(String((enr.userId as any)._id), enr.userId);
        }
      }
    }

    rawStudents = Array.from(studentMap.values());
  } else {
    const enrollments = await ClassEnrollment.find({
      $or: [{ classId: classId }, { classId: classObjId }],
      status: 'active',
    })
      .populate('userId', '-password_hash')
      .lean();

    if (enrollments.length > 0) {
      rawStudents = enrollments.map((e: any) => e.userId).filter(Boolean);
    } else {
      // Fallback to legacy Class.enrolled_students and backfill ClassEnrollment
      const classData = await Class.findById(classId).populate('enrolled_students', '-password_hash').lean();
      if (!classData) throw new Error("Class not found");

      if (classData.enrolled_students && classData.enrolled_students.length > 0) {
        for (const student of classData.enrolled_students as any[]) {
          if (student?._id) {
            await ClassEnrollment.updateOne(
              { classId, userId: student._id },
              { $setOnInsert: { classId, userId: student._id, status: 'active', enrolledAt: new Date() } },
              { upsert: true }
            );
          }
        }
        rawStudents = classData.enrolled_students;
      }
    }
  }

  // Populate profiles to ensure real full_name, DOB, age, etc.
  const studentIds = rawStudents.map((s) => s._id || s);
  const profiles = await StudentProfile.find({ user_id: { $in: studentIds } }).lean();
  const profileMap = new Map<string, any>();
  profiles.forEach((p) => {
    if (p.user_id) profileMap.set(String(p.user_id), p);
  });

  return rawStudents.map((s) => {
    const sid = String(s._id || s);
    const p = profileMap.get(sid);
    return normalizeStudentUser(s, p);
  });
};

export const getCandidateStudents = async (
  classId: string,
  params: { search?: string; birthYear?: number; age?: number; ageOrYear?: string | number } = {}
) => {
  const currentYear = new Date().getFullYear();

  // Parse unified ageOrYear filter if provided
  let targetBirthYear: number | undefined =
    params.birthYear !== undefined && !isNaN(Number(params.birthYear))
      ? Number(params.birthYear)
      : undefined;
  let targetAge: number | undefined =
    params.age !== undefined && !isNaN(Number(params.age))
      ? Number(params.age)
      : undefined;

  if (params.ageOrYear !== undefined && params.ageOrYear !== null && String(params.ageOrYear).trim() !== "") {
    const num = Number(String(params.ageOrYear).trim());
    if (!isNaN(num)) {
      if (num >= 1900) {
        targetBirthYear = num;
      } else if (num > 0 && num < 120) {
        targetAge = num;
      }
    }
  }

  const classDoc = await Class.findById(classId).lean();
  const enrolledIdSet = new Set<string>();
  if (classDoc?.enrolled_students) {
    classDoc.enrolled_students.forEach((s: any) => {
      enrolledIdSet.add(String(s?._id || s));
    });
  }

  const activeEnrollments = await ClassEnrollment.find({
    classId: new mongoose.Types.ObjectId(classId),
    status: 'active',
  }).select('userId').lean();
  activeEnrollments.forEach((e: any) => {
    if (e.userId) enrolledIdSet.add(String(e.userId));
  });

  const users = await User.find({ role: { $nin: ['admin', 'moderator'] } }).lean();
  const userIds = users.map((u) => u._id);

  const profiles = await StudentProfile.find({ user_id: { $in: userIds } }).lean();
  const profileMap = new Map<string, any>();
  profiles.forEach((p) => {
    if (p.user_id) profileMap.set(String(p.user_id), p);
  });

  const candidates = [];
  for (const u of users) {
    const p = profileMap.get(String(u._id));
    const first = u.first_name || '';
    const last = u.last_name || '';
    const combined = `${first} ${last}`.trim();
    const fullName = p?.full_name || (combined.length > 0 ? combined : null) || u.email || 'Student';

    let dob: Date | null = null;
    let birthYear: number | null = null;
    let calculatedAge: number | null = null;

    if (p?.birth_date) {
      const d = new Date(p.birth_date);
      if (!isNaN(d.getTime())) {
        dob = d;
        birthYear = d.getFullYear();
        let a = currentYear - d.getFullYear();
        const m = new Date().getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) {
          a--;
        }
        calculatedAge = Math.max(0, a);
      }
    }

    // Filter by birthYear if provided
    if (targetBirthYear !== undefined) {
      const matchesYear =
        birthYear === targetBirthYear ||
        (calculatedAge !== null && (currentYear - calculatedAge) === targetBirthYear);
      if (!matchesYear) {
        continue;
      }
    }

    // Filter by age if provided
    if (targetAge !== undefined) {
      const matchesAge =
        calculatedAge === targetAge ||
        (birthYear !== null && (currentYear - birthYear) === targetAge);
      if (!matchesAge) {
        continue;
      }
    }

    // Filter by name/email/phone search if provided
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      const match =
        fullName.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q);
      if (!match) {
        continue;
      }
    }

    candidates.push({
      _id: u._id,
      first_name: u.first_name,
      last_name: u.last_name,
      full_name: fullName,
      name: fullName,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar || p?.avatar_url,
      birth_date: dob ? dob.toISOString().split('T')[0] : null,
      birth_year: birthYear,
      age: calculatedAge,
      school: p?.school || '',
      grade: p?.grade || '',
      isEnrolled: enrolledIdSet.has(String(u._id)),
    });
  }

  return candidates;
};

export const revokeStudentAccess = async (classId: string, studentId: string, month?: string) => {
  const classObjId = mongoose.Types.ObjectId.isValid(classId)
    ? new mongoose.Types.ObjectId(classId)
    : classId;
  const studentObjId = mongoose.Types.ObjectId.isValid(studentId)
    ? new mongoose.Types.ObjectId(studentId)
    : studentId;

  // 1. Deactivate ClassEnrollment
  await ClassEnrollment.updateMany(
    {
      $and: [
        { $or: [{ classId: classId }, { classId: classObjId }] },
        { $or: [{ userId: studentId }, { userId: studentObjId }] },
      ],
    },
    { status: 'cancelled' }
  );

  // 2. Remove ClassEntitlement
  const entQuery: any = {
    $and: [
      { $or: [{ class_id: classId }, { class_id: classObjId }] },
      { $or: [{ user_id: studentId }, { user_id: studentObjId }] },
    ],
  };
  if (month && month !== 'all') {
    entQuery.month_key = month.trim();
  }
  await ClassEntitlement.deleteMany(entQuery);

  // 3. Remove from Class.enrolled_students if all months or permanent
  if (!month || month === 'all') {
    await Class.updateOne(
      { _id: classObjId },
      { $pull: { enrolled_students: studentObjId } }
    );
  }

  return { success: true, message: 'Student access reverted successfully' };
};

export const manualEnrollStudents = async (
  classId: string,
  studentIds: string[],
  month?: string
) => {
  const classObjId = mongoose.Types.ObjectId.isValid(classId)
    ? new mongoose.Types.ObjectId(classId)
    : classId;

  const validIds = studentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    throw new Error('No valid student IDs provided');
  }

  // 1. Add to Class.enrolled_students
  await Class.updateOne(
    { _id: classObjId },
    { $addToSet: { enrolled_students: { $each: validIds.map((id) => new mongoose.Types.ObjectId(id)) } } }
  );

  // 2. Upsert ClassEnrollment for each student
  for (const sid of validIds) {
    const sObjId = new mongoose.Types.ObjectId(sid);
    await ClassEnrollment.findOneAndUpdate(
      { classId: classObjId, userId: sObjId },
      {
        classId: classObjId,
        userId: sObjId,
        status: 'active',
        enrolledAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // 3. If month provided, grant ClassEntitlement
    if (month && /^\d{4}-\d{2}$/.test(month.trim())) {
      await ClassEntitlement.findOneAndUpdate(
        { class_id: classObjId, user_id: sObjId, month_key: month.trim() },
        {
          class_id: classObjId,
          user_id: sObjId,
          month_key: month.trim(),
          granted_by: 'manual_admin',
        },
        { upsert: true, new: true }
      );
    }
  }

  return {
    success: true,
    count: validIds.length,
    message: `${validIds.length} student(s) enrolled successfully.`,
  };
};

export const getAllClassesWithStudents = async () => {
  const classes = await Class.find({ is_deleted: { $ne: true } }).lean();
  
  const results = [];
  for (const cls of classes) {
    const students = await getEnrolledStudents(cls._id.toString());
    results.push({
      ...cls,
      students,
      enrolled_students: students.map((s: any) => s._id || s)
    });
  }
  
  return results;
};

export const getEnrolledClassesForUser = async (userId: string) => {
  const [enrollments, entitlements] = await Promise.all([
    ClassEnrollment.find({ userId, status: 'active' }).select('classId').lean(),
    ClassEntitlement.find({ user_id: userId }).select('class_id').lean(),
  ]);
  const enrolledClassIds = enrollments.map(e => e.classId).filter(Boolean);
  const entitlementClassIds = entitlements.map(e => e.class_id).filter(Boolean);

  return Class.find({
    $or: [
      { _id: { $in: [...enrolledClassIds, ...entitlementClassIds] } },
      { enrolled_students: userId }
    ],
    is_deleted: { $ne: true }
  }).lean();
};
