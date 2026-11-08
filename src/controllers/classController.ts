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
  raw.recordings = [];
  raw.is_enrolled = false;
  raw.has_access = false;
  if (raw.special_session) {
    raw.special_session = {
      title: raw.special_session.title || '',
      date: raw.special_session.date || '',
      start: raw.special_session.start || '',
      end: raw.special_session.end || '',
      is_active: raw.special_session.is_active,
      description: raw.special_session.description || '',
    };
  }
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
    const isPrivileged = !!(
      req.user &&
      (['teacher', 'moderator', 'admin'].includes(req.user.role || '') ||
       req.user.permissions?.includes('classes.update') ||
       req.user.permissions?.includes('classes.create'))
    );
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
    const safeData = typeof cls.toObject === 'function' ? cls.toObject() : { ...cls };
    safeData.is_enrolled = isEnrolled;
    safeData.has_access = isEnrolled || isPrivileged;
    if (!isPrivileged) {
      delete safeData.enrolled_students;
      delete safeData.students;
    }
    res.json({ success: true, data: safeData });
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
    const isStaffOrTeacher = !!(
      req.user &&
      (['teacher', 'moderator', 'admin'].includes(req.user.role || '') ||
       req.user.permissions?.includes('classes.update') ||
       req.user.permissions?.includes('classes.create') ||
       req.user.permissions?.includes('attendance.mark') ||
       req.user.permissions?.includes('grades.record'))
    );

    if (!isStaffOrTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only teachers and staff can view enrolled student rosters',
        count: 0,
        students: [],
        data: []
      });
    }

    const { id } = req.params;
    const { month } = req.query;
    const students = await classService.getEnrolledStudents(id as string, month as string | undefined);
    res.json({ success: true, count: students.length, students, data: students, month });
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
    const isStaffOrTeacher = !!(
      req.user &&
      (['teacher', 'moderator', 'admin'].includes(req.user.role || '') ||
       req.user.permissions?.includes('classes.update') ||
       req.user.permissions?.includes('classes.create'))
    );

    if (!isStaffOrTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only teachers and staff can view student rosters',
        data: []
      });
    }

    const classes = await classService.getAllClassesWithStudents();
    res.json({ success: true, data: classes });
  } catch (error: any) {
    console.error('Error fetching all classes with students:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const revokeStudentAccess = async (req: Request, res: Response) => {
  try {
    const { id, studentId } = req.params;
    const { month } = req.query;

    const result = await classService.revokeStudentAccess(
      id as string,
      studentId as string,
      month as string | undefined
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error revoking student access:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to revoke access' });
  }
};

export const getCandidateStudents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { search, birthYear, age, ageOrYear, filter } = req.query;

    const candidates = await classService.getCandidateStudents(id as string, {
      search: search as string | undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
      age: age ? Number(age) : undefined,
      ageOrYear: (ageOrYear || filter) as string | undefined,
    });

    res.json({ success: true, count: candidates.length, data: candidates });
  } catch (error: any) {
    console.error('Error fetching candidate students:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch candidate students' });
  }
};

export const manualEnrollStudents = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds, month } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds array is required' });
    }

    const result = await classService.manualEnrollStudents(
      id as string,
      studentIds,
      month as string | undefined
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error manually enrolling students:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to manually enroll students' });
  }
};


