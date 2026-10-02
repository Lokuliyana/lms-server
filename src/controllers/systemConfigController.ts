import { Request, Response } from 'express';
import { TenantSettings } from '../models/TenantSettings';
import { uploadMedia } from '../services/mediaService';
import fs from 'fs';
import path from 'path';

// In-memory cache for TenantSettings
let cachedConfig: any = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const invalidateConfigCache = () => {
  cachedConfig = null;
  cacheExpiry = 0;
};

export const getSystemConfig = async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cachedConfig && now < cacheExpiry) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.json({ success: true, data: cachedConfig });
    }

    let config = await TenantSettings.findOne().lean();
    if (!config) {
      const created = await TenantSettings.create({});
      config = created.toObject();
    }

    cachedConfig = config;
    cacheExpiry = now + CACHE_TTL_MS;

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return res.json({ success: true, data: config });
  } catch (error: any) {
    console.error('Error fetching system config:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateSystemConfig = async (req: Request, res: Response) => {
  try {
    let settings = await TenantSettings.findOne();
    if (!settings) {
      settings = await TenantSettings.create({});
    }

    const body = req.body || {};
    
    // Parse JSON strings if sent as multipart form-data
    const parseNested = (val: any) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val;
    };

    if (body.platformName !== undefined) settings.platformName = body.platformName;
    if (body.instructorName !== undefined) settings.instructorName = body.instructorName;
    if (body.slogan !== undefined) settings.slogan = body.slogan;
    if (body.contactPhone !== undefined) settings.contactPhone = body.contactPhone;
    if (body.contactEmail !== undefined) settings.contactEmail = body.contactEmail;
    if (body.supportWhatsApp !== undefined) settings.supportWhatsApp = body.supportWhatsApp;

    if (body.assets) {
      const parsedAssets = parseNested(body.assets);
      settings.assets = { ...settings.assets, ...parsedAssets };
    }

    if (body.themeTokens) {
      const parsedTokens = parseNested(body.themeTokens);
      settings.themeTokens = { ...settings.themeTokens, ...parsedTokens };
    }

    // Handle uploaded asset files if present
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      const assetKeys: Array<keyof typeof settings.assets> = [
        'logoUrl',
        'faviconUrl',
        'heroBannerUrl',
        'loginIllustrationUrl',
        'defaultAvatarUrl'
      ];

      for (const key of assetKeys) {
        const fileArr = files[key] || files[key.replace('Url', '')];
        if (fileArr && fileArr.length > 0) {
          const file = fileArr[0];
          try {
            // Upload to cloud storage (Supabase)
            const filePath = `branding/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const uploadRes = await uploadMedia({
              fileBuffer: file.buffer,
              path: filePath,
              ownerType: 'system',
              contentType: file.mimetype
            });
            settings.assets[key] = uploadRes.publicUrl;
          } catch (storageErr) {
            console.warn('Cloud storage failed, falling back to local static serving:', storageErr);
            const uploadDir = path.join(__dirname, '../../public/uploads/branding');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const localFileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const localFilePath = path.join(uploadDir, localFileName);
            fs.writeFileSync(localFilePath, file.buffer);
            settings.assets[key] = `/uploads/branding/${localFileName}`;
          }
        }
      }
    }

    await settings.save();
    invalidateConfigCache();

    return res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Error updating system config:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
