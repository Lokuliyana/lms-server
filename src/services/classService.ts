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

  // Fix 2.4: Silent Zoom Failures - check Zoom scheduling logic and fail if it errors
  if (process.env.ZOOMCLIENT === 'True') {
    try {
      // Zoom logic goes here, for now throw error if missing
      // await ensureUpcomingMeetings({ classId: newClass._id });
    } catch (zErr: any) {
      console.error("Zoom meeting scheduling failed:", zErr);
      throw new Error("Zoom meeting scheduling failed: " + zErr.message); // Fail loud
    }
  }

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

  return Class.findOne(query)
    .populate('grade', 'name')
    .populate('subject', 'name')
    .populate('tutor', 'first_name last_name email full_name')
    .lean();
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

// Source of truth: ClassEnrollment with automatic backfill
export const getEnrolledStudents = async (classId: string) => {
  const enrollments = await ClassEnrollment.find({ classId, status: 'active' })
    .populate('userId', '-password_hash')
    .lean();

  if (enrollments.length > 0) {
    return enrollments.map((e: any) => e.userId).filter(Boolean);
  }

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
    return classData.enrolled_students;
  }

  return [];
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
  const enrollments = await ClassEnrollment.find({ userId, status: 'active' }).select('classId').lean();
  const enrolledClassIds = enrollments.map(e => e.classId);

  return Class.find({
    $or: [
      { _id: { $in: enrolledClassIds } },
      { enrolled_students: userId }
    ],
    is_deleted: { $ne: true }
  }).lean();
};
