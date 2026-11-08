import { Request, Response } from 'express';
import { StudyPack } from '../models/StudyPack';
import { Recording } from '../models/Recording';
import mongoose from 'mongoose';
import {
  checkStudyPackEntitlement,
  generateMediaTicket,
  generateWatermarkMetadata,
  sanitizeStudyPackResponse,
} from '../services/media/secureMediaService';
import { fulfillStudyPackOrder } from '../services/studyPackOrderService';

/**
 * Catalog search for study packs.
 * Optimized with MongoDB $text search index and graceful fallback to regex.
 * Sorted using compound index { is_published: 1, created_at: -1 }.
 */
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

    let packs: any[];

    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      // 1. Primary: Use MongoDB text index created in Phase 1
      try {
        packs = await StudyPack.find({
          ...filter,
          $text: { $search: searchTerm },
        })
          .populate('grade', 'name')
          .populate('class_id', 'title class_code')
          .populate('subject', 'name')
          .sort({ is_published: 1, created_at: -1 })
          .lean();
      } catch (textErr) {
        // 2. Graceful fallback to regex search if text index is not yet built or throws
        console.warn('Text search index fallback triggered:', textErr);
        // Escape special regex characters to avoid regex syntax errors
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        packs = await StudyPack.find({
          ...filter,
          $or: [
            { title: { $regex: escapedTerm, $options: 'i' } },
            { description: { $regex: escapedTerm, $options: 'i' } },
          ],
        })
          .populate('grade', 'name')
          .populate('class_id', 'title class_code')
          .populate('subject', 'name')
          .sort({ is_published: 1, created_at: -1 })
          .lean();
      }
    } else {
      // Unfiltered or attribute-filtered search using compound index
      packs = await StudyPack.find(filter)
        .populate('grade', 'name')
        .populate('class_id', 'title class_code')
        .populate('subject', 'name')
        .sort({ is_published: 1, created_at: -1 })
        .lean();
    }

    res.json({ success: true, count: packs.length, data: packs });
  } catch (error: any) {
    console.error('Error fetching study packs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch study packs' });
  }
};

/**
 * Alias for getStudyPacks for plan consistency.
 */
export const getAllStudyPacks = getStudyPacks;

/**
 * Fetch study pack details with media sanitization.
 * Enrolled students or staff receive full media access.
 * Unauthenticated or non-enrolled users have raw video and PDF URLs redacted.
 */
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

    const userId = req.user?._id || req.user?.userId;
    const isStaff = !!(
      req.user && (
        ['teacher', 'moderator', 'admin'].includes(req.user.role || '') ||
        req.user.permissions?.includes('study_packs.manage') ||
        req.user.permissions?.includes('admin')
      )
    );

    let hasAccess = false;
    if (isStaff) {
      hasAccess = true;
    } else if (userId) {
      // Authenticated student: check entitlement (free pack, purchase order, creator, class enrollment)
      hasAccess = await checkStudyPackEntitlement(
        userId.toString(),
        req.user?.role,
        id as string,
        req.user?.permissions,
        pack
      );
    }
    // Unauthenticated visitors strictly have hasAccess = false (prevents URL leakage)

    // Sanitize response to prevent raw video/PDF URL leakage to non-entitled viewers
    const sanitizedPack = sanitizeStudyPackResponse(pack, hasAccess);

    res.json({ success: true, data: sanitizedPack });
  } catch (error: any) {
    console.error('Error fetching study pack details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch study pack details' });
  }
};

/**
 * Secure media ticket issuance endpoint.
 * Validates entitlement and returns an HMAC SHA-256 signed ticket with watermark metadata.
 */
export const getStudyPackMediaTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      res.status(400).json({ success: false, message: 'Invalid study pack ID' });
      return;
    }

    // 1. Check pack existence FIRST to ensure 404 is returned if non-existent
    const pack = await StudyPack.findById(id)
      .populate('recordings', '_id title video_url driveUrl provider session_date batch_name is_expired')
      .lean();

    if (!pack) {
      res.status(404).json({ success: false, message: 'Study pack not found' });
      return;
    }

    // 2. Validate entitlement
    const hasAccess = await checkStudyPackEntitlement(
      userId.toString(),
      req.user?.role,
      id as string,
      req.user?.permissions,
      pack
    );

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You must be enrolled or have purchased this study pack to stream media.',
      });
      return;
    }

    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const clientIp = typeof rawIp === 'string' ? rawIp : (Array.isArray(rawIp) ? rawIp[0] : '127.0.0.1');
    const ttlQuery = req.query.ttl ? parseInt(req.query.ttl as string, 10) : undefined;

    // Issue HMAC SHA-256 signed token
    const ticketData = generateMediaTicket({
      userId: userId.toString(),
      resourceType: 'study_pack',
      resourceId: id as string,
      clientIp,
      ttlSeconds: ttlQuery,
    });

    // Generate watermarking metadata (student ID, email, IP, timestamp)
    const watermark = generateWatermarkMetadata({
      studentId: userId.toString(),
      email: req.user?.email || '',
      clientIp,
      timestamp: Date.now(),
    });

    // Filter out expired recordings
    const activeRecordings = Array.isArray(pack.recordings)
      ? pack.recordings.filter((r: any) => !r.is_expired)
      : [];

    res.json({
      success: true,
      data: {
        ticket: ticketData.ticket,
        expires_at: ticketData.expiresAt,
        ttl_seconds: ticketData.ttlSeconds,
        watermark,
        study_pack_id: id,
        media: {
          recordings: activeRecordings,
          custom_videos: pack.custom_videos || [],
          materials: pack.materials || [],
        },
      },
    });
  } catch (error: any) {
    console.error('Error issuing media ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to issue media ticket' });
  }
};

/**
 * Controller to verify a media ticket's integrity and validity.
 */
export const verifyStudyPackMediaTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = (req.body?.ticket || req.query?.ticket || req.headers['x-media-ticket']) as string;
    if (!ticket) {
      res.status(400).json({ success: false, message: 'Media ticket is required' });
      return;
    }

    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const clientIp = typeof rawIp === 'string' ? rawIp : (Array.isArray(rawIp) ? rawIp[0] : '127.0.0.1');
    const studyPackId = req.params.id || req.body?.study_pack_id;

    const result = (await import('../services/media/secureMediaService')).verifyMediaTicket(ticket, {
      expectedClientIp: clientIp,
      expectedResourceId: studyPackId ? studyPackId.toString() : undefined,
    });

    if (!result.valid) {
      res.status(403).json({ success: false, message: result.error || 'Invalid or expired media ticket' });
      return;
    }

    res.json({ success: true, valid: true, payload: result.payload });
  } catch (error: any) {
    console.error('Error verifying media ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to verify media ticket' });
  }
};

/**
 * Unified hybrid fulfillment purchase controller.
 * Unlocks digital access instantly and dispatches physical DeliveryOrder when notes requested.
 */
export const purchaseStudyPack = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const studyPackId = req.params.id || req.body.study_pack_id || req.body.studyPackId;
    if (!studyPackId) {
      res.status(400).json({ success: false, message: 'Study pack ID is required' });
      return;
    }

    const {
      include_physical_delivery,
      includePhysicalDelivery,
      shipping_address,
      shippingAddress,
      recipient_phone,
      recipientPhone,
      recipient_name,
      recipientName,
      payment_method,
      paymentMethod,
      payment_proof,
      paymentProof,
      payment_slip_name,
      paymentSlipName,
      notes,
    } = req.body;

    const result = await fulfillStudyPackOrder({
      userId: userId.toString(),
      studyPackId: studyPackId.toString(),
      includePhysicalDelivery: !!(include_physical_delivery ?? includePhysicalDelivery),
      shippingAddress: shipping_address ?? shippingAddress,
      recipientPhone: recipient_phone ?? recipientPhone,
      recipientName: recipient_name ?? recipientName,
      paymentMethod: payment_method ?? paymentMethod ?? 'mock',
      paymentProof: payment_proof ?? paymentProof,
      paymentSlipName: payment_slip_name ?? paymentSlipName,
      notes: notes,
      userEmail: req.user?.email,
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        order: result.order,
        delivery: result.delivery,
        digital_access_unlocked: result.digitalAccessUnlocked,
        already_owned: result.alreadyOwned,
        study_pack: result.studyPack,
      },
    });
  } catch (error: any) {
    console.error('Error purchasing study pack:', error);
    const statusCode = error.message === 'Study pack not found' ? 404 : 400;
    res.status(statusCode).json({ success: false, message: error.message || 'Failed to complete study pack purchase' });
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
