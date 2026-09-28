import { Request, Response } from 'express';
import * as classService from '../services/classService';

export const createClass = async (req: Request, res: Response) => {
  try {
    const classData = req.body;
    const userId = req.user._id;

    const newClass = await classService.createClass(classData, userId);
    res.status(201).json({ success: true, data: newClass });
  } catch (error: any) {
    // Fix 2.6: Information Disclosure - Don't blindly return error.message for HTTP 500
    console.error('Error creating class:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getClasses = async (req: Request, res: Response) => {
  try {
    const filters = req.query || {};
    const classes = await classService.getClasses(filters);
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
