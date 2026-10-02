"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const http_1 = __importDefault(require("http"));
const app_1 = require("../app");
const User_1 = require("../models/User");
const Class_1 = require("../models/Class");
const Subject_1 = require("../models/Subject");
const Grade_1 = require("../models/Grade");
const ClassEnrollment_1 = require("../models/ClassEnrollment");
const ClassApplication_1 = require("../models/ClassApplication");
const Assignment_1 = require("../models/Assignment");
const AssignmentSubmission_1 = require("../models/AssignmentSubmission");
const OTP_1 = require("../models/OTP");
const authService_1 = require("../services/authService");
const classApplicationService_1 = require("../services/classApplicationService");
const seedPermissions_1 = require("./seedPermissions");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function testBatch01() {
    console.log('=== VERIFYING ANTIGRAVITY BATCH 01 IMPLEMENTATION ===');
    await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms');
    await (0, seedPermissions_1.seedPermissionsAndRoles)();
    const server = http_1.default.createServer(app_1.app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    async function login(email) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: email, password: 'password123' })
        });
        const cookie = res.headers.get('set-cookie') || '';
        const body = await res.json();
        return { status: res.status, cookie, body };
    }
    const teacher = await login('teacher@lms.com');
    const student = await login('student@lms.com');
    let passed = 0;
    let failed = 0;
    function assert(title, ok, msg) {
        if (ok) {
            console.log(`  [PASS] ${title}`);
            passed++;
        }
        else {
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
    const step1Res = await authService_1.authService.registerStep1({
        email: testEmail,
        phone: testPhone,
        full_name: 'Arthur C Clarke',
        password_hash: await bcrypt_1.default.hash('secret123', 10)
    });
    assert('registerStep1 generates OTP', !!step1Res.message);
    const otpDoc = await OTP_1.OTP.findOne({ email: testEmail });
    assert('OTP cached in database', !!otpDoc);
    const registeredUser = await authService_1.authService.registerStep2(testEmail, otpDoc.otp);
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
    let subject = await Subject_1.Subject.findOne();
    if (!subject)
        subject = await Subject_1.Subject.create({ name: 'Mathematics' });
    let grade = await Grade_1.Grade.findOne();
    if (!grade)
        grade = await Grade_1.Grade.create({ name: 'Grade 11' });
    const teacherUser = await User_1.User.findOne({ email: 'teacher@lms.com' });
    const newCls = new Class_1.Class({
        title: 'Pure Math 2026',
        description: 'Calculus and geometry',
        batches: [{ batch_name: 'Batch 1', day: 'Saturday', start: '10:00', end: '12:00' }],
        format: 'theory',
        type: 'regular',
        subject: subject._id,
        grade: grade._id,
        price: 3000,
        created_by: teacherUser._id
    });
    await newCls.save();
    assert('Class auto-assigns sequential enterprise identifier CLS-XXXX', !!newCls.class_code && /^CLS-\d{4}$/.test(newCls.class_code));
    // Step 5: Enrollment sync and guest sanitization
    console.log('\n--- Step 5: Enrollment sync and guest sanitization ---');
    const guestClsRes = await fetch(`${baseUrl}/api/classes/${newCls._id}`);
    const guestClsData = await guestClsRes.json();
    assert('Guest class view succeeds (200)', guestClsRes.status === 200);
    assert('Guest class view sanitizes zoom_join_url', guestClsData.data?.zoom_join_url === undefined);
    assert('Guest class view sanitizes enrolled_students', guestClsData.data?.enrolled_students === undefined);
    // Step 6: Non-destructive admissions and fulfillment hooks
    console.log('\n--- Step 6: Non-destructive admissions and fulfillment hooks ---');
    const studentUser = await User_1.User.findOne({ email: 'student@lms.com' });
    const appDoc = await ClassApplication_1.ClassApplication.create({
        user_id: studentUser._id,
        class_id: newCls._id,
        status: 'pending',
        applied_at: new Date()
    });
    const handleRes = await (0, classApplicationService_1.handleApplication)(appDoc._id.toString(), 'approved', teacherUser._id.toString());
    const updatedApp = await ClassApplication_1.ClassApplication.findById(appDoc._id);
    assert('Application document is NOT deleted on approval', updatedApp !== null);
    assert('Application status is updated to approved', updatedApp?.status === 'approved');
    assert('Application approved_by metadata is recorded', updatedApp?.approved_by?.toString() === teacherUser._id.toString());
    const enrollmentExists = await ClassEnrollment_1.ClassEnrollment.exists({ classId: newCls._id, userId: studentUser._id, status: 'active' });
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
    const asgDoc = await Assignment_1.Assignment.create({
        class_id: newCls._id,
        title: 'Calculus Homework 1',
        description: 'Solve problem set 1',
        due_date: new Date(Date.now() + 86400000 * 7),
        created_by: teacherUser._id
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
    const savedSubmission = await AssignmentSubmission_1.AssignmentSubmission.findOne({ assignment_id: asgDoc._id, student_id: studentUser._id });
    assert('AssignmentSubmission document is persisted in database', !!savedSubmission);
    assert('Saved submission contains provided URL', savedSubmission?.url === 'https://example.com/homework.pdf');
    const mySubRes = await fetch(`${baseUrl}/api/assignments/${asgDoc._id}/my-submission`, {
        headers: { Cookie: student.cookie }
    });
    const mySubData = await mySubRes.json();
    assert('Student can retrieve their submission via /my-submission', mySubRes.status === 200 && mySubData.data?.url === 'https://example.com/homework.pdf');
    // Step 9: Challenge route parameter handlers
    console.log('\n--- Step 9: Challenge route parameter handlers ---');
    // Param route /:matchId/accept
    const fakeMatchId = new mongoose_1.default.Types.ObjectId().toString();
    const acceptParamRes = await fetch(`${baseUrl}/api/challenges/${fakeMatchId}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: student.cookie }
    });
    // Should route to controller, not 404 or 422 missing param! (Will fail on match not found or 400 from service, not 422 missing matchId)
    assert('PUT /:matchId/accept correctly extracts matchId parameter (not 422)', acceptParamRes.status !== 422);
    const submitParamRes = await fetch(`${baseUrl}/api/challenges/${fakeMatchId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: student.cookie },
        body: JSON.stringify({ submission_id: new mongoose_1.default.Types.ObjectId().toString() })
    });
    assert('POST /:matchId/submit correctly extracts matchId parameter (not 422)', submitParamRes.status !== 422);
    // Step 10: Academic data leak patch and roster privacy
    console.log('\n--- Step 10: Academic data leak patch and roster privacy ---');
    const fakeExamId = new mongoose_1.default.Types.ObjectId().toString();
    const exportRes = await fetch(`${baseUrl}/api/grades/export/${fakeExamId}`, {
        headers: { Cookie: student.cookie }
    });
    assert('Student access to /api/grades/export/:id is blocked (403 Forbidden)', exportRes.status === 403);
    // Clean up test data
    await Class_1.Class.findByIdAndDelete(newCls._id);
    await Assignment_1.Assignment.findByIdAndDelete(asgDoc._id);
    await AssignmentSubmission_1.AssignmentSubmission.deleteMany({ assignment_id: asgDoc._id });
    await User_1.User.findByIdAndDelete(registeredUser._id);
    await OTP_1.OTP.deleteMany({ email: testEmail });
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
