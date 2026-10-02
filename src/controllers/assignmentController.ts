import { Request, Response } from 'express';
import { ClassEntitlement } from '../models/ClassEntitlement';
import { hasActiveEntitlement } from '../services/entitlementService';
import { Class } from '../models/Class';
import { User } from '../models/User';

import { AssignmentSubmission } from '../models/AssignmentSubmission';
import { Assignment } from '../models/Assignment';

export const upsertSubmission = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const userId = (req.user?._id || req.user?.userId || '').toString();

    const asg = await Assignment.findById(assignmentId);
    if (!asg) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const classId = asg.class_id;
    const cls = await Class.findById(classId);
    let isEnrolled = cls?.enrolled_students?.some(id => id.toString() === userId);
    if (!isEnrolled) {
      const { ClassEnrollment } = await import('../models/ClassEnrollment');
      const hasEnrollment = await ClassEnrollment.exists({ classId, userId, status: 'active' });
      isEnrolled = !!hasEnrollment;
    }
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: 'Not enrolled in this class' });
    }

    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const hasEntitlement = await hasActiveEntitlement(userId, classId.toString(), currentMonth);

    if (!hasEntitlement) {
      return res.status(403).json({ success: false, message: 'No active monthly payment (Entitlement missing)' });
    }

    const now = new Date();
    const isLate = asg.due_date ? now > new Date(asg.due_date) : false;
    const initialStatus = isLate ? 'late' : 'submitted';

    const fileUrls = Array.isArray(req.body.file_urls)
      ? req.body.file_urls.filter(Boolean)
      : (Array.isArray(req.body.urls) ? req.body.urls.filter(Boolean) : (req.body.url ? [req.body.url] : []));

    const update = {
      class_id: classId,
      url: req.body.url || (fileUrls[0] || null),
      urls: fileUrls,
      file_urls: fileUrls,
      submission_text: req.body.submission_text || req.body.note || '',
      file_ids: Array.isArray(req.body.file_ids) ? req.body.file_ids.filter(Boolean) : [],
      note: req.body.note || '',
      updated_at: now,
    };

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignment_id: assignmentId, student_id: userId },
      { 
        $set: update, 
        $setOnInsert: { 
          submitted_at: now,
          status: initialStatus
        } 
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully',
      data: submission,
      submission,
    });
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getMySubmission = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const userId = (req.user?._id || req.user?.userId || '').toString();

    const submission = await AssignmentSubmission.findOne({ assignment_id: assignmentId, student_id: userId }).lean();
    res.json({ success: true, data: submission, submission });
  } catch (error: any) {
    console.error('Error fetching my submission:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const listSubmissions = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const [data, total] = await Promise.all([
      AssignmentSubmission.find({ assignment_id: assignmentId })
        .populate('student_id', 'first_name last_name email avatar')
        .sort({ submitted_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AssignmentSubmission.countDocuments({ assignment_id: assignmentId }),
    ]);

    res.json({
      success: true,
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error listing submissions:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const userId = (req.user?._id || req.user?.userId || '').toString();

    const submission = await AssignmentSubmission.findByIdAndUpdate(
      submissionId,
      {
        $set: {
          grade: typeof grade === 'number' ? grade : null,
          feedback: feedback || '',
          graded_by: userId,
          updated_at: new Date(),
        },
      },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.json({ success: true, message: 'Submission graded successfully', data: submission });
  } catch (error: any) {
    console.error('Error grading submission:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const { id: classId } = req.params;
    const userId = req.user._id;
    const assignmentData = req.body;

    const { Assignment } = await import('../models/Assignment');

    const newAssignment = new Assignment({
      ...assignmentData,
      class_id: classId,
      created_by: userId,
    });
    
    await newAssignment.save();

    res.status(201).json({ success: true, message: 'Assignment created', assignment: newAssignment });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAssignmentsByClass = async (req: Request, res: Response) => {
  try {
    const { id: classId } = req.params;
    const { page = 1, limit = 10, sortBy = 'due_date', sortOrder = 'asc' } = req.query;

    const { Assignment } = await import('../models/Assignment');

    const query: any = { class_id: classId };
    
    // You could add upcoming_only / past_only filters here if needed.
    if (req.query.upcoming_only === 'true') {
      query.due_date = { $gte: new Date() };
    }
    if (req.query.past_only === 'true') {
      query.due_date = { $lt: new Date() };
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy as string]: sortDir };

    const assignments = await Assignment.find(query)
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Assignment.countDocuments(query);

    res.json({
      success: true,
      data: assignments,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAssignmentById = async (req: Request, res: Response) => {
  try {
    const id = req.params.assignmentId || req.params.id;
    const { Assignment } = await import('../models/Assignment');
    const assignment = await Assignment.findById(id).lean();
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    res.json({ success: true, assignment, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const id = req.params.assignmentId || req.params.id;
    const { Assignment } = await import('../models/Assignment');
    const assignment = await Assignment.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    res.json({ success: true, message: 'Assignment updated', assignment, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const id = req.params.assignmentId || req.params.id;
    const { Assignment } = await import('../models/Assignment');
    const assignment = await Assignment.findByIdAndDelete(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getAllSubmissions = async (req: Request, res: Response) => {
  try {
    const { class_id, status } = req.query;
    const query: any = {};
    if (class_id) query.class_id = class_id;
    if (status) query.status = status;
    const submissions = await AssignmentSubmission.find(query)
      .populate('student_id', 'first_name last_name email avatar')
      .populate('assignment_id', 'title max_points due_date')
      .sort({ submitted_at: -1 })
      .lean();
    res.json({ success: true, data: submissions, submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

