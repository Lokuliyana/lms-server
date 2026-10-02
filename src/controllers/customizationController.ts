import { Request, Response } from 'express';
import { Subject } from '../models/Subject';
import { Grade } from '../models/Grade';
import { SiteSettings } from '../models/SiteSettings';
import path from 'path';

// --- Public Taxonomy Controller ---

export const getPublicTaxonomy = async (req: Request, res: Response) => {
  try {
    const [subjects, grades] = await Promise.all([
      Subject.find({ is_active: { $ne: false } }).sort({ name: 1 }),
      Grade.find({ is_active: { $ne: false } }).sort({ name: 1 }),
    ]);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.json({ subjects, grades });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching taxonomy', error });
  }
};

// --- Subject Controllers ---

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects', error });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, code, is_active } = req.body;
    const newSubject = new Subject({ name, code, is_active });
    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (error: any) {
    res.status(400).json({ message: 'Error creating subject', error: error.message });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, is_active } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (is_active !== undefined) updateData.is_active = is_active;
    const subject = await Subject.findByIdAndUpdate(id, updateData, { new: true });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    res.status(400).json({ message: 'Error updating subject', error });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting subject', error });
  }
};

// --- Grade Controllers ---

export const getGrades = async (req: Request, res: Response) => {
  try {
    const grades = await Grade.find().sort({ level: 1, name: 1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching grades', error });
  }
};

export const createGrade = async (req: Request, res: Response) => {
  try {
    const { name, level, is_active } = req.body;
    const newGrade = new Grade({ name, level, is_active });
    await newGrade.save();
    res.status(201).json(newGrade);
  } catch (error: any) {
    res.status(400).json({ message: 'Error creating grade', error: error.message });
  }
};

export const updateGrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, level, is_active } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (level !== undefined) updateData.level = level;
    if (is_active !== undefined) updateData.is_active = is_active;
    const grade = await Grade.findByIdAndUpdate(id, updateData, { new: true });
    if (!grade) return res.status(404).json({ message: 'Grade not found' });
    res.json(grade);
  } catch (error) {
    res.status(400).json({ message: 'Error updating grade', error });
  }
};

export const deleteGrade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const grade = await Grade.findByIdAndDelete(id);
    if (!grade) return res.status(404).json({ message: 'Grade not found' });
    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting grade', error });
  }
};

// --- SiteSettings Controllers ---

export const getSiteSettings = async (req: Request, res: Response) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      // Return empty or default if not found
      return res.json({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching site settings', error });
  }
};

export const updateSiteSettings = async (req: Request, res: Response) => {
  try {
    const { site, pages } = req.body;
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings({ site, pages });
    } else {
      settings.site = site;
      settings.pages = pages;
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: 'Error updating site settings', error });
  }
};

// --- Image Upload Controller ---
import { uploadMedia } from '../services/mediaService';
import fs from 'fs';

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pathKey = `customization/${Date.now()}-${safeName}`;

    try {
      const uploadRes = await uploadMedia({
        fileBuffer: req.file.buffer,
        path: pathKey,
        ownerType: 'system',
        contentType: req.file.mimetype,
      });
      return res.json({ url: uploadRes.publicUrl, publicUrl: uploadRes.publicUrl });
    } catch (storageErr) {
      console.warn('Cloud storage failed in customization upload, falling back to local file:', storageErr);
      const uploadDir = path.join(__dirname, '../../public/uploads/customization');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFileName = `${Date.now()}-${safeName}`;
      const localFilePath = path.join(uploadDir, localFileName);
      fs.writeFileSync(localFilePath, req.file.buffer);
      const localUrl = `/uploads/customization/${localFileName}`;
      return res.json({ url: localUrl, publicUrl: localUrl });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Error uploading file', error: error.message });
  }
};
