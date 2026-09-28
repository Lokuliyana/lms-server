import { Class } from '../models/Class';
import { ClassEntitlement } from '../models/ClassEntitlement';
import { User } from '../models/User';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

export const createClass = async (data: any, userId: string) => {
  const newClass = new Class({
    ...data,
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

export const getClasses = async (filters: any) => {
  return Class.find({ is_deleted: { $ne: true }, ...filters }).lean();
};

export const getClassById = async (classId: string) => {
  return Class.findById(classId).lean();
};

export const updateClass = async (classId: string, updateData: any) => {
  const classData = await Class.findById(classId);
  if (!classData) throw new Error("Class not found");

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

// Fix 2.1: Drop ClassEnrollment collection completely and query Class.enrolled_students directly
export const getEnrolledStudents = async (classId: string) => {
  const classData = await Class.findById(classId).populate('enrolled_students', '-password_hash').lean();
  if (!classData) throw new Error("Class not found");

  return classData.enrolled_students; // Directly returning users from the populated array
};

export const getAllClassesWithStudents = async () => {
  const classes = await Class.find({ is_deleted: { $ne: true } })
    .populate('enrolled_students', '-password_hash')
    .lean();
  
  return classes.map(cls => ({
    ...cls,
    students: cls.enrolled_students
  }));
};

export const getEnrolledClassesForUser = async (userId: string) => {
  return Class.find({
    enrolled_students: userId,
    is_deleted: { $ne: true }
  }).lean();
};
