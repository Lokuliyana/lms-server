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
const Transaction_1 = require("../models/Transaction");
const ClassEntitlement_1 = require("../models/ClassEntitlement");
const seedPermissions_1 = require("./seedPermissions");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function runRegression() {
    console.log("==================================================");
    console.log("       NEXVOLEARN FULL REGRESSION SUITE           ");
    console.log("==================================================");
    await mongoose_1.default.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms");
    console.log("Connected to MongoDB.");
    // Ensure permissions and users are seeded
    await (0, seedPermissions_1.seedPermissionsAndRoles)();
    // Reset passwords so login is 100% guaranteed
    const hashedPassword = await bcrypt_1.default.hash("password123", 10);
    await User_1.User.updateMany({ email: { $in: ["teacher@lms.com", "moderator@lms.com", "student@lms.com", "admin@lms.com"] } }, { $set: { password_hash: hashedPassword } });
    // Start ephemeral HTTP server
    const server = http_1.default.createServer(app_1.app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Test server running at ${baseUrl}`);
    // Login helper that returns cookie and bearer token
    async function login(email) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: email, password: "password123" }),
        });
        const cookie = res.headers.get("set-cookie") || "";
        const body = await res.json();
        const token = body?.token || body?.data?.token || "";
        return { status: res.status, cookie, token, user: body?.user || body?.data?.user };
    }
    const teacherAuth = await login("teacher@lms.com");
    const moderatorAuth = await login("moderator@lms.com");
    const studentAuth = await login("student@lms.com");
    if (teacherAuth.status !== 200 || moderatorAuth.status !== 200 || studentAuth.status !== 200) {
        throw new Error("Failed to log in test users!");
    }
    const teacherHeaders = { "Content-Type": "application/json", Cookie: teacherAuth.cookie };
    const studentHeaders = { "Content-Type": "application/json", Cookie: studentAuth.cookie };
    const studentUser = await User_1.User.findOne({ email: "student@lms.com" });
    let passedTests = 0;
    let failedTests = 0;
    function assert(name, condition, details) {
        if (condition) {
            console.log(`  [PASS] ${name}`);
            passedTests++;
        }
        else {
            console.error(`  [FAIL] ${name} ${details ? `(${details})` : ""}`);
            failedTests++;
        }
    }
    // 1. Subject & Grade setup
    let subject = await Subject_1.Subject.findOne();
    if (!subject)
        subject = await Subject_1.Subject.create({ name: "Physics" });
    let grade = await Grade_1.Grade.findOne();
    if (!grade)
        grade = await Grade_1.Grade.create({ name: "Grade 12" });
    // 2. Class creation by Teacher
    console.log("\n--- TEST SUITE 1: Classes & RBAC ---");
    const classRes = await fetch(`${baseUrl}/api/classes`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
            title: "Regression Test Class",
            description: "Automated regression verification",
            format: "theory",
            type: "regular",
            price: 1500,
            subject: subject._id,
            grade: grade._id,
            zoom_join_url: "https://zoom.us/j/1234567890?pwd=testpassword",
            zoom_start_url: "https://zoom.us/s/1234567890?zak=testzaktoken",
            batches: [{ batch_name: "Morning", day: "Monday", start: "08:00", end: "10:00" }],
        }),
    });
    assert("Teacher can create class (201)", classRes.status === 201, `Status: ${classRes.status}`);
    const testClass = await classRes.json();
    const classId = testClass?.data?._id || testClass?._id;
    // Student cannot create class
    const studentClassRes = await fetch(`${baseUrl}/api/classes`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
            title: "Illegal Class",
            description: "Should fail",
            format: "theory",
            type: "regular",
            price: 1000,
            subject: subject._id,
            grade: grade._id,
            batches: [{ batch_name: "Eve", day: "Sun", start: "10:00", end: "12:00" }],
        }),
    });
    assert("Student cannot create class (403)", studentClassRes.status === 403, `Status: ${studentClassRes.status}`);
    // Guest view class sanitization
    const guestClassRes = await fetch(`${baseUrl}/api/classes/${classId}`);
    assert("Guest can view class (200)", guestClassRes.status === 200, `Status: ${guestClassRes.status}`);
    const guestClassJson = await guestClassRes.json();
    const guestCls = guestClassJson?.data || guestClassJson;
    assert("Guest view sanitizes zoom join/start urls", guestCls?.zoom_join_url === undefined && guestCls?.zoom_start_url === undefined);
    // Enroll student
    await ClassEnrollment_1.ClassEnrollment.findOneAndUpdate({ classId: new mongoose_1.default.Types.ObjectId(classId), userId: studentUser._id }, { status: "active", enrolledAt: new Date() }, { upsert: true, new: true });
    // 3. Meeting Access / Zoom Ticket Generation
    console.log("\n--- TEST SUITE 2: Live Meeting & Zoom Tickets ---");
    const teacherStartRes = await fetch(`${baseUrl}/api/meetings/ticket`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({ classId, mode: "start" }),
    });
    const teacherStartJson = await teacherStartRes.json();
    assert("Teacher can generate host start ticket (200)", teacherStartRes.status === 200 && !!teacherStartJson?.ticket);
    const studentStartRes = await fetch(`${baseUrl}/api/meetings/ticket`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ classId, mode: "start" }),
    });
    assert("Student cannot start meeting as host (403)", studentStartRes.status === 403);
    const studentJoinRes = await fetch(`${baseUrl}/api/meetings/ticket`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ classId, mode: "join" }),
    });
    const studentJoinJson = await studentJoinRes.json();
    assert("Enrolled student can generate join ticket (200)", studentJoinRes.status === 200 && !!studentJoinJson?.ticket);
    const ticketStr = studentJoinJson?.ticket;
    if (ticketStr) {
        const launcherRes = await fetch(`${baseUrl}/api/meetings/ticket/${ticketStr}`);
        const launcherText = await launcherRes.text();
        assert("Public ticket launcher resolves HTML (200)", launcherRes.status === 200 && launcherText.includes("Connecting to Live Session"));
        // Single use check
        const secondUseRes = await fetch(`${baseUrl}/api/meetings/ticket/${ticketStr}`);
        assert("Ticket is single-use / invalidated on use (410)", secondUseRes.status === 410);
    }
    // 4. Class Attendance Module
    console.log("\n--- TEST SUITE 3: Class Attendance Module ---");
    const attendanceRes = await fetch(`${baseUrl}/api/attendance`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
            classId,
            date: new Date().toISOString(),
            sessionTitle: "Regression Physics Session 1",
            sessionType: "lecture",
            records: [
                { studentId: studentUser._id.toString(), status: "present", note: "On time" },
            ],
            notes: "First automated session attendance",
        }),
    });
    assert("Teacher can mark attendance (201)", attendanceRes.status === 201, `Status: ${attendanceRes.status}`);
    const studentAttendancePost = await fetch(`${baseUrl}/api/attendance`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({
            classId,
            date: new Date().toISOString(),
            sessionTitle: "Illegal Session",
            records: [],
        }),
    });
    assert("Student cannot mark attendance (403)", studentAttendancePost.status === 403);
    const classAttendanceRes = await fetch(`${baseUrl}/api/attendance/class/${classId}`, {
        headers: teacherHeaders,
    });
    const classAttendanceJson = await classAttendanceRes.json();
    assert("Teacher can view class attendance roster (200)", classAttendanceRes.status === 200 && classAttendanceJson?.data?.length > 0);
    const studentMyAttendanceRes = await fetch(`${baseUrl}/api/attendance/my?classId=${classId}`, {
        headers: studentHeaders,
    });
    const studentMyAttendanceJson = await studentMyAttendanceRes.json();
    assert("Student can view own attendance stats (200)", studentMyAttendanceRes.status === 200 &&
        studentMyAttendanceJson?.stats?.attendanceRate === 100 &&
        studentMyAttendanceJson?.sessions?.length > 0);
    // 5. Exam Results & Reports Module
    console.log("\n--- TEST SUITE 4: Exam Results & Grades Module ---");
    const examRes = await fetch(`${baseUrl}/api/grades`, {
        method: "POST",
        headers: teacherHeaders,
        body: JSON.stringify({
            classId,
            examTitle: "Midterm Mechanics Assessment",
            examDate: new Date().toISOString(),
            termOrMonth: "Term 1",
            maxMarks: 100,
            passMarks: 40,
            isPublished: true,
            scores: [
                { studentId: studentUser._id.toString(), marksObtained: 88, remarks: "Outstanding problem solving" },
            ],
            notes: "Graded via standard rubrics",
        }),
    });
    assert("Teacher can record exam grades (201)", examRes.status === 201, `Status: ${examRes.status}`);
    const examJson = await examRes.json();
    const examId = examJson?.data?._id;
    const studentGradePost = await fetch(`${baseUrl}/api/grades`, {
        method: "POST",
        headers: studentHeaders,
        body: JSON.stringify({ classId, examTitle: "Fake Exam", examDate: new Date().toISOString(), scores: [] }),
    });
    assert("Student cannot record grades (403)", studentGradePost.status === 403);
    const studentMyGradesRes = await fetch(`${baseUrl}/api/grades/my?classId=${classId}`, {
        headers: studentHeaders,
    });
    const studentMyGradesJson = await studentMyGradesRes.json();
    assert("Student can view their own exam report card (200)", studentMyGradesRes.status === 200 &&
        studentMyGradesJson?.data?.[0]?.myScore?.grade === "A+" &&
        studentMyGradesJson?.data?.[0]?.myScore?.percentage === 88);
    if (examId) {
        const exportRes = await fetch(`${baseUrl}/api/grades/export/${examId}`, {
            headers: teacherHeaders,
        });
        const exportText = await exportRes.text();
        assert("Teacher can export grade sheet CSV (200)", exportRes.status === 200 && exportText.includes("Midterm Mechanics Assessment"));
    }
    // 6. White-label Platform Branding
    console.log("\n--- TEST SUITE 5: White-label Platform Branding ---");
    const publicConfigRes = await fetch(`${baseUrl}/api/system/config`);
    const publicConfigJson = await publicConfigRes.json();
    assert("Public system config returns 200", publicConfigRes.status === 200);
    assert("Public system config has Cache-Control header", !!publicConfigRes.headers.get("cache-control"));
    assert("Public config returns platformName NexvoLearn", publicConfigJson?.data?.platformName === "NexvoLearn");
    const studentConfigUpdate = await fetch(`${baseUrl}/api/system/config`, {
        method: "PUT",
        headers: studentHeaders,
        body: JSON.stringify({ platformName: "HackedPlatform" }),
    });
    assert("Student cannot update branding config (403)", studentConfigUpdate.status === 403);
    const teacherConfigUpdate = await fetch(`${baseUrl}/api/system/config`, {
        method: "PUT",
        headers: teacherHeaders,
        body: JSON.stringify({ slogan: "Empowering Minds Everywhere" }),
    });
    assert("Teacher with branding.manage can update branding config (200)", teacherConfigUpdate.status === 200);
    // 7. Payment Webhook Fulfillment Lifecycle Tests
    console.log("\n--- TEST SUITE 6: Payment Webhook Fulfillment ---");
    await Transaction_1.Transaction.create({
        user_id: studentUser?._id,
        class_id: classId,
        month_key: "2026-09",
        gateway: "stripe",
        amount: 1500,
        currency: "LKR",
        status: "pending",
    });
    // Call webhook endpoint
    const webhookSimRes = await fetch(`${baseUrl}/api/payments/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            data: {
                object: {
                    id: "txn_test_regression_123",
                    metadata: {
                        userId: studentUser?._id.toString(),
                        classId: classId,
                        monthKey: "2026-09",
                    },
                },
            },
            type: "checkout.session.completed",
        }),
    });
    assert("Payment webhook returns 200", webhookSimRes.status === 200);
    // Verify DB state after fulfillment
    const updatedEntitlement = await ClassEntitlement_1.ClassEntitlement.findOne({
        class_id: classId,
        user_id: studentUser?._id,
        month_key: "2026-09",
    });
    const updatedEnrollment = await ClassEnrollment_1.ClassEnrollment.findOne({
        classId: classId,
        userId: studentUser?._id,
    });
    const classDocAfter = await Class_1.Class.findById(classId);
    const studentDocAfter = await User_1.User.findById(studentUser?._id).populate("role_ids");
    assert("Class entitlement is granted on payment fulfillment", !!updatedEntitlement);
    assert("Class enrollment is active on payment fulfillment", updatedEnrollment?.status === "active");
    assert("Class enrolled_students includes student", classDocAfter?.enrolled_students?.some((id) => id.toString() === studentUser?._id.toString()) || false);
    assert("User role includes Student", studentDocAfter?.role_ids?.some((r) => r.name?.toLowerCase() === "student") || false);
    // Clean up test class & records
    await Class_1.Class.deleteOne({ _id: classId });
    await ClassEnrollment_1.ClassEnrollment.deleteMany({ classId });
    await Transaction_1.Transaction.deleteMany({ class_id: classId });
    await ClassEntitlement_1.ClassEntitlement.deleteMany({ class_id: classId });
    console.log("\n==================================================");
    console.log(`REGRESSION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("==================================================");
    server.close();
    await mongoose_1.default.disconnect();
    process.exit(failedTests > 0 ? 1 : 0);
}
runRegression().catch((err) => {
    console.error("FATAL ERROR running regression suite:", err);
    process.exit(1);
});
