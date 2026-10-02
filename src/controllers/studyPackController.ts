import { Request, Response } from 'express';
import { StudyPack } from '../models/StudyPack';
import { Recording } from '../models/Recording';
import mongoose from 'mongoose';

export const getStudyPacks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { grade, class_id, subject, search } = req.query;
    const filter: any = {};

    const isStaff = req.user && ['teacher', 'moderator', 'admin'].includes(req.user.role || '');
    if (!isStaff) {
      filter.is_published = true;
    }

    if (grade && typeof grade === 'string' && mongoose.Types.ObjectId.isValid(grade)) {
      filter.grade = grade;
    }
    if (class_id && typeof class_id === 'string' && mongoose.Types.ObjectId.isValid(class_id)) {
      filter.class_id = class_id;
    }
    if (subject && typeof subject === 'string' && mongoose.Types.ObjectId.isValid(subject)) {
      filter.subject = subject;
    }
    if (search && typeof search === 'string') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const packs = await StudyPack.find(filter)
      .populate('grade', 'name')
      .populate('class_id', 'title class_code')
      .populate('subject', 'name')
      .sort({ created_at: -1 })
      .lean();

    res.json({ success: true, data: packs });
  } catch (error: any) {
    console.error('Error fetching study packs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch study packs' });
  }
};

export const getStudyPackById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      res.status(400).json({ success: false, message: 'Invalid study pack ID' });
      return;
    }

    const pack = await StudyPack.findById(id)
      .populate('grade', 'name')
      .populate('class_id', 'title class_code monthly_fee')
      .populate('subject', 'name')
      .populate('recordings', '_id title video_url driveUrl provider session_date batch_name is_expired')
      .populate('created_by', 'firstName lastName email')
      .lean();

    if (!pack) {
      res.status(404).json({ success: false, message: 'Study pack not found' });
      return;
    }

    res.json({ success: true, data: pack });
  } catch (error: any) {
    console.error('Error fetching study pack details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch study pack details' });
  }
};

export const createStudyPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      grade,
      class_id,
      subject,
      price,
      thumbnail_url,
      recordings,
      custom_videos,
      materials,
      is_published,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ success: false, message: 'Title is required' });
      return;
    }

    const pack = new StudyPack({
      title: title.trim(),
      description: description || '',
      grade: grade && mongoose.Types.ObjectId.isValid(grade) ? grade : undefined,
      class_id: class_id && mongoose.Types.ObjectId.isValid(class_id) ? class_id : undefined,
      subject: subject && mongoose.Types.ObjectId.isValid(subject) ? subject : undefined,
      price: typeof price === 'number' ? Math.max(0, price) : 0,
      thumbnail_url: thumbnail_url || '',
      recordings: Array.isArray(recordings) ? recordings.filter((r) => mongoose.Types.ObjectId.isValid(r)) : [],
      custom_videos: Array.isArray(custom_videos) ? custom_videos : [],
      materials: Array.isArray(materials) ? materials : [],
      is_published: is_published !== false,
      created_by: req.user?._id || req.user?.userId,
    });

    await pack.save();
    res.status(201).json({ success: true, data: pack });
  } catch (error: any) {
    console.error('Error creating study pack:', error);
    res.status(500).json({ success: false, message: 'Failed to create study pack' });
  }
};

export const updateStudyPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      res.status(400).json({ success: false, message: 'Invalid study pack ID' });
      return;
    }

    const pack = await StudyPack.findById(id);
    if (!pack) {
      res.status(404).json({ success: false, message: 'Study pack not found' });
      return;
    }

    const {
      title,
      description,
      grade,
      class_id,
      subject,
      price,
      thumbnail_url,
      recordings,
      custom_videos,
      materials,
      is_published,
    } = req.body;

    if (title !== undefined) pack.title = title.trim();
    if (description !== undefined) pack.description = description;
    if (grade !== undefined) pack.grade = grade && mongoose.Types.ObjectId.isValid(grade) ? grade : undefined;
    if (class_id !== undefined) pack.class_id = class_id && mongoose.Types.ObjectId.isValid(class_id) ? class_id : undefined;
    if (subject !== undefined) pack.subject = subject && mongoose.Types.ObjectId.isValid(subject) ? subject : undefined;
    if (price !== undefined) pack.price = Math.max(0, Number(price) || 0);
    if (thumbnail_url !== undefined) pack.thumbnail_url = thumbnail_url;
    if (recordings !== undefined) {
      pack.recordings = Array.isArray(recordings) ? recordings.filter((r) => mongoose.Types.ObjectId.isValid(r)) : [];
    }
    if (custom_videos !== undefined) pack.custom_videos = Array.isArray(custom_videos) ? custom_videos : [];
    if (materials !== undefined) pack.materials = Array.isArray(materials) ? materials : [];
    if (is_published !== undefined) pack.is_published = !!is_published;

    await pack.save();
    res.json({ success: true, data: pack });
  } catch (error: any) {
    console.error('Error updating study pack:', error);
    res.status(500).json({ success: false, message: 'Failed to update study pack' });
  }
};

export const deleteStudyPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      res.status(400).json({ success: false, message: 'Invalid study pack ID' });
      return;
    }

    const result = await StudyPack.findByIdAndDelete(id);
    if (!result) {
      res.status(404).json({ success: false, message: 'Study pack not found' });
      return;
    }

    res.json({ success: true, message: 'Study pack deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting study pack:', error);
    res.status(500).json({ success: false, message: 'Failed to delete study pack' });
  }
};

export const getClassRecordingsForStudyPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(classId as string)) {
      res.status(400).json({ success: false, message: 'Invalid class ID' });
      return;
    }

    const recordings = await Recording.find({
      class_id: classId,
      is_expired: { $ne: true },
    })
      .select('_id title video_url driveUrl provider session_date batch_name created_at')
      .sort({ session_date: -1, created_at: -1 })
      .lean();

    res.json({ success: true, data: recordings });
  } catch (error: any) {
    console.error('Error fetching class recordings for study pack:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch class recordings' });
  }
};
