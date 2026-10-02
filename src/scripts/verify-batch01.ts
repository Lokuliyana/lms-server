import mongoose from 'mongoose';
import http from 'http';
import { app } from '../app';
import { User } from '../models/User';
import { Class } from '../models/Class';
import { Subject } from '../models/Subject';
import { Grade } from '../models/Grade';
import { ClassEnrollment } from '../models/ClassEnrollment';
import { ClassApplication } from '../models/ClassApplication';
import { Assignment } from '../models/Assignment';
import { AssignmentSubmission } from '../models/AssignmentSubmission';
import { OTP } from '../models/OTP';
import { authService } from '../services/authService';
import { handleApplication } from '../services/classApplicationService';
import { seedPermissionsAndRoles } from './seedPermissions';
import bcrypt from 'bcrypt';

async function testBatch01() {
  console.log('=== VERIFYING ANTIGRAVITY BATCH 01 IMPLEMENTATION ===');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms');

  await seedPermissionsAndRoles();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function login(email: string) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: 'password123' })
    });
    const cookie = res.headers.get('set-cookie') || '';
    const body: any = await res.json();
    return { status: res.status, cookie, body };
  }

  const teacher = await login('teacher@lms.com');
  const student = await login('student@lms.com');

  let passed = 0;
  let failed = 0;
  function assert(title: string, ok: boolean, msg?: string) {
    if (ok) {
      console.log(`  [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${title} - ${msg || 'assertion failed'}`);
      failed++;
    }
  }

  // Step 1: Session token & password_hash stripped from identity context
  console.log('\n--- Step 1: Secure identity hydration and session token context ---');
  const profRes = await fetch(`${baseUrl}/api/auth/profile`, {
    headers: { Cookie: student.cookie }
  });
  const prof = await profRes.json();
  assert('Profile endpoint succeeds with 200', profRes.status === 200);
  assert('req.user / profile data excludes password_hash', prof.data?.password_hash === undefined);
  assert('Identity hydration contains permissions list', Array.isArray(prof.data?.permissions));

  // Step 2: Prevent registration crashes and ensure transaction safety
  console.log('\n--- Step 2: Prevent registration crashes & transaction safety ---');
  const testEmail = `test_student_${Date.now()}@lms.com`;
  const testPhone = `077${Math.floor(1000000 + Math.random() * 9000000)}`;
  const step1Res = await authService.registerStep1({
    email: testEmail,
    phone: testPhone,
    full_name: 'Arthur C Clarke',
    password_hash: await bcrypt.hash('secret123', 10)
  });
  assert('registerStep1 generates OTP', !!step1Res.message);
  const otpDoc = await OTP.findOne({ email: testEmail });
  assert('OTP cached in database', !!otpDoc);
  const registeredUser = await authService.registerStep2(testEmail, otpDoc!.otp);
  assert('registerStep2 parses first_name correctly', registeredUser.first_name === 'Arthur');
  assert('registerStep2 parses last_name correctly', registeredUser.last_name === 'C Clarke');
  assert('User is marked is_verified: true', registeredUser.is_verified === true);
  assert('User has student role assigned', (registeredUser.role_ids || []).length > 0);

  // Step 3: Administrative route authorization hardening
  console.log('\n--- Step 3: Administrative route authorization hardening ---');
  const resetRes = await fetch(`${baseUrl}/api/auth/admin/reset-password/${registeredUser._id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: student.cookie },
    body: JSON.stringify({ newPassword: 'hacked123' })
  });
  assert('Student cannot invoke administrative reset-password (403 Forbidden)', resetRes.status === 403);

  // Step 4: Class model extension & sequential enterprise identifiers
  console.log('\n--- Step 4: Class model extension & sequential enterprise identifiers ---');
  let subject = await Subject.findOne();
  if (!subject) subject = await Subject.create({ name: 'Mathematics' });
  let grade = await Grade.findOne();
  if (!grade) grade = await Grade.create({ name: 'Grade 11' });

  const teacherUser = await User.findOne({ email: 'teacher@lms.com' });
  const newCls = new Class({
    title: 'Pure Math 2026',
    description: 'Calculus and geometry',
    batches: [{ batch_name: 'Batch 1', day: 'Saturday', start: '10:00', end: '12:00' }],
    format: 'theory',
    type: 'regular',
    subject: subject._id,
    grade: grade._id,
    price: 3000,
    created_by: teacherUser!._id
  });
  await newCls.save();
  assert('Class auto-assigns sequential enterprise identifier CLS-XXXX', !!newCls.class_code && /^CLS-\d{4}$/.test(newCls.class_code));

  // Step 5: Enrollment sync and guest sanitization
  console.log('\n--- Step 5: Enrollment sync and guest sanitization ---');
  const guestClsRes = await fetch(`${baseUrl}/api/classes/${newCls._id}`);
  const guestClsData: any = await guestClsRes.json();
  assert('Guest class view succeeds (200)', guestClsRes.status === 200);
  assert('Guest class view sanitizes zoom_join_url', guestClsData.data?.zoom_join_url === undefined);
  assert('Guest class view sanitizes enrolled_students', guestClsData.data?.enrolled_students === undefined);

  // Step 6: Non-destructive admissions and fulfillment hooks
  console.log('\n--- Step 6: Non-destructive admissions and fulfillment hooks ---');
  const studentUser = await User.findOne({ email: 'student@lms.com' });
  const appDoc = await ClassApplication.create({
    user_id: studentUser!._id,
    class_id: newCls._id,
    status: 'pending',
    applied_at: new Date()
  });
  const handleRes = await handleApplication(appDoc._id.toString(), 'approved', teacherUser!._id.toString());
  const updatedApp = await ClassApplication.findById(appDoc._id);
  assert('Application document is NOT deleted on approval', updatedApp !== null);
  assert('Application status is updated to approved', updatedApp?.status === 'approved');
  assert('Application approved_by metadata is recorded', updatedApp?.approved_by?.toString() === teacherUser!._id.toString());
  const enrollmentExists = await ClassEnrollment.exists({ classId: newCls._id, userId: studentUser!._id, status: 'active' });
  assert('Fulfillment hook created active ClassEnrollment', !!enrollmentExists);

  // Step 7: Shared media upload unblocking
  console.log('\n--- Step 7: Shared media upload unblocking ---');
  const dummyText = 'test-file-content';
  const formData = new FormData();
  formData.append('file', new Blob([dummyText], { type: 'text/plain' }), 'test.txt');
  formData.append('ownerType', 'application');

  const uploadRes = await fetch(`${baseUrl}/api/media/upload`, {
    method: 'POST',
    headers: { Cookie: student.cookie },
    body: formData
  });
  // Note: if Supabase credentials are mock/not set, 500 from Supabase or 200 from success, but NOT 403 Forbidden!
  assert('Student is NOT blocked by 403 Forbidden on shared media upload', uploadRes.status !== 403);

  // Step 8: Coursework submission model & persistence restoration
  console.log('\n--- Step 8: Coursework submission model and persistence restoration ---');
  const asgDoc = await Assignment.create({
    class_id: newCls._id,
    title: 'Calculus Homework 1',
    description: 'Solve problem set 1',
    due_date: new Date(Date.now() + 86400000 * 7),
    created_by: teacherUser!._id
  });

  const submitRes = await fetch(`${baseUrl}/api/assignments/${asgDoc._id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: student.cookie },
    body: JSON.stringify({
      url: 'https://example.com/homework.pdf',
      note: 'Here is my submission'
    })
  });
  assert('Student can submit assignment (200)', submitRes.status === 200);
  const savedSubmission = await AssignmentSubmission.findOne({ assignment_id: asgDoc._id, student_id: studentUser!._id });
  assert('AssignmentSubmission document is persisted in database', !!savedSubmission);
  assert('Saved submission contains provided URL', savedSubmission?.url === 'https://example.com/homework.pdf');

  const mySubRes = await fetch(`${baseUrl}/api/assignments/${asgDoc._id}/my-submission`, {
    headers: { Cookie: student.cookie }
  });
  const mySubData: any = await mySubRes.json();
  assert('Student can retrieve their submission via /my-submission', mySubRes.status === 200 && mySubData.data?.url === 'https://example.com/homework.pdf');

  // Step 9: Challenge route parameter handlers
  console.log('\n--- Step 9: Challenge route parameter handlers ---');
  // Param route /:matchId/accept
  const fakeMatchId = new mongoose.Types.ObjectId().toString();
  const acceptParamRes = await fetch(`${baseUrl}/api/challenges/${fakeMatchId}/accept`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: student.cookie }
  });
  // Should route to controller, not 404 or 422 missing param! (Will fail on match not found or 400 from service, not 422 missing matchId)
  assert('PUT /:matchId/accept correctly extracts matchId parameter (not 422)', acceptParamRes.status !== 422);

  const submitParamRes = await fetch(`${baseUrl}/api/challenges/${fakeMatchId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: student.cookie },
    body: JSON.stringify({ submission_id: new mongoose.Types.ObjectId().toString() })
  });
  assert('POST /:matchId/submit correctly extracts matchId parameter (not 422)', submitParamRes.status !== 422);

  // Step 10: Academic data leak patch and roster privacy
  console.log('\n--- Step 10: Academic data leak patch and roster privacy ---');
  const fakeExamId = new mongoose.Types.ObjectId().toString();
  const exportRes = await fetch(`${baseUrl}/api/grades/export/${fakeExamId}`, {
    headers: { Cookie: student.cookie }
  });
  assert('Student access to /api/grades/export/:id is blocked (403 Forbidden)', exportRes.status === 403);

  // Clean up test data
  await Class.findByIdAndDelete(newCls._id);
  await Assignment.findByIdAndDelete(asgDoc._id);
  await AssignmentSubmission.deleteMany({ assignment_id: asgDoc._id });
  await User.findByIdAndDelete(registeredUser._id);
  await OTP.deleteMany({ email: testEmail });

  server.close();
  console.log(`\n==================================================`);
  console.log(`BATCH 01 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

testBatch01().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
