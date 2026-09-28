import { Request, Response } from 'express';
import * as classApplicationService from '../services/classApplicationService';

export const applyForClass = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const userId = req.user._id.toString();

    const application = await classApplicationService.applyForClass(data, userId);
    res.status(201).json({ success: true, data: application });
  } catch (error: any) {
    console.error('Error applying for class:', error);
    // Return standard error msg instead of raw error.message (Fix 2.6)
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const handleApplication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const approverUserId = req.user._id.toString();

    const result = await classApplicationService.handleApplication(id as string, status, approverUserId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error handling application:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getApplications = async (req: Request, res: Response) => {
  try {
    const filters = req.query;
    const requesterId = req.user._id.toString();

    const result = await classApplicationService.getApplications(filters, requesterId, req.query);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
