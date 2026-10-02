import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Exam } from '../models/Exam';
import { ExamResult } from '../models/ExamResult';
import { Class } from '../models/Class';
import { calculateGrade } from './gradeController';

export const createExam = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      class_id,
      exam_type,
      total_marks = 100,
      pass_marks = 40,
      held_date,
      question_paper_url,
      marking_scheme_url,
      is_published = false,
    } = req.body;

    const userId = (req as any).user?.userId || (req as any).user?._id;
    if (!title || !class_id) {
      return res.status(400).json({ success: false, message: 'Title and class_id are required' });
    }

    const classDoc = await Class.findById(class_id);
    if (!classDoc || classDoc.is_deleted) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const exam = await Exam.create({
      title,
      description: description || '',
      class_id,
      exam_type: exam_type || 'paper',
      total_marks: Number(total_marks) || 100,
      pass_marks: Number(pass_marks) || 40,
      held_date: held_date ? new Date(held_date) : new Date(),
      question_paper_url: question_paper_url || '',
      marking_scheme_url: marking_scheme_url || '',
      is_published: Boolean(is_published),
      created_by: userId,
    });

    res.status(201).json({ success: true, message: 'Exam created successfully', data: exam });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getExams = async (req: Request, res: Response) => {
  try {
    const { class_id, is_published, search } = req.query;
    const filter: any = {};

    if (class_id && class_id !== 'all') {
      filter.class_id = class_id;
    }

    const userRole = (req as any).user?.role?.name || (req as any).user?.role || '';
    const isStudent = userRole.toLowerCase() === 'student' || !(req as any).user?.permissions?.includes('grades.record');

    if (isStudent) {
      filter.is_published = true;
    } else if (is_published !== undefined) {
      filter.is_published = is_published === 'true';
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    const exams = await Exam.find(filter)
      .populate('class_id', 'title classId class_code grade subject')
      .populate('created_by', 'first_name last_name email')
      .sort({ held_date: -1 });

    res.json({ success: true, count: exams.length, data: exams });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getExamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id)
      .populate('class_id', 'title classId class_code grade subject')
      .populate('created_by', 'first_name last_name email');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const result = await ExamResult.findOne({
      $or: [{ examId: exam._id }, { classId: exam.class_id, examTitle: exam.title }],
    }).populate('scores.studentId', 'first_name last_name email phone');

    res.json({ success: true, data: { exam, result } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const exam = await Exam.findByIdAndUpdate(id, updateData, { new: true });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Sync is_published with ExamResult if provided
    if (updateData.is_published !== undefined) {
      await ExamResult.updateMany(
        { $or: [{ examId: exam._id }, { classId: exam.class_id, examTitle: exam.title }] },
        { isPublished: updateData.is_published }
      );
    }

    res.json({ success: true, message: 'Exam updated successfully', data: exam });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByIdAndDelete(id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    await ExamResult.deleteMany({
      $or: [{ examId: exam._id }, { classId: exam.class_id, examTitle: exam.title }],
    });

    res.json({ success: true, message: 'Exam and associated marks deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const recordBulkExamResults = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scores, is_published, notes } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?._id;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (!scores || !Array.isArray(scores)) {
      return res.status(400).json({ success: false, message: 'Scores array is required' });
    }

    const max = exam.total_marks || 100;
    const computedScores = scores.map((s: any) => {
      const studentId = s.student_id || s.studentId;
      const isAbsent = Boolean(s.is_absent || s.isAbsent);
      const marks = isAbsent ? 0 : Number(s.marks_obtained !== undefined ? s.marks_obtained : s.marksObtained) || 0;
      const pct = isAbsent ? 0 : Math.round((marks / max) * 100 * 10) / 10;

      return {
        studentId: new mongoose.Types.ObjectId(studentId),
        marksObtained: marks,
        percentage: pct,
        grade: isAbsent ? 'AB' : s.grade || calculateGrade(pct),
        isAbsent,
        remarks: s.remarks || '',
      };
    });

    let result = await ExamResult.findOne({
      $or: [{ examId: exam._id }, { classId: exam.class_id, examTitle: exam.title }],
    });

    const shouldPublish = is_published !== undefined ? Boolean(is_published) : (result ? result.isPublished : exam.is_published);

    if (result) {
      result.scores = computedScores as any;
      result.maxMarks = max;
      result.passMarks = exam.pass_marks;
      result.examDate = exam.held_date;
      result.examTitle = exam.title;
      result.examId = exam._id as mongoose.Types.ObjectId;
      result.isPublished = shouldPublish;
      if (notes !== undefined) result.notes = notes;
      await result.save();
    } else {
      result = await ExamResult.create({
        examId: exam._id,
        classId: exam.class_id,
        examTitle: exam.title,
        examDate: exam.held_date,
        maxMarks: max,
        passMarks: exam.pass_marks,
        isPublished: shouldPublish,
        recordedBy: userId,
        scores: computedScores,
        notes: notes || '',
      });
    }

    if (is_published !== undefined && exam.is_published !== shouldPublish) {
      exam.is_published = shouldPublish;
      await exam.save();
    }

    res.json({
      success: true,
      message: 'Exam marks recorded successfully',
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyExamResults = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const results = await ExamResult.find({
      isPublished: true,
      'scores.studentId': userObjectId,
    })
      .populate('classId', 'title classId class_code grade subject')
      .populate('examId', 'title exam_type total_marks pass_marks held_date question_paper_url marking_scheme_url')
      .sort({ examDate: -1 });

    const studentResults = results.map((r: any) => {
      const scoreObj = r.scores.find((s: any) => s.studentId && s.studentId.toString() === userId.toString());
      return {
        _id: r._id,
        examId: r.examId,
        class: r.classId,
        examTitle: r.examTitle,
        examDate: r.examDate,
        maxMarks: r.maxMarks,
        passMarks: r.passMarks,
        score: scoreObj || null,
        notes: r.notes,
      };
    });

    res.json({ success: true, count: studentResults.length, data: studentResults });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
