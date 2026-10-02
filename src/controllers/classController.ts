import { Request, Response } from 'express';
import * as classService from '../services/classService';

export const createClass = async (req: Request, res: Response) => {
  try {
    const classData = req.body;
    const userId = (req.user?._id || req.user?.userId || '').toString();

    const newClass = await classService.createClass(classData, userId);
    res.status(201).json({ success: true, data: newClass });
  } catch (error: any) {
    console.error('Error creating class:', error);
    if (error?.name === 'ValidationError' || error?.name === 'CastError') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


function sanitizeClassForGuest(cls: any) {
  if (!cls) return cls;
  const raw = typeof cls.toObject === 'function' ? cls.toObject() : { ...cls };
  delete raw.zoom_meeting_id;
  delete raw.zoom_join_url;
  delete raw.zoom_start_url;
  delete raw.enrolled_students;
  return raw;
}

export const getClasses = async (req: Request, res: Response) => {
  try {
    const filters = req.query || {};
    const classes = await classService.getClasses(filters);
    const isPrivileged = req.user && (req.user.permissions?.includes('classes.update') || req.user.permissions?.includes('classes.create'));
    if (!isPrivileged) {
      const sanitized = classes.map((c: any) => sanitizeClassForGuest(c));
      return res.json({ success: true, data: sanitized });
    }
    res.json({ success: true, data: classes });
  } catch (error: any) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cls = await classService.getClassById(id as string);
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    const isPrivileged = !!(req.user && (req.user.permissions?.includes('classes.update') || req.user.permissions?.includes('classes.create')));
    const userId = req.user ? (req.user._id || req.user.userId || '').toString() : null;
    let isEnrolled = false;
    if (userId) {
      isEnrolled = cls.enrolled_students?.some((sid: any) => (sid?._id || sid).toString() === userId) || false;
      if (!isEnrolled) {
        const { ClassEnrollment } = await import('../models/ClassEnrollment');
        const hasEnrollment = await ClassEnrollment.exists({ classId: cls._id, userId, status: 'active' });
        isEnrolled = !!hasEnrollment;
        if (isEnrolled) {
          const { Class } = await import('../models/Class');
          await Class.updateOne({ _id: cls._id }, { $addToSet: { enrolled_students: userId } });
        }
      }
    }
    if (!isPrivileged && !isEnrolled) {
      return res.json({ success: true, data: sanitizeClassForGuest(cls) });
    }
    res.json({ success: true, data: cls });
  } catch (error: any) {
    console.error('Error fetching class:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedClass = await classService.updateClass(id as string, req.body);
    res.json({ success: true, data: updatedClass });
  } catch (error: any) {
    console.error('Error updating class:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await classService.deleteClass(id as string);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error deleting class:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getEnrolledStudents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const students = await classService.getEnrolledStudents(id as string);
    res.json({ success: true, data: students });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getEnrolledClasses = async (req: Request, res: Response) => {
  try {
    const userId = (req.user?._id || req.user?.userId || '').toString();
    const classes = await classService.getEnrolledClassesForUser(userId);
    res.json({ success: true, data: classes });
  } catch (error: any) {
    console.error('Error fetching enrolled classes:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAllClassesWithStudents = async (req: Request, res: Response) => {
  try {
    const classes = await classService.getAllClassesWithStudents();
    res.json({ success: true, data: classes });
  } catch (error: any) {
    console.error('Error fetching all classes with students:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

