"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/tests/testStudyPackPhase4.ts
const assert_1 = __importDefault(require("assert"));
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const secureMediaService_1 = require("../services/media/secureMediaService");
const studyPackOrderService_1 = require("../services/studyPackOrderService");
const StudyPack_1 = require("../models/StudyPack");
const StudyPackOrder_1 = require("../models/StudyPackOrder");
const DeliveryOrder_1 = require("../models/DeliveryOrder");
const Transaction_1 = require("../models/Transaction");
let totalTests = 0;
let passedTests = 0;
function test(name, fn) {
    totalTests++;
    try {
        const result = fn();
        if (result && typeof result.then === 'function') {
            return result
                .then(() => {
                passedTests++;
                console.log(`  ✓ ${name}`);
            })
                .catch((err) => {
                console.error(`  ✗ ${name}`);
                console.error(`    Error: ${err.message}`);
                throw err;
            });
        }
        passedTests++;
        console.log(`  ✓ ${name}`);
    }
    catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    Error: ${err.message}`);
        throw err;
    }
}
async function runSuite() {
    console.log('\n======================================================');
    console.log('RUNNING PHASE 4: STUDY PACK MEDIA SECURITY & HYBRID SUITE');
    console.log('======================================================\n');
    // -----------------------------------------------------------
    // 1. Media Ticket Issuance & HMAC SHA-256 Signature
    // -----------------------------------------------------------
    console.log('--- 1. HMAC SHA-256 Media Ticket Issuance ---');
    test('generateMediaTicket: generates valid dot-separated token with default 15m TTL', () => {
        const userId = new mongoose_1.default.Types.ObjectId().toString();
        const resourceId = new mongoose_1.default.Types.ObjectId().toString();
        const clientIp = '192.168.1.100';
        const result = (0, secureMediaService_1.generateMediaTicket)({
            userId,
            resourceType: 'study_pack',
            resourceId,
            clientIp,
        });
        (0, assert_1.default)(result.ticket && typeof result.ticket === 'string');
        const parts = result.ticket.split('.');
        assert_1.default.strictEqual(parts.length, 2, 'Token must have exactly 2 parts (payload and signature)');
        assert_1.default.strictEqual(result.ttlSeconds, secureMediaService_1.DEFAULT_MEDIA_TTL_SECONDS);
        (0, assert_1.default)(result.expiresAt > Date.now());
        // Decode and verify payload claims
        const decoded = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        assert_1.default.strictEqual(decoded.userId, userId);
        assert_1.default.strictEqual(decoded.resourceType, 'study_pack');
        assert_1.default.strictEqual(decoded.resourceId, resourceId);
        assert_1.default.strictEqual(decoded.clientIp, '192.168.1.100');
        (0, assert_1.default)(decoded.expiresAt > Date.now());
    });
    test('generateMediaTicket: respects custom TTL clamped to 2-hour maximum and 60s minimum', () => {
        const userId = new mongoose_1.default.Types.ObjectId().toString();
        const resourceId = new mongoose_1.default.Types.ObjectId().toString();
        // Test clamped to max 2 hours (7200s)
        const resultMax = (0, secureMediaService_1.generateMediaTicket)({
            userId,
            resourceType: 'study_pack',
            resourceId,
            clientIp: '127.0.0.1',
            ttlSeconds: 999999,
        });
        assert_1.default.strictEqual(resultMax.ttlSeconds, secureMediaService_1.MAX_MEDIA_TTL_SECONDS);
        // Test clamped to min 60s
        const resultMin = (0, secureMediaService_1.generateMediaTicket)({
            userId,
            resourceType: 'study_pack',
            resourceId,
            clientIp: '127.0.0.1',
            ttlSeconds: 5,
        });
        assert_1.default.strictEqual(resultMin.ttlSeconds, secureMediaService_1.MIN_MEDIA_TTL_SECONDS);
        // Test valid within range (3600s = 1 hour)
        const result1h = (0, secureMediaService_1.generateMediaTicket)({
            userId,
            resourceType: 'study_pack',
            resourceId,
            clientIp: '127.0.0.1',
            ttlSeconds: 3600,
        });
        assert_1.default.strictEqual(result1h.ttlSeconds, 3600);
    });
    // -----------------------------------------------------------
    // 2. Media Ticket Verification & Tamper Resistance
    // -----------------------------------------------------------
    console.log('\n--- 2. Media Ticket Verification & Tamper Resistance ---');
    test('verifyMediaTicket: untampered ticket passes verification', () => {
        const userId = new mongoose_1.default.Types.ObjectId().toString();
        const resourceId = new mongoose_1.default.Types.ObjectId().toString();
        const clientIp = '203.0.113.195';
        const { ticket } = (0, secureMediaService_1.generateMediaTicket)({
            userId,
            resourceType: 'recording',
            resourceId,
            clientIp,
        });
        const verification = (0, secureMediaService_1.verifyMediaTicket)(ticket, {
            expectedClientIp: clientIp,
            expectedResourceType: 'recording',
            expectedResourceId: resourceId,
        });
        assert_1.default.strictEqual(verification.valid, true);
        assert_1.default.strictEqual(verification.payload?.userId, userId);
        assert_1.default.strictEqual(verification.payload?.resourceId, resourceId);
        assert_1.default.strictEqual(verification.payload?.resourceType, 'recording');
    });
    test('verifyMediaTicket: tampered payload fails signature check', () => {
        const userId = new mongoose_1.default.Types.ObjectId().toString();
        const resourceId = new mongoose_1.default.Types.ObjectId().toString();
        const { ticket } = (0, secureMediaService_1.generateMediaTicket)({
            userId,
            resourceType: 'study_pack',
            resourceId,
            clientIp: '127.0.0.1',
        });
        const [encodedPayload, signature] = ticket.split('.');
        const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        // Tamper with userId
        decoded.userId = 'attacker_compromised_id';
        const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');
        const tamperedTicket = `${tamperedPayload}.${signature}`;
        const verification = (0, secureMediaService_1.verifyMediaTicket)(tamperedTicket);
        assert_1.default.strictEqual(verification.valid, false);
        assert_1.default.strictEqual(verification.error, 'Token signature invalid or tampered');
    });
    test('verifyMediaTicket: tampered signature fails verification', () => {
        const { ticket } = (0, secureMediaService_1.generateMediaTicket)({
            userId: 'usr123',
            resourceType: 'study_pack',
            resourceId: 'pack123',
            clientIp: '127.0.0.1',
        });
        const [encodedPayload] = ticket.split('.');
        const bogusSignature = crypto_1.default.randomBytes(32).toString('base64url');
        const forgedTicket = `${encodedPayload}.${bogusSignature}`;
        const verification = (0, secureMediaService_1.verifyMediaTicket)(forgedTicket);
        assert_1.default.strictEqual(verification.valid, false);
        assert_1.default.strictEqual(verification.error, 'Token signature invalid or tampered');
    });
    test('verifyMediaTicket: expired ticket is rejected', () => {
        const secret = process.env.MEDIA_SIGNING_SECRET ||
            process.env.JWT_SECRET ||
            'lms-secure-media-gate-hmac-sha256-secret-key-2026';
        const expiredPayload = {
            userId: 'user_expired',
            resourceType: 'study_pack',
            resourceId: 'pack_expired',
            expiresAt: Date.now() - 5000, // Expired 5 seconds ago
            clientIp: '127.0.0.1',
            issuedAt: Date.now() - 60000,
        };
        const encoded = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
        const sig = crypto_1.default.createHmac('sha256', secret).update(encoded).digest('base64url');
        const expiredTicket = `${encoded}.${sig}`;
        const verification = (0, secureMediaService_1.verifyMediaTicket)(expiredTicket);
        assert_1.default.strictEqual(verification.valid, false);
        assert_1.default.strictEqual(verification.error, 'Media ticket has expired');
    });
    test('verifyMediaTicket: rejects mismatched client IP and resource IDs', () => {
        const { ticket } = (0, secureMediaService_1.generateMediaTicket)({
            userId: 'u1',
            resourceType: 'study_pack',
            resourceId: 'pack_correct',
            clientIp: '198.51.100.5',
        });
        // Client IP mismatch
        const resIpMismatch = (0, secureMediaService_1.verifyMediaTicket)(ticket, {
            expectedClientIp: '198.51.100.99',
        });
        assert_1.default.strictEqual(resIpMismatch.valid, false);
        assert_1.default.strictEqual(resIpMismatch.error, 'Client IP mismatch');
        // Resource ID mismatch
        const resIdMismatch = (0, secureMediaService_1.verifyMediaTicket)(ticket, {
            expectedResourceId: 'pack_wrong',
        });
        assert_1.default.strictEqual(resIdMismatch.valid, false);
        assert_1.default.strictEqual(resIdMismatch.error, 'Resource ID mismatch');
    });
    // -----------------------------------------------------------
    // 3. Watermarking Metadata & IP Normalization
    // -----------------------------------------------------------
    console.log('\n--- 3. Watermarking Metadata & IP Normalization ---');
    test('normalizeIp: handles IPv6 mapped IPv4 and loopback addresses', () => {
        assert_1.default.strictEqual((0, secureMediaService_1.normalizeIp)('::ffff:192.168.1.5'), '192.168.1.5');
        assert_1.default.strictEqual((0, secureMediaService_1.normalizeIp)('::1'), '127.0.0.1');
        assert_1.default.strictEqual((0, secureMediaService_1.normalizeIp)('127.0.0.1'), '127.0.0.1');
        assert_1.default.strictEqual((0, secureMediaService_1.normalizeIp)(''), '127.0.0.1');
    });
    test('generateWatermarkMetadata: produces forensic watermark bundle', () => {
        const wm = (0, secureMediaService_1.generateWatermarkMetadata)({
            studentId: 'STU_10029',
            email: 'student@example.com',
            clientIp: '::ffff:203.0.113.195',
            timestamp: 1775440000000,
        });
        assert_1.default.strictEqual(wm.studentId, 'STU_10029');
        assert_1.default.strictEqual(wm.email, 'student@example.com');
        assert_1.default.strictEqual(wm.clientIp, '203.0.113.195');
        (0, assert_1.default)(wm.displayText.includes('student@example.com'));
        (0, assert_1.default)(wm.displayText.includes('STU_10029'));
        (0, assert_1.default)(wm.displayText.includes('203.0.113.195'));
    });
    // -----------------------------------------------------------
    // 4. Public Study Pack Detail Sanitization
    // -----------------------------------------------------------
    console.log('\n--- 4. Public Detail Response Sanitization ---');
    test('sanitizeStudyPackResponse: unauthenticated/non-enrolled visitors have URLs redacted', () => {
        const rawPack = {
            _id: 'pack_123',
            title: 'Advanced Level Physics Revision',
            price: 2500,
            recordings: [
                {
                    _id: 'rec_1',
                    title: 'Session 01 - Mechanics',
                    video_url: 'https://cdn.example.com/stream/secret_hls_stream_01.m3u8',
                    driveUrl: 'https://drive.google.com/file/d/secret_drive_123/view',
                },
            ],
            custom_videos: [
                {
                    title: 'Bonus Derivation Video',
                    url: 'https://vimeo.com/private/987654321',
                },
            ],
            materials: [
                {
                    title: 'Mechanics Tute Notes PDF',
                    file_url: 'https://storage.example.com/protected/mechanics_tute_2026.pdf',
                },
            ],
        };
        const sanitized = (0, secureMediaService_1.sanitizeStudyPackResponse)(rawPack, false);
        assert_1.default.strictEqual(sanitized.has_access, false);
        assert_1.default.strictEqual(sanitized.is_enrolled, false);
        assert_1.default.strictEqual(sanitized.title, 'Advanced Level Physics Revision');
        // Video streaming and PDF URLs MUST BE REDACTED
        assert_1.default.strictEqual(sanitized.recordings[0].video_url, null);
        assert_1.default.strictEqual(sanitized.recordings[0].driveUrl, null);
        assert_1.default.strictEqual(sanitized.recordings[0].is_locked, true);
        assert_1.default.strictEqual(sanitized.custom_videos[0].url, null);
        assert_1.default.strictEqual(sanitized.custom_videos[0].is_locked, true);
        assert_1.default.strictEqual(sanitized.materials[0].file_url, null);
        assert_1.default.strictEqual(sanitized.materials[0].is_locked, true);
    });
    test('sanitizeStudyPackResponse: enrolled students and staff retain full streaming URLs', () => {
        const rawPack = {
            _id: 'pack_123',
            title: 'Advanced Level Physics Revision',
            price: 2500,
            recordings: [
                {
                    _id: 'rec_1',
                    title: 'Session 01 - Mechanics',
                    video_url: 'https://cdn.example.com/stream/secret_hls_stream_01.m3u8',
                    driveUrl: 'https://drive.google.com/file/d/secret_drive_123/view',
                },
            ],
            custom_videos: [
                {
                    title: 'Bonus Derivation Video',
                    url: 'https://vimeo.com/private/987654321',
                },
            ],
            materials: [
                {
                    title: 'Mechanics Tute Notes PDF',
                    file_url: 'https://storage.example.com/protected/mechanics_tute_2026.pdf',
                },
            ],
        };
        const fullAccess = (0, secureMediaService_1.sanitizeStudyPackResponse)(rawPack, true);
        assert_1.default.strictEqual(fullAccess.has_access, true);
        assert_1.default.strictEqual(fullAccess.is_enrolled, true);
        assert_1.default.strictEqual(fullAccess.recordings[0].video_url, 'https://cdn.example.com/stream/secret_hls_stream_01.m3u8');
        assert_1.default.strictEqual(fullAccess.recordings[0].driveUrl, 'https://drive.google.com/file/d/secret_drive_123/view');
        assert_1.default.strictEqual(fullAccess.custom_videos[0].url, 'https://vimeo.com/private/987654321');
        assert_1.default.strictEqual(fullAccess.materials[0].file_url, 'https://storage.example.com/protected/mechanics_tute_2026.pdf');
    });
    // -----------------------------------------------------------
    // 5. Phone Validation & Hybrid Fulfillment Inputs
    // -----------------------------------------------------------
    console.log('\n--- 5. Phone Validation & Hybrid Fulfillment Service ---');
    test('isValidPhoneNumber: accurately tests Sri Lankan & international phone numbers', () => {
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)('0771234567'), true);
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)('+94771234567'), true);
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)('011-2345678'), true);
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)('123'), false); // Too short
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)(''), false);
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)('invalid_chars_abc'), false);
    });
    await test('fulfillStudyPackOrder: physical notes delivery requires valid address and phone', async () => {
        const studentId = new mongoose_1.default.Types.ObjectId().toString();
        const packId = new mongoose_1.default.Types.ObjectId().toString();
        // Mock StudyPack.findById
        const origFindById = StudyPack_1.StudyPack.findById;
        StudyPack_1.StudyPack.findById = async () => ({
            _id: new mongoose_1.default.Types.ObjectId(packId),
            title: 'Chemistry Organic Masterclass',
            price: 3000,
        });
        try {
            // 1. Missing address must fail
            await assert_1.default.rejects(async () => {
                await (0, studyPackOrderService_1.fulfillStudyPackOrder)({
                    userId: studentId,
                    studyPackId: packId,
                    includePhysicalDelivery: true,
                    shippingAddress: '',
                    recipientPhone: '0771234567',
                });
            }, /shipping address is required/);
            // 2. Missing or invalid phone must fail
            await assert_1.default.rejects(async () => {
                await (0, studyPackOrderService_1.fulfillStudyPackOrder)({
                    userId: studentId,
                    studyPackId: packId,
                    includePhysicalDelivery: true,
                    shippingAddress: 'No. 45, Temple Road, Colombo 03',
                    recipientPhone: 'abc',
                });
            }, /recipient phone number is required/);
        }
        finally {
            StudyPack_1.StudyPack.findById = origFindById;
        }
    });
    await test('fulfillStudyPackOrder: digital-only purchase unlocks instant digital entitlement', async () => {
        const studentId = new mongoose_1.default.Types.ObjectId().toString();
        const packId = new mongoose_1.default.Types.ObjectId().toString();
        const origFindById = StudyPack_1.StudyPack.findById;
        const origOrderFindOne = StudyPackOrder_1.StudyPackOrder.findOne;
        const origOrderCreate = StudyPackOrder_1.StudyPackOrder.create;
        const origTxnCreate = Transaction_1.Transaction.create;
        try {
            StudyPack_1.StudyPack.findById = async () => ({
                _id: new mongoose_1.default.Types.ObjectId(packId),
                title: 'Combined Maths Pure Revision',
                price: 3500,
            });
            StudyPackOrder_1.StudyPackOrder.findOne = async () => null; // No previous order
            let createdOrderPayload = null;
            StudyPackOrder_1.StudyPackOrder.create = async (data) => {
                createdOrderPayload = data;
                return { ...data, _id: new mongoose_1.default.Types.ObjectId() };
            };
            Transaction_1.Transaction.create = async (data) => ({
                ...data,
                _id: new mongoose_1.default.Types.ObjectId(),
            });
            const result = await (0, studyPackOrderService_1.fulfillStudyPackOrder)({
                userId: studentId,
                studyPackId: packId,
                includePhysicalDelivery: false,
            });
            assert_1.default.strictEqual(result.success, true);
            assert_1.default.strictEqual(result.digitalAccessUnlocked, true);
            assert_1.default.strictEqual(result.delivery, null);
            assert_1.default.strictEqual(createdOrderPayload.digital_access_granted, true);
            assert_1.default.strictEqual(createdOrderPayload.include_physical_delivery, false);
            assert_1.default.strictEqual(createdOrderPayload.payment_status, 'paid');
            assert_1.default.strictEqual(createdOrderPayload.amount_paid, 3500);
        }
        finally {
            StudyPack_1.StudyPack.findById = origFindById;
            StudyPackOrder_1.StudyPackOrder.findOne = origOrderFindOne;
            StudyPackOrder_1.StudyPackOrder.create = origOrderCreate;
            Transaction_1.Transaction.create = origTxnCreate;
        }
    });
    await test('fulfillStudyPackOrder: hybrid purchase creates DeliveryOrder AND unlocks digital access immediately', async () => {
        const studentId = new mongoose_1.default.Types.ObjectId().toString();
        const packId = new mongoose_1.default.Types.ObjectId().toString();
        const origFindById = StudyPack_1.StudyPack.findById;
        const origOrderFindOne = StudyPackOrder_1.StudyPackOrder.findOne;
        const origOrderCreate = StudyPackOrder_1.StudyPackOrder.create;
        const origDeliveryCreate = DeliveryOrder_1.DeliveryOrder.create;
        const origTxnCreate = Transaction_1.Transaction.create;
        try {
            StudyPack_1.StudyPack.findById = async () => ({
                _id: new mongoose_1.default.Types.ObjectId(packId),
                title: 'Biology Unit 04 Masterclass',
                price: 4000,
            });
            StudyPackOrder_1.StudyPackOrder.findOne = async () => null;
            let createdDeliveryPayload = null;
            const fakeDeliveryId = new mongoose_1.default.Types.ObjectId();
            DeliveryOrder_1.DeliveryOrder.create = async (data) => {
                createdDeliveryPayload = data;
                return { ...data, _id: fakeDeliveryId };
            };
            let createdOrderPayload = null;
            StudyPackOrder_1.StudyPackOrder.create = async (data) => {
                createdOrderPayload = data;
                return { ...data, _id: new mongoose_1.default.Types.ObjectId() };
            };
            Transaction_1.Transaction.create = async (data) => ({
                ...data,
                _id: new mongoose_1.default.Types.ObjectId(),
            });
            const result = await (0, studyPackOrderService_1.fulfillStudyPackOrder)({
                userId: studentId,
                studyPackId: packId,
                includePhysicalDelivery: true,
                shippingAddress: '123 Galle Road, Mount Lavinia, Colombo',
                recipientPhone: '0779876543',
                recipientName: 'Kamal Perera',
            });
            assert_1.default.strictEqual(result.success, true);
            // Instant digital access unlocked without waiting for physical postal delivery
            assert_1.default.strictEqual(result.digitalAccessUnlocked, true);
            assert_1.default.strictEqual(createdOrderPayload.digital_access_granted, true);
            // DeliveryOrder created and linked to student and study pack
            (0, assert_1.default)(createdDeliveryPayload !== null);
            assert_1.default.strictEqual(createdDeliveryPayload.shipping_address, '123 Galle Road, Mount Lavinia, Colombo');
            assert_1.default.strictEqual(createdDeliveryPayload.recipient_phone, '0779876543');
            assert_1.default.strictEqual(createdDeliveryPayload.recipient_name, 'Kamal Perera');
            assert_1.default.strictEqual(createdDeliveryPayload.status, 'pending_processing');
            assert_1.default.strictEqual(createdDeliveryPayload.items[0].quantity, 1);
            assert_1.default.strictEqual(createdOrderPayload.delivery_order_id.toString(), fakeDeliveryId.toString());
        }
        finally {
            StudyPack_1.StudyPack.findById = origFindById;
            StudyPackOrder_1.StudyPackOrder.findOne = origOrderFindOne;
            StudyPackOrder_1.StudyPackOrder.create = origOrderCreate;
            DeliveryOrder_1.DeliveryOrder.create = origDeliveryCreate;
            Transaction_1.Transaction.create = origTxnCreate;
        }
    });
    await test('fulfillStudyPackOrder: idempotent repurchase returns already-owned confirmation', async () => {
        const studentId = new mongoose_1.default.Types.ObjectId().toString();
        const packId = new mongoose_1.default.Types.ObjectId().toString();
        const origFindById = StudyPack_1.StudyPack.findById;
        const origOrderFindOne = StudyPackOrder_1.StudyPackOrder.findOne;
        try {
            StudyPack_1.StudyPack.findById = async () => ({
                _id: new mongoose_1.default.Types.ObjectId(packId),
                title: 'Physics Mechanics Pack',
                price: 2000,
            });
            StudyPackOrder_1.StudyPackOrder.findOne = async () => ({
                _id: new mongoose_1.default.Types.ObjectId(),
                digital_access_granted: true,
                include_physical_delivery: false,
            });
            const result = await (0, studyPackOrderService_1.fulfillStudyPackOrder)({
                userId: studentId,
                studyPackId: packId,
                includePhysicalDelivery: false,
            });
            assert_1.default.strictEqual(result.success, true);
            assert_1.default.strictEqual(result.alreadyOwned, true);
            assert_1.default.strictEqual(result.digitalAccessUnlocked, true);
            (0, assert_1.default)(result.message.includes('already unlocked'));
        }
        finally {
            StudyPack_1.StudyPack.findById = origFindById;
            StudyPackOrder_1.StudyPackOrder.findOne = origOrderFindOne;
        }
    });
    // -----------------------------------------------------------
    // 6. Schema Index Verification
    // -----------------------------------------------------------
    console.log('\n--- 6. MongoDB Index Alignment Verification ---');
    test('Schema Indexes: StudyPack indexes match requirements', () => {
        const indexes = StudyPack_1.StudyPack.schema.indexes();
        // Index 1: Compound { is_published: 1, created_at: -1 }
        const hasCompoundSort = indexes.some(([fields]) => fields.is_published === 1 && fields.created_at === -1);
        assert_1.default.strictEqual(hasCompoundSort, true, 'StudyPack schema must define compound index { is_published: 1, created_at: -1 }');
        // Index 2: Text index { title: 'text', description: 'text' }
        const hasTextIndex = indexes.some(([fields]) => fields.title === 'text' && fields.description === 'text');
        assert_1.default.strictEqual(hasTextIndex, true, 'StudyPack schema must define text index on title and description');
    });
    // -----------------------------------------------------------
    // 7. Edge Case & Security Hardening Tests
    // -----------------------------------------------------------
    console.log('\n--- 7. Edge Case & Security Hardening Tests ---');
    test('normalizeIp: correctly extracts client IP from multi-hop X-Forwarded-For and arrays', () => {
        assert_1.default.strictEqual((0, secureMediaService_1.normalizeIp)('203.0.113.195, 70.41.3.18, 150.172.238.178'), '203.0.113.195');
        assert_1.default.strictEqual((0, secureMediaService_1.normalizeIp)(['198.51.100.22', '10.0.0.1']), '198.51.100.22');
        assert_1.default.strictEqual((0, secureMediaService_1.normalizeIp)('::1'), '127.0.0.1');
        assert_1.default.strictEqual((0, secureMediaService_1.normalizeIp)('::ffff:192.168.1.1'), '192.168.1.1');
    });
    test('isValidPhoneNumber: strictly rejects phone numbers containing letters', () => {
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)('0771234567abc'), false);
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)('1234567abcdef'), false);
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)('abc0771234567'), false);
        assert_1.default.strictEqual((0, studyPackOrderService_1.isValidPhoneNumber)('+94 77 123 4567'), true);
    });
    test('verifyMediaTicket: rejects tokens claiming to be issued far into the future', () => {
        const futurePayload = {
            userId: 'usr_future',
            resourceType: 'study_pack',
            resourceId: 'pack_future',
            expiresAt: Date.now() + 3600000,
            clientIp: '127.0.0.1',
            issuedAt: Date.now() + 120000, // 2 minutes in the future
        };
        const secret = process.env.MEDIA_SIGNING_SECRET ||
            process.env.JWT_SECRET ||
            'lms-secure-media-gate-hmac-sha256-secret-key-2026';
        const encoded = Buffer.from(JSON.stringify(futurePayload)).toString('base64url');
        const sig = crypto_1.default.createHmac('sha256', secret).update(encoded).digest('base64url');
        const futureTicket = `${encoded}.${sig}`;
        const verification = (0, secureMediaService_1.verifyMediaTicket)(futureTicket);
        assert_1.default.strictEqual(verification.valid, false);
        assert_1.default.strictEqual(verification.error, 'Media ticket issued in the future');
    });
    await test('checkStudyPackEntitlement: gracefully handles populated created_by and class_id without BSON crash', async () => {
        const userId = new mongoose_1.default.Types.ObjectId().toString();
        const packId = new mongoose_1.default.Types.ObjectId().toString();
        // Pack with populated created_by object and populated class_id object
        const populatedPack = {
            _id: new mongoose_1.default.Types.ObjectId(packId),
            title: 'Physics Mechanics Masterclass',
            price: 1500,
            created_by: {
                _id: new mongoose_1.default.Types.ObjectId(userId),
                firstName: 'Prof',
                lastName: 'Silva',
            },
            class_id: {
                _id: new mongoose_1.default.Types.ObjectId(),
                title: 'Physics 2026',
                class_code: 'PHY26',
            },
        };
        // The creator viewing their own populated pack document
        const isEntitled = await (0, secureMediaService_1.checkStudyPackEntitlement)(userId, 'student', packId, [], populatedPack);
        assert_1.default.strictEqual(isEntitled, true, 'Creator must be recognized even when created_by is populated');
    });
    await test('checkStudyPackEntitlement: cancelled StudyPackOrder does NOT grant entitlement', async () => {
        const studentId = new mongoose_1.default.Types.ObjectId().toString();
        const packId = new mongoose_1.default.Types.ObjectId().toString();
        const origFindById = StudyPack_1.StudyPack.findById;
        const origOrderFindOne = StudyPackOrder_1.StudyPackOrder.findOne;
        try {
            StudyPack_1.StudyPack.findById = async () => ({
                _id: new mongoose_1.default.Types.ObjectId(packId),
                price: 2500,
            });
            // StudyPackOrder.findOne filters status: { $ne: 'cancelled' }, so cancelled order returns null
            StudyPackOrder_1.StudyPackOrder.findOne = async (query) => {
                if (query.status && query.status.$ne === 'cancelled') {
                    return null; // No active, uncancelled order found
                }
                return {
                    _id: new mongoose_1.default.Types.ObjectId(),
                    status: 'cancelled',
                    digital_access_granted: true,
                };
            };
            const hasAccess = await (0, secureMediaService_1.checkStudyPackEntitlement)(studentId, 'student', packId);
            assert_1.default.strictEqual(hasAccess, false, 'Cancelled order must not grant access');
        }
        finally {
            StudyPack_1.StudyPack.findById = origFindById;
            StudyPackOrder_1.StudyPackOrder.findOne = origOrderFindOne;
        }
    });
    await test('checkStudyPackEntitlement: rejects unauthenticated/invalid userId even for free packs', async () => {
        const isEntitled = await (0, secureMediaService_1.checkStudyPackEntitlement)('', 'student', new mongoose_1.default.Types.ObjectId().toString());
        assert_1.default.strictEqual(isEntitled, false, 'Invalid or empty userId must never receive entitlement');
    });
    await test('fulfillStudyPackOrder: digital-to-hybrid upgrade queues delivery order and updates existing order', async () => {
        const studentId = new mongoose_1.default.Types.ObjectId().toString();
        const packId = new mongoose_1.default.Types.ObjectId().toString();
        const origFindById = StudyPack_1.StudyPack.findById;
        const origOrderFindOne = StudyPackOrder_1.StudyPackOrder.findOne;
        const origDeliveryCreate = DeliveryOrder_1.DeliveryOrder.create;
        try {
            StudyPack_1.StudyPack.findById = async () => ({
                _id: new mongoose_1.default.Types.ObjectId(packId),
                title: 'Organic Chemistry Revision',
                price: 3200,
            });
            let savedCalled = false;
            const fakeOrderId = new mongoose_1.default.Types.ObjectId();
            const existingOrderMock = {
                _id: fakeOrderId,
                digital_access_granted: true,
                include_physical_delivery: false,
                save: async () => {
                    savedCalled = true;
                },
            };
            StudyPackOrder_1.StudyPackOrder.findOne = async () => existingOrderMock;
            let createdDelivery = null;
            const fakeDeliveryId = new mongoose_1.default.Types.ObjectId();
            DeliveryOrder_1.DeliveryOrder.create = async (data) => {
                createdDelivery = data;
                return { ...data, _id: fakeDeliveryId };
            };
            const result = await (0, studyPackOrderService_1.fulfillStudyPackOrder)({
                userId: studentId,
                studyPackId: packId,
                includePhysicalDelivery: true,
                shippingAddress: '45 Lake Drive, Colombo 07',
                recipientPhone: '0712345678',
                recipientName: 'Nimal Perera',
            });
            assert_1.default.strictEqual(result.success, true);
            assert_1.default.strictEqual(result.digitalAccessUnlocked, true);
            assert_1.default.strictEqual(result.alreadyOwned, false);
            (0, assert_1.default)(createdDelivery !== null);
            assert_1.default.strictEqual(createdDelivery.shipping_address, '45 Lake Drive, Colombo 07');
            assert_1.default.strictEqual(existingOrderMock.include_physical_delivery, true);
            assert_1.default.strictEqual(existingOrderMock.delivery_order_id.toString(), fakeDeliveryId.toString());
            assert_1.default.strictEqual(savedCalled, true);
        }
        finally {
            StudyPack_1.StudyPack.findById = origFindById;
            StudyPackOrder_1.StudyPackOrder.findOne = origOrderFindOne;
            DeliveryOrder_1.DeliveryOrder.create = origDeliveryCreate;
        }
    });
    console.log('\n======================================================');
    console.log(`ALL PHASE 4 TESTS PASSED: ${passedTests}/${totalTests}`);
    console.log('======================================================\n');
}
runSuite().catch((err) => {
    console.error('\nSuite execution failed with error:', err);
    process.exit(1);
});
