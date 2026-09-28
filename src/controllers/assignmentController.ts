import { Request, Response } from 'express';
import { ClassEntitlement } from '../models/ClassEntitlement';
import { hasActiveEntitlement } from '../services/entitlementService';
import { Class } from '../models/Class';
import { User } from '../models/User';

export const upsertSubmission = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user._id;

    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const classId = req.body.classId; // or fetch from assignment
    
    if (classId) {
      const cls = await Class.findById(classId);
      if (!cls || !cls.enrolled_students.some(id => id.toString() === userId.toString())) {
        return res.status(403).json({ success: false, message: 'Not enrolled in this class' });
      }

      const hasEntitlement = await hasActiveEntitlement(userId, classId, currentMonth);

      if (!hasEntitlement) {
        return res.status(403).json({ success: false, message: 'No active monthly payment (Entitlement missing)' });
      }
    }

    res.json({ success: true, message: 'Assignment submitted with entitlement check' });
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
