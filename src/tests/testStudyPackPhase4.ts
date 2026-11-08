// src/tests/testStudyPackPhase4.ts
import assert from 'assert';
import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  generateMediaTicket,
  verifyMediaTicket,
  generateWatermarkMetadata,
  normalizeIp,
  sanitizeStudyPackResponse,
  checkStudyPackEntitlement,
  DEFAULT_MEDIA_TTL_SECONDS,
  MAX_MEDIA_TTL_SECONDS,
  MIN_MEDIA_TTL_SECONDS,
} from '../services/media/secureMediaService';
import {
  fulfillStudyPackOrder,
  isValidPhoneNumber,
} from '../services/studyPackOrderService';
import { StudyPack } from '../models/StudyPack';
import { StudyPackOrder } from '../models/StudyPackOrder';
import { DeliveryOrder } from '../models/DeliveryOrder';
import { Transaction } from '../models/Transaction';

let totalTests = 0;
let passedTests = 0;

function test(name: string, fn: () => void | Promise<void>): Promise<void> | void {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result
        .then(() => {
          passedTests++;
          console.log(`  ✓ ${name}`);
        })
        .catch((err: any) => {
          console.error(`  ✗ ${name}`);
          console.error(`    Error: ${err.message}`);
          throw err;
        });
    }
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
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
    const userId = new mongoose.Types.ObjectId().toString();
    const resourceId = new mongoose.Types.ObjectId().toString();
    const clientIp = '192.168.1.100';

    const result = generateMediaTicket({
      userId,
      resourceType: 'study_pack',
      resourceId,
      clientIp,
    });

    assert(result.ticket && typeof result.ticket === 'string');
    const parts = result.ticket.split('.');
    assert.strictEqual(parts.length, 2, 'Token must have exactly 2 parts (payload and signature)');
    assert.strictEqual(result.ttlSeconds, DEFAULT_MEDIA_TTL_SECONDS);
    assert(result.expiresAt > Date.now());

    // Decode and verify payload claims
    const decoded = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    assert.strictEqual(decoded.userId, userId);
    assert.strictEqual(decoded.resourceType, 'study_pack');
    assert.strictEqual(decoded.resourceId, resourceId);
    assert.strictEqual(decoded.clientIp, '192.168.1.100');
    assert(decoded.expiresAt > Date.now());
  });

  test('generateMediaTicket: respects custom TTL clamped to 2-hour maximum and 60s minimum', () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const resourceId = new mongoose.Types.ObjectId().toString();

    // Test clamped to max 2 hours (7200s)
    const resultMax = generateMediaTicket({
      userId,
      resourceType: 'study_pack',
      resourceId,
      clientIp: '127.0.0.1',
      ttlSeconds: 999999,
    });
    assert.strictEqual(resultMax.ttlSeconds, MAX_MEDIA_TTL_SECONDS);

    // Test clamped to min 60s
    const resultMin = generateMediaTicket({
      userId,
      resourceType: 'study_pack',
      resourceId,
      clientIp: '127.0.0.1',
      ttlSeconds: 5,
    });
    assert.strictEqual(resultMin.ttlSeconds, MIN_MEDIA_TTL_SECONDS);

    // Test valid within range (3600s = 1 hour)
    const result1h = generateMediaTicket({
      userId,
      resourceType: 'study_pack',
      resourceId,
      clientIp: '127.0.0.1',
      ttlSeconds: 3600,
    });
    assert.strictEqual(result1h.ttlSeconds, 3600);
  });

  // -----------------------------------------------------------
  // 2. Media Ticket Verification & Tamper Resistance
  // -----------------------------------------------------------
  console.log('\n--- 2. Media Ticket Verification & Tamper Resistance ---');

  test('verifyMediaTicket: untampered ticket passes verification', () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const resourceId = new mongoose.Types.ObjectId().toString();
    const clientIp = '203.0.113.195';

    const { ticket } = generateMediaTicket({
      userId,
      resourceType: 'recording',
      resourceId,
      clientIp,
    });

    const verification = verifyMediaTicket(ticket, {
      expectedClientIp: clientIp,
      expectedResourceType: 'recording',
      expectedResourceId: resourceId,
    });

    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.payload?.userId, userId);
    assert.strictEqual(verification.payload?.resourceId, resourceId);
    assert.strictEqual(verification.payload?.resourceType, 'recording');
  });

  test('verifyMediaTicket: tampered payload fails signature check', () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const resourceId = new mongoose.Types.ObjectId().toString();

    const { ticket } = generateMediaTicket({
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

    const verification = verifyMediaTicket(tamperedTicket);
    assert.strictEqual(verification.valid, false);
    assert.strictEqual(verification.error, 'Token signature invalid or tampered');
  });

  test('verifyMediaTicket: tampered signature fails verification', () => {
    const { ticket } = generateMediaTicket({
      userId: 'usr123',
      resourceType: 'study_pack',
      resourceId: 'pack123',
      clientIp: '127.0.0.1',
    });

    const [encodedPayload] = ticket.split('.');
    const bogusSignature = crypto.randomBytes(32).toString('base64url');
    const forgedTicket = `${encodedPayload}.${bogusSignature}`;

    const verification = verifyMediaTicket(forgedTicket);
    assert.strictEqual(verification.valid, false);
    assert.strictEqual(verification.error, 'Token signature invalid or tampered');
  });

  test('verifyMediaTicket: expired ticket is rejected', () => {
    const secret =
      process.env.MEDIA_SIGNING_SECRET ||
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
    const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    const expiredTicket = `${encoded}.${sig}`;

    const verification = verifyMediaTicket(expiredTicket);
    assert.strictEqual(verification.valid, false);
    assert.strictEqual(verification.error, 'Media ticket has expired');
  });

  test('verifyMediaTicket: rejects mismatched client IP and resource IDs', () => {
    const { ticket } = generateMediaTicket({
      userId: 'u1',
      resourceType: 'study_pack',
      resourceId: 'pack_correct',
      clientIp: '198.51.100.5',
    });

    // Client IP mismatch
    const resIpMismatch = verifyMediaTicket(ticket, {
      expectedClientIp: '198.51.100.99',
    });
    assert.strictEqual(resIpMismatch.valid, false);
    assert.strictEqual(resIpMismatch.error, 'Client IP mismatch');

    // Resource ID mismatch
    const resIdMismatch = verifyMediaTicket(ticket, {
      expectedResourceId: 'pack_wrong',
    });
    assert.strictEqual(resIdMismatch.valid, false);
    assert.strictEqual(resIdMismatch.error, 'Resource ID mismatch');
  });

  // -----------------------------------------------------------
  // 3. Watermarking Metadata & IP Normalization
  // -----------------------------------------------------------
  console.log('\n--- 3. Watermarking Metadata & IP Normalization ---');

  test('normalizeIp: handles IPv6 mapped IPv4 and loopback addresses', () => {
    assert.strictEqual(normalizeIp('::ffff:192.168.1.5'), '192.168.1.5');
    assert.strictEqual(normalizeIp('::1'), '127.0.0.1');
    assert.strictEqual(normalizeIp('127.0.0.1'), '127.0.0.1');
    assert.strictEqual(normalizeIp(''), '127.0.0.1');
  });

  test('generateWatermarkMetadata: produces forensic watermark bundle', () => {
    const wm = generateWatermarkMetadata({
      studentId: 'STU_10029',
      email: 'student@example.com',
      clientIp: '::ffff:203.0.113.195',
      timestamp: 1775440000000,
    });

    assert.strictEqual(wm.studentId, 'STU_10029');
    assert.strictEqual(wm.email, 'student@example.com');
    assert.strictEqual(wm.clientIp, '203.0.113.195');
    assert(wm.displayText.includes('student@example.com'));
    assert(wm.displayText.includes('STU_10029'));
    assert(wm.displayText.includes('203.0.113.195'));
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

    const sanitized = sanitizeStudyPackResponse(rawPack, false);

    assert.strictEqual(sanitized.has_access, false);
    assert.strictEqual(sanitized.is_enrolled, false);
    assert.strictEqual(sanitized.title, 'Advanced Level Physics Revision');

    // Video streaming and PDF URLs MUST BE REDACTED
    assert.strictEqual(sanitized.recordings[0].video_url, null);
    assert.strictEqual(sanitized.recordings[0].driveUrl, null);
    assert.strictEqual(sanitized.recordings[0].is_locked, true);

    assert.strictEqual(sanitized.custom_videos[0].url, null);
    assert.strictEqual(sanitized.custom_videos[0].is_locked, true);

    assert.strictEqual(sanitized.materials[0].file_url, null);
    assert.strictEqual(sanitized.materials[0].is_locked, true);
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

    const fullAccess = sanitizeStudyPackResponse(rawPack, true);

    assert.strictEqual(fullAccess.has_access, true);
    assert.strictEqual(fullAccess.is_enrolled, true);
    assert.strictEqual(
      fullAccess.recordings[0].video_url,
      'https://cdn.example.com/stream/secret_hls_stream_01.m3u8'
    );
    assert.strictEqual(
      fullAccess.recordings[0].driveUrl,
      'https://drive.google.com/file/d/secret_drive_123/view'
    );
    assert.strictEqual(fullAccess.custom_videos[0].url, 'https://vimeo.com/private/987654321');
    assert.strictEqual(
      fullAccess.materials[0].file_url,
      'https://storage.example.com/protected/mechanics_tute_2026.pdf'
    );
  });

  // -----------------------------------------------------------
  // 5. Phone Validation & Hybrid Fulfillment Inputs
  // -----------------------------------------------------------
  console.log('\n--- 5. Phone Validation & Hybrid Fulfillment Service ---');

  test('isValidPhoneNumber: accurately tests Sri Lankan & international phone numbers', () => {
    assert.strictEqual(isValidPhoneNumber('0771234567'), true);
    assert.strictEqual(isValidPhoneNumber('+94771234567'), true);
    assert.strictEqual(isValidPhoneNumber('011-2345678'), true);
    assert.strictEqual(isValidPhoneNumber('123'), false); // Too short
    assert.strictEqual(isValidPhoneNumber(''), false);
    assert.strictEqual(isValidPhoneNumber('invalid_chars_abc'), false);
  });

  await test('fulfillStudyPackOrder: physical notes delivery requires valid address and phone', async () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    const packId = new mongoose.Types.ObjectId().toString();

    // Mock StudyPack.findById
    const origFindById = StudyPack.findById;
    (StudyPack as any).findById = async () => ({
      _id: new mongoose.Types.ObjectId(packId),
      title: 'Chemistry Organic Masterclass',
      price: 3000,
    });

    try {
      // 1. Missing address must fail
      await assert.rejects(
        async () => {
          await fulfillStudyPackOrder({
            userId: studentId,
            studyPackId: packId,
            includePhysicalDelivery: true,
            shippingAddress: '',
            recipientPhone: '0771234567',
          });
        },
        /shipping address is required/
      );

      // 2. Missing or invalid phone must fail
      await assert.rejects(
        async () => {
          await fulfillStudyPackOrder({
            userId: studentId,
            studyPackId: packId,
            includePhysicalDelivery: true,
            shippingAddress: 'No. 45, Temple Road, Colombo 03',
            recipientPhone: 'abc',
          });
        },
        /recipient phone number is required/
      );
    } finally {
      (StudyPack as any).findById = origFindById;
    }
  });

  await test('fulfillStudyPackOrder: digital-only purchase unlocks instant digital entitlement', async () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    const packId = new mongoose.Types.ObjectId().toString();

    const origFindById = StudyPack.findById;
    const origOrderFindOne = StudyPackOrder.findOne;
    const origOrderCreate = StudyPackOrder.create;
    const origTxnCreate = Transaction.create;

    try {
      (StudyPack as any).findById = async () => ({
        _id: new mongoose.Types.ObjectId(packId),
        title: 'Combined Maths Pure Revision',
        price: 3500,
      });

      (StudyPackOrder as any).findOne = async () => null; // No previous order

      let createdOrderPayload: any = null;
      (StudyPackOrder as any).create = async (data: any) => {
        createdOrderPayload = data;
        return { ...data, _id: new mongoose.Types.ObjectId() };
      };

      (Transaction as any).create = async (data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
      });

      const result = await fulfillStudyPackOrder({
        userId: studentId,
        studyPackId: packId,
        includePhysicalDelivery: false,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.digitalAccessUnlocked, true);
      assert.strictEqual(result.delivery, null);
      assert.strictEqual(createdOrderPayload.digital_access_granted, true);
      assert.strictEqual(createdOrderPayload.include_physical_delivery, false);
      assert.strictEqual(createdOrderPayload.payment_status, 'paid');
      assert.strictEqual(createdOrderPayload.amount_paid, 3500);
    } finally {
      (StudyPack as any).findById = origFindById;
      (StudyPackOrder as any).findOne = origOrderFindOne;
      (StudyPackOrder as any).create = origOrderCreate;
      (Transaction as any).create = origTxnCreate;
    }
  });

  await test('fulfillStudyPackOrder: hybrid purchase creates DeliveryOrder AND unlocks digital access immediately', async () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    const packId = new mongoose.Types.ObjectId().toString();

    const origFindById = StudyPack.findById;
    const origOrderFindOne = StudyPackOrder.findOne;
    const origOrderCreate = StudyPackOrder.create;
    const origDeliveryCreate = DeliveryOrder.create;
    const origTxnCreate = Transaction.create;

    try {
      (StudyPack as any).findById = async () => ({
        _id: new mongoose.Types.ObjectId(packId),
        title: 'Biology Unit 04 Masterclass',
        price: 4000,
      });

      (StudyPackOrder as any).findOne = async () => null;

      let createdDeliveryPayload: any = null;
      const fakeDeliveryId = new mongoose.Types.ObjectId();
      (DeliveryOrder as any).create = async (data: any) => {
        createdDeliveryPayload = data;
        return { ...data, _id: fakeDeliveryId };
      };

      let createdOrderPayload: any = null;
      (StudyPackOrder as any).create = async (data: any) => {
        createdOrderPayload = data;
        return { ...data, _id: new mongoose.Types.ObjectId() };
      };

      (Transaction as any).create = async (data: any) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
      });

      const result = await fulfillStudyPackOrder({
        userId: studentId,
        studyPackId: packId,
        includePhysicalDelivery: true,
        shippingAddress: '123 Galle Road, Mount Lavinia, Colombo',
        recipientPhone: '0779876543',
        recipientName: 'Kamal Perera',
      });

      assert.strictEqual(result.success, true);
      // Instant digital access unlocked without waiting for physical postal delivery
      assert.strictEqual(result.digitalAccessUnlocked, true);
      assert.strictEqual(createdOrderPayload.digital_access_granted, true);

      // DeliveryOrder created and linked to student and study pack
      assert(createdDeliveryPayload !== null);
      assert.strictEqual(createdDeliveryPayload.shipping_address, '123 Galle Road, Mount Lavinia, Colombo');
      assert.strictEqual(createdDeliveryPayload.recipient_phone, '0779876543');
      assert.strictEqual(createdDeliveryPayload.recipient_name, 'Kamal Perera');
      assert.strictEqual(createdDeliveryPayload.status, 'pending_processing');
      assert.strictEqual(createdDeliveryPayload.items[0].quantity, 1);
      assert.strictEqual(createdOrderPayload.delivery_order_id.toString(), fakeDeliveryId.toString());
    } finally {
      (StudyPack as any).findById = origFindById;
      (StudyPackOrder as any).findOne = origOrderFindOne;
      (StudyPackOrder as any).create = origOrderCreate;
      (DeliveryOrder as any).create = origDeliveryCreate;
      (Transaction as any).create = origTxnCreate;
    }
  });

  await test('fulfillStudyPackOrder: idempotent repurchase returns already-owned confirmation', async () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    const packId = new mongoose.Types.ObjectId().toString();

    const origFindById = StudyPack.findById;
    const origOrderFindOne = StudyPackOrder.findOne;

    try {
      (StudyPack as any).findById = async () => ({
        _id: new mongoose.Types.ObjectId(packId),
        title: 'Physics Mechanics Pack',
        price: 2000,
      });

      (StudyPackOrder as any).findOne = async () => ({
        _id: new mongoose.Types.ObjectId(),
        digital_access_granted: true,
        include_physical_delivery: false,
      });

      const result = await fulfillStudyPackOrder({
        userId: studentId,
        studyPackId: packId,
        includePhysicalDelivery: false,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.alreadyOwned, true);
      assert.strictEqual(result.digitalAccessUnlocked, true);
      assert(result.message.includes('already unlocked'));
    } finally {
      (StudyPack as any).findById = origFindById;
      (StudyPackOrder as any).findOne = origOrderFindOne;
    }
  });

  // -----------------------------------------------------------
  // 6. Schema Index Verification
  // -----------------------------------------------------------
  console.log('\n--- 6. MongoDB Index Alignment Verification ---');

  test('Schema Indexes: StudyPack indexes match requirements', () => {
    const indexes = StudyPack.schema.indexes();
    // Index 1: Compound { is_published: 1, created_at: -1 }
    const hasCompoundSort = indexes.some(
      ([fields]) => fields.is_published === 1 && fields.created_at === -1
    );
    assert.strictEqual(
      hasCompoundSort,
      true,
      'StudyPack schema must define compound index { is_published: 1, created_at: -1 }'
    );

    // Index 2: Text index { title: 'text', description: 'text' }
    const hasTextIndex = indexes.some(
      ([fields]) => fields.title === 'text' && fields.description === 'text'
    );
    assert.strictEqual(
      hasTextIndex,
      true,
      'StudyPack schema must define text index on title and description'
    );
  });

  // -----------------------------------------------------------
  // 7. Edge Case & Security Hardening Tests
  // -----------------------------------------------------------
  console.log('\n--- 7. Edge Case & Security Hardening Tests ---');

  test('normalizeIp: correctly extracts client IP from multi-hop X-Forwarded-For and arrays', () => {
    assert.strictEqual(normalizeIp('203.0.113.195, 70.41.3.18, 150.172.238.178'), '203.0.113.195');
    assert.strictEqual(normalizeIp(['198.51.100.22', '10.0.0.1']), '198.51.100.22');
    assert.strictEqual(normalizeIp('::1'), '127.0.0.1');
    assert.strictEqual(normalizeIp('::ffff:192.168.1.1'), '192.168.1.1');
  });

  test('isValidPhoneNumber: strictly rejects phone numbers containing letters', () => {
    assert.strictEqual(isValidPhoneNumber('0771234567abc'), false);
    assert.strictEqual(isValidPhoneNumber('1234567abcdef'), false);
    assert.strictEqual(isValidPhoneNumber('abc0771234567'), false);
    assert.strictEqual(isValidPhoneNumber('+94 77 123 4567'), true);
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
    const secret =
      process.env.MEDIA_SIGNING_SECRET ||
      process.env.JWT_SECRET ||
      'lms-secure-media-gate-hmac-sha256-secret-key-2026';
    const encoded = Buffer.from(JSON.stringify(futurePayload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    const futureTicket = `${encoded}.${sig}`;

    const verification = verifyMediaTicket(futureTicket);
    assert.strictEqual(verification.valid, false);
    assert.strictEqual(verification.error, 'Media ticket issued in the future');
  });

  await test('checkStudyPackEntitlement: gracefully handles populated created_by and class_id without BSON crash', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const packId = new mongoose.Types.ObjectId().toString();

    // Pack with populated created_by object and populated class_id object
    const populatedPack = {
      _id: new mongoose.Types.ObjectId(packId),
      title: 'Physics Mechanics Masterclass',
      price: 1500,
      created_by: {
        _id: new mongoose.Types.ObjectId(userId),
        firstName: 'Prof',
        lastName: 'Silva',
      },
      class_id: {
        _id: new mongoose.Types.ObjectId(),
        title: 'Physics 2026',
        class_code: 'PHY26',
      },
    };

    // The creator viewing their own populated pack document
    const isEntitled = await checkStudyPackEntitlement(userId, 'student', packId, [], populatedPack);
    assert.strictEqual(isEntitled, true, 'Creator must be recognized even when created_by is populated');
  });

  await test('checkStudyPackEntitlement: cancelled StudyPackOrder does NOT grant entitlement', async () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    const packId = new mongoose.Types.ObjectId().toString();

    const origFindById = StudyPack.findById;
    const origOrderFindOne = StudyPackOrder.findOne;

    try {
      (StudyPack as any).findById = async () => ({
        _id: new mongoose.Types.ObjectId(packId),
        price: 2500,
      });

      // StudyPackOrder.findOne filters status: { $ne: 'cancelled' }, so cancelled order returns null
      (StudyPackOrder as any).findOne = async (query: any) => {
        if (query.status && query.status.$ne === 'cancelled') {
          return null; // No active, uncancelled order found
        }
        return {
          _id: new mongoose.Types.ObjectId(),
          status: 'cancelled',
          digital_access_granted: true,
        };
      };

      const hasAccess = await checkStudyPackEntitlement(studentId, 'student', packId);
      assert.strictEqual(hasAccess, false, 'Cancelled order must not grant access');
    } finally {
      (StudyPack as any).findById = origFindById;
      (StudyPackOrder as any).findOne = origOrderFindOne;
    }
  });

  await test('checkStudyPackEntitlement: rejects unauthenticated/invalid userId even for free packs', async () => {
    const isEntitled = await checkStudyPackEntitlement('', 'student', new mongoose.Types.ObjectId().toString());
    assert.strictEqual(isEntitled, false, 'Invalid or empty userId must never receive entitlement');
  });

  await test('fulfillStudyPackOrder: digital-to-hybrid upgrade queues delivery order and updates existing order', async () => {
    const studentId = new mongoose.Types.ObjectId().toString();
    const packId = new mongoose.Types.ObjectId().toString();

    const origFindById = StudyPack.findById;
    const origOrderFindOne = StudyPackOrder.findOne;
    const origDeliveryCreate = DeliveryOrder.create;

    try {
      (StudyPack as any).findById = async () => ({
        _id: new mongoose.Types.ObjectId(packId),
        title: 'Organic Chemistry Revision',
        price: 3200,
      });

      let savedCalled = false;
      const fakeOrderId = new mongoose.Types.ObjectId();
      const existingOrderMock: any = {
        _id: fakeOrderId,
        digital_access_granted: true,
        include_physical_delivery: false,
        save: async () => {
          savedCalled = true;
        },
      };

      (StudyPackOrder as any).findOne = async () => existingOrderMock;

      let createdDelivery: any = null;
      const fakeDeliveryId = new mongoose.Types.ObjectId();
      (DeliveryOrder as any).create = async (data: any) => {
        createdDelivery = data;
        return { ...data, _id: fakeDeliveryId };
      };

      const result = await fulfillStudyPackOrder({
        userId: studentId,
        studyPackId: packId,
        includePhysicalDelivery: true,
        shippingAddress: '45 Lake Drive, Colombo 07',
        recipientPhone: '0712345678',
        recipientName: 'Nimal Perera',
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.digitalAccessUnlocked, true);
      assert.strictEqual(result.alreadyOwned, false);
      assert(createdDelivery !== null);
      assert.strictEqual(createdDelivery.shipping_address, '45 Lake Drive, Colombo 07');
      assert.strictEqual(existingOrderMock.include_physical_delivery, true);
      assert.strictEqual(existingOrderMock.delivery_order_id.toString(), fakeDeliveryId.toString());
      assert.strictEqual(savedCalled, true);
    } finally {
      (StudyPack as any).findById = origFindById;
      (StudyPackOrder as any).findOne = origOrderFindOne;
      (DeliveryOrder as any).create = origDeliveryCreate;
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
