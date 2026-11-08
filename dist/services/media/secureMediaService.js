"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeStudyPackResponse = exports.checkStudyPackEntitlement = exports.generateWatermarkMetadata = exports.verifyMediaTicket = exports.generateMediaTicket = exports.normalizeIp = exports.MIN_MEDIA_TTL_SECONDS = exports.MAX_MEDIA_TTL_SECONDS = exports.DEFAULT_MEDIA_TTL_SECONDS = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const StudyPack_1 = require("../../models/StudyPack");
const StudyPackOrder_1 = require("../../models/StudyPackOrder");
const ClassEnrollment_1 = require("../../models/ClassEnrollment");
const entitlementService_1 = require("../entitlementService");
const MEDIA_SIGNING_SECRET = process.env.MEDIA_SIGNING_SECRET ||
    process.env.JWT_SECRET ||
    'lms-secure-media-gate-hmac-sha256-secret-key-2026';
exports.DEFAULT_MEDIA_TTL_SECONDS = 15 * 60; // 15 minutes
exports.MAX_MEDIA_TTL_SECONDS = 2 * 60 * 60; // 2 hours
exports.MIN_MEDIA_TTL_SECONDS = 60; // 1 minute
/**
 * Normalizes IP addresses (e.g., IPv6 mapped IPv4, multi-hop X-Forwarded-For, or localhost).
 */
const normalizeIp = (ip) => {
    if (!ip)
        return '127.0.0.1';
    const raw = Array.isArray(ip) ? (ip[0] || '127.0.0.1') : ip;
    // If multi-proxy chain (e.g. "client, proxy1, proxy2"), take the first client IP
    let clean = raw.split(',')[0].trim();
    if (clean.startsWith('::ffff:')) {
        clean = clean.substring(7);
    }
    if (clean === '::1' || clean === '::' || clean === '0:0:0:0:0:0:0:1') {
        clean = '127.0.0.1';
    }
    return clean || '127.0.0.1';
};
exports.normalizeIp = normalizeIp;
/**
 * Generates an HMAC SHA-256 signed media ticket token.
 * Valid TTL: 15 minutes by default, configurable up to 2 hours.
 */
const generateMediaTicket = ({ userId, resourceType, resourceId, clientIp, ttlSeconds = exports.DEFAULT_MEDIA_TTL_SECONDS, }) => {
    const boundedTtl = Math.max(exports.MIN_MEDIA_TTL_SECONDS, Math.min(ttlSeconds, exports.MAX_MEDIA_TTL_SECONDS));
    const issuedAt = Date.now();
    const expiresAt = issuedAt + boundedTtl * 1000;
    const normalizedClientIp = (0, exports.normalizeIp)(clientIp);
    const payload = {
        userId: userId.toString(),
        resourceType,
        resourceId: resourceId.toString(),
        expiresAt,
        clientIp: normalizedClientIp,
        issuedAt,
    };
    const payloadBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
    const encodedPayload = payloadBuffer.toString('base64url');
    const signature = crypto_1.default
        .createHmac('sha256', MEDIA_SIGNING_SECRET)
        .update(encodedPayload)
        .digest('base64url');
    const ticket = `${encodedPayload}.${signature}`;
    return {
        ticket,
        expiresAt,
        ttlSeconds: boundedTtl,
    };
};
exports.generateMediaTicket = generateMediaTicket;
/**
 * Validates HMAC SHA-256 signed media ticket integrity, expiry, and optional client IP binding.
 */
const verifyMediaTicket = (ticket, options) => {
    if (!ticket || typeof ticket !== 'string') {
        return { valid: false, error: 'Missing or invalid token format' };
    }
    const parts = ticket.split('.');
    if (parts.length !== 2) {
        return { valid: false, error: 'Malformed media ticket token structure' };
    }
    const [encodedPayload, signature] = parts;
    // Recompute HMAC to verify integrity
    const expectedSignature = crypto_1.default
        .createHmac('sha256', MEDIA_SIGNING_SECRET)
        .update(encodedPayload)
        .digest('base64url');
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto_1.default.timingSafeEqual(sigBuf, expBuf)) {
        return { valid: false, error: 'Token signature invalid or tampered' };
    }
    let payload;
    try {
        const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8');
        payload = JSON.parse(raw);
    }
    catch {
        return { valid: false, error: 'Failed to decode ticket payload' };
    }
    if (!payload.expiresAt || !payload.userId || !payload.resourceId) {
        return { valid: false, error: 'Missing required claims in ticket payload' };
    }
    // Reject tickets claiming to be issued far into the future (clock skew protection)
    if (payload.issuedAt && payload.issuedAt > Date.now() + 60000) {
        return { valid: false, error: 'Media ticket issued in the future' };
    }
    if (Date.now() > payload.expiresAt) {
        return { valid: false, error: 'Media ticket has expired' };
    }
    if (options?.expectedClientIp) {
        const normExpected = (0, exports.normalizeIp)(options.expectedClientIp);
        const normTicketIp = (0, exports.normalizeIp)(payload.clientIp);
        if (normExpected !== normTicketIp) {
            return { valid: false, error: 'Client IP mismatch' };
        }
    }
    if (options?.expectedResourceType && payload.resourceType !== options.expectedResourceType) {
        return { valid: false, error: 'Resource type mismatch' };
    }
    if (options?.expectedResourceId && payload.resourceId !== options.expectedResourceId) {
        return { valid: false, error: 'Resource ID mismatch' };
    }
    return { valid: true, payload };
};
exports.verifyMediaTicket = verifyMediaTicket;
/**
 * Builds watermarking metadata for client video / document view overlay.
 */
const generateWatermarkMetadata = ({ studentId, email, clientIp, timestamp = Date.now(), }) => {
    const normIp = (0, exports.normalizeIp)(clientIp);
    const safeEmail = email || 'student@lms.local';
    const safeId = studentId || 'STUDENT';
    const dateStr = new Date(timestamp).toISOString();
    return {
        studentId: safeId,
        email: safeEmail,
        clientIp: normIp,
        timestamp,
        displayText: `${safeEmail} • ${safeId} • ${normIp} • ${dateStr}`,
    };
};
exports.generateWatermarkMetadata = generateWatermarkMetadata;
/**
 * Checks whether a student/user has entitlement to access study pack media.
 */
const checkStudyPackEntitlement = async (userId, userRole, studyPackId, userPermissions, existingPackDoc) => {
    // Staff always has full access
    if ((userRole && ['teacher', 'moderator', 'admin'].includes(userRole)) ||
        (userPermissions && (userPermissions.includes('study_packs.manage') ||
            userPermissions.includes('admin')))) {
        return true;
    }
    if (!userId || !mongoose_1.default.Types.ObjectId.isValid(userId)) {
        return false;
    }
    if (!studyPackId || !mongoose_1.default.Types.ObjectId.isValid(studyPackId)) {
        return false;
    }
    let pack = existingPackDoc;
    if (!pack) {
        const packQuery = StudyPack_1.StudyPack.findById(studyPackId);
        pack = packQuery && typeof packQuery.lean === 'function' ? await packQuery.lean() : await packQuery;
    }
    if (!pack) {
        return false;
    }
    // Free packs are unlocked for all authenticated students
    if (Number(pack.price) === 0) {
        return true;
    }
    // Creator has access (handles populated or unpopulated created_by)
    if (pack.created_by) {
        const creatorId = (pack.created_by._id || pack.created_by).toString();
        if (creatorId === userId.toString()) {
            return true;
        }
    }
    // Check direct StudyPack purchase order (active and not cancelled)
    const userObjId = new mongoose_1.default.Types.ObjectId(userId);
    const packObjId = new mongoose_1.default.Types.ObjectId(studyPackId);
    const orderQuery = StudyPackOrder_1.StudyPackOrder.findOne({
        $or: [{ student_id: userObjId }, { user_id: userObjId }],
        study_pack_id: packObjId,
        digital_access_granted: true,
        status: { $ne: 'cancelled' },
        payment_status: { $in: ['paid', 'free'] },
    });
    const directOrder = orderQuery && typeof orderQuery.lean === 'function'
        ? await orderQuery.lean()
        : await orderQuery;
    if (directOrder) {
        return true;
    }
    // If associated with a class, check class enrollment or entitlement
    if (pack.class_id) {
        const classIdStr = (pack.class_id._id || pack.class_id).toString();
        if (mongoose_1.default.Types.ObjectId.isValid(classIdStr)) {
            const classObjId = new mongoose_1.default.Types.ObjectId(classIdStr);
            const enrollQuery = ClassEnrollment_1.ClassEnrollment.findOne({
                userId: userObjId,
                classId: classObjId,
                status: 'active',
            });
            const enrollment = enrollQuery && typeof enrollQuery.lean === 'function'
                ? await enrollQuery.lean()
                : await enrollQuery;
            if (enrollment) {
                return true;
            }
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const activeClassEntitlement = await (0, entitlementService_1.hasActiveEntitlement)(userId, classIdStr, currentMonthKey);
            if (activeClassEntitlement) {
                return true;
            }
        }
    }
    return false;
};
exports.checkStudyPackEntitlement = checkStudyPackEntitlement;
/**
 * Sanitizes a study pack document so unauthenticated or non-enrolled users
 * do not receive raw streaming video or PDF URLs.
 */
const sanitizeStudyPackResponse = (pack, hasAccess) => {
    if (!pack)
        return pack;
    const cloned = JSON.parse(JSON.stringify(pack));
    cloned.has_access = !!hasAccess;
    cloned.is_enrolled = !!hasAccess;
    cloned.media_locked = !hasAccess;
    if (hasAccess) {
        return cloned;
    }
    // Redact streaming recordings
    if (Array.isArray(cloned.recordings)) {
        cloned.recordings = cloned.recordings.map((rec) => {
            if (!rec || typeof rec !== 'object')
                return rec;
            return {
                ...rec,
                video_url: null,
                driveUrl: null,
                stream_url: null,
                embed_url: null,
                is_locked: true,
            };
        });
    }
    // Redact custom videos
    if (Array.isArray(cloned.custom_videos)) {
        cloned.custom_videos = cloned.custom_videos.map((vid) => {
            if (!vid || typeof vid !== 'object')
                return vid;
            return {
                ...vid,
                url: null,
                video_url: null,
                is_locked: true,
            };
        });
    }
    // Redact study materials (PDFs etc.)
    if (Array.isArray(cloned.materials)) {
        cloned.materials = cloned.materials.map((mat) => {
            if (!mat || typeof mat !== 'object')
                return mat;
            return {
                ...mat,
                file_url: null,
                url: null,
                download_url: null,
                is_locked: true,
            };
        });
    }
    return cloned;
};
exports.sanitizeStudyPackResponse = sanitizeStudyPackResponse;
