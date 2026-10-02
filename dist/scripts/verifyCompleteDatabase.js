"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
dotenv_1.default.config();
const User_1 = require("../models/User");
const StudentProfile_1 = require("../models/StudentProfile");
const Role_1 = require("../models/Role");
const Permission_1 = require("../models/Permission");
const RolePermission_1 = require("../models/RolePermission");
const Subject_1 = require("../models/Subject");
const Grade_1 = require("../models/Grade");
const Class_1 = require("../models/Class");
const ClassEnrollment_1 = require("../models/ClassEnrollment");
const ClassEntitlement_1 = require("../models/ClassEntitlement");
const ClassApplication_1 = require("../models/ClassApplication");
const DeliveryOrder_1 = require("../models/DeliveryOrder");
const Assignment_1 = require("../models/Assignment");
const AssignmentSubmission_1 = require("../models/AssignmentSubmission");
const Quiz_1 = require("../models/Quiz");
const QuizQuestion_1 = require("../models/QuizQuestion");
const QuizSubmission_1 = require("../models/QuizSubmission");
const Assessment_1 = require("../models/Assessment");
const AssessmentQuestion_1 = require("../models/AssessmentQuestion");
const AssessmentSubmission_1 = require("../models/AssessmentSubmission");
const AssessmentMatch_1 = require("../models/AssessmentMatch");
const ChallengeMatch_1 = require("../models/ChallengeMatch");
const UserAssessmentStats_1 = require("../models/UserAssessmentStats");
const UserPerformance_1 = require("../models/UserPerformance");
const AttendanceRecord_1 = require("../models/AttendanceRecord");
const ExamResult_1 = require("../models/ExamResult");
const MeetingTicket_1 = require("../models/MeetingTicket");
const Recording_1 = require("../models/Recording");
const Transaction_1 = require("../models/Transaction");
const File_1 = require("../models/File");
const TenantSettings_1 = require("../models/TenantSettings");
const SiteSettings_1 = require("../models/SiteSettings");
const OTP_1 = require("../models/OTP");
const Product_1 = require("../models/Product");
const StoreOrder_1 = require("../models/StoreOrder");
const Exam_1 = require("../models/Exam");
const StudyPack_1 = require("../models/StudyPack");
async function verifyAllModules() {
    await mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms');
    console.log('Connected to DB. Starting comprehensive module-by-module validation...\n');
    let passed = 0;
    let failed = 0;
    function assert(condition, msg) {
        if (condition) {
            console.log(`  ✓ ${msg}`);
            passed++;
        }
        else {
            console.error(`  ✗ FAIL: ${msg}`);
            failed++;
        }
    }
    // 1. RBAC & Permissions
    console.log('--- 1. RBAC & Permissions ---');
    const roleCount = await Role_1.Role.countDocuments();
    const permCount = await Permission_1.Permission.countDocuments();
    const rolePermCount = await RolePermission_1.RolePermission.countDocuments();
    assert(roleCount >= 4, `Roles seeded (found ${roleCount})`);
    assert(permCount >= 30, `Canonical permissions seeded (found ${permCount})`);
    assert(rolePermCount > 100, `Role-permission mappings seeded (found ${rolePermCount})`);
    // 2. Users & Profiles
    console.log('\n--- 2. Users & Student Profiles ---');
    const admin = await User_1.User.findOne({ email: 'admin@lms.com' }).populate('role_ids');
    assert(!!admin, 'Admin user exists');
    assert(admin?.role_ids && admin.role_ids.length > 0, 'Admin has assigned role_ids');
    const validAdminPw = await bcrypt_1.default.compare('password123', admin.password_hash || '');
    assert(validAdminPw, 'Admin password hash verifies correctly with bcrypt');
    const alice = await User_1.User.findOne({ email: 'student@lms.com' });
    assert(!!alice, 'Student Alice exists');
    const aliceProfile = await StudentProfile_1.StudentProfile.findOne({ user_id: alice?._id });
    assert(!!aliceProfile && aliceProfile.school === 'Visakha Vidyalaya', 'Alice student profile has valid school data');
    const otp = await OTP_1.OTP.findOne({ email: 'newstudent@lms.com' });
    assert(!!otp && otp.otp === '654321', 'OTP verification record exists');
    // 3. Subjects & Grades
    console.log('\n--- 3. Subjects & Grades ---');
    const math = await Subject_1.Subject.findOne({ name: 'Mathematics' });
    const grade12 = await Grade_1.Grade.findOne({ name: 'Grade 12' });
    assert(!!math, 'Subject Mathematics exists');
    assert(!!grade12, 'Grade 12 exists');
    // 4. Classes & Enrolments & Entitlements
    console.log('\n--- 4. Classes, Enrolments & Entitlements ---');
    const classes = await Class_1.Class.find().populate('subject grade tutor enrolled_students');
    assert(classes.length >= 4, `Classes seeded with populated relationships (found ${classes.length})`);
    const mathClass = classes.find(c => c.title.includes('Combined Mathematics'));
    assert(!!mathClass && mathClass.class_code === 'CLS-0001', 'Math class has enterprise sequential code CLS-0001');
    assert(mathClass?.enrolled_students.length >= 2, 'Math class has enrolled students');
    const enrollments = await ClassEnrollment_1.ClassEnrollment.find({ classId: mathClass?._id });
    assert(enrollments.length >= 2, `ClassEnrollment records created for math class (${enrollments.length})`);
    const entitlements = await ClassEntitlement_1.ClassEntitlement.find({ class_id: mathClass?._id, month_key: '2026-10' });
    assert(entitlements.length >= 2, `Active October 2026 ClassEntitlement records found (${entitlements.length})`);
    // 5. Applications & Delivery Orders
    console.log('\n--- 5. Class Applications & Delivery Orders ---');
    const applications = await ClassApplication_1.ClassApplication.find();
    assert(applications.length >= 3, `ClassApplication records seeded (${applications.length})`);
    const approvedApp = applications.find(a => a.status === 'approved');
    assert(!!approvedApp, 'Approved ClassApplication exists');
    const deliveryOrders = await DeliveryOrder_1.DeliveryOrder.find();
    assert(deliveryOrders.length >= 2, `DeliveryOrder physical tute shipments seeded (${deliveryOrders.length})`);
    // 6. Coursework & Submissions
    console.log('\n--- 6. Assignments & Submissions ---');
    const assignments = await Assignment_1.Assignment.find();
    assert(assignments.length >= 2, `Assignments seeded (${assignments.length})`);
    const submissions = await AssignmentSubmission_1.AssignmentSubmission.find();
    assert(submissions.length >= 3, `AssignmentSubmissions seeded (${submissions.length})`);
    const gradedSub = submissions.find(s => s.status === 'graded');
    assert(!!gradedSub && gradedSub.grade === 96, 'Graded assignment submission verified with score 96');
    // 7. Quizzes, Questions & Submissions
    console.log('\n--- 7. Quizzes & Submissions ---');
    const quiz = await Quiz_1.Quiz.findOne();
    assert(!!quiz, 'Quiz seeded');
    const questions = await QuizQuestion_1.QuizQuestion.find({ quiz_id: quiz?._id });
    assert(questions.length >= 5, `Quiz questions seeded (${questions.length})`);
    const quizSubs = await QuizSubmission_1.QuizSubmission.find({ quiz_id: quiz?._id });
    assert(quizSubs.length >= 2, `Quiz submissions completed by students (${quizSubs.length})`);
    // 8. Assessments & Peer Arena (1v1)
    console.log('\n--- 8. Assessments, 1v1 Arena & ELO ---');
    const assessment = await Assessment_1.Assessment.findOne();
    assert(!!assessment, 'Assessment seeded');
    const aQuestions = await AssessmentQuestion_1.AssessmentQuestion.find({ assessment_id: assessment?._id });
    assert(aQuestions.length >= 3, `Assessment questions seeded (${aQuestions.length})`);
    const aSubmissions = await AssessmentSubmission_1.AssessmentSubmission.find({ assessment_id: assessment?._id });
    assert(aSubmissions.length >= 2, `Assessment submissions seeded (${aSubmissions.length})`);
    const aMatch = await AssessmentMatch_1.AssessmentMatch.findOne({ assessment_id: assessment?._id });
    assert(!!aMatch && aMatch.status === 'completed', 'AssessmentMatch completed');
    const challengeMatch = await ChallengeMatch_1.ChallengeMatch.findOne({ status: 'completed' });
    assert(!!challengeMatch && challengeMatch.p1_score_pct === 100, 'ChallengeMatch 1v1 completed with scores');
    const eloStats = await UserAssessmentStats_1.UserAssessmentStats.find();
    assert(eloStats.length >= 2, `UserAssessmentStats ELO rankings tracked (${eloStats.length})`);
    const perf = await UserPerformance_1.UserPerformance.find();
    assert(perf.length >= 2, `UserPerformance analytical records found (${perf.length})`);
    // 9. Attendance & Exam Results
    console.log('\n--- 9. Attendance & Exam Results ---');
    const attendance = await AttendanceRecord_1.AttendanceRecord.find();
    assert(attendance.length >= 3, `Attendance registers recorded (${attendance.length})`);
    const exams = await ExamResult_1.ExamResult.find();
    assert(exams.length >= 2, `Exam results report cards recorded (${exams.length})`);
    // 10. Financial Transactions
    console.log('\n--- 10. Financial Transactions ---');
    const txns = await Transaction_1.Transaction.find();
    assert(txns.length >= 4, `Financial transactions recorded across Stripe/PayHere/Manual (${txns.length})`);
    // 11. Recordings & Meeting Tickets
    console.log('\n--- 11. Recordings & Zoom Meeting Tickets ---');
    const recordings = await Recording_1.Recording.find();
    assert(recordings.length >= 3, `Class recordings available (${recordings.length})`);
    const tickets = await MeetingTicket_1.MeetingTicket.find();
    assert(tickets.length >= 2, `Single-use meeting launch tickets generated (${tickets.length})`);
    // 12. Storage Files
    console.log('\n--- 12. Governed File Storage ---');
    const files = await File_1.File.find();
    assert(files.length >= 3, `Governed files registered (${files.length})`);
    // 13. Tenant & Site Settings
    console.log('\n--- 13. White-Label Branding & CMS Settings ---');
    const tenant = await TenantSettings_1.TenantSettings.findOne({ platformName: 'NexvoLearn' });
    assert(!!tenant && tenant.instructorName === 'Danidu Lokuliyana', 'TenantSettings active');
    const site = await SiteSettings_1.SiteSettings.findOne();
    assert(!!site && site.site?.name === 'NexvoLearn', 'SiteSettings CMS configuration active');
    // 14. Academic Store & Products
    console.log('\n--- 14. Academic Store Products & Orders ---');
    const products = await Product_1.Product.find();
    assert(products.length >= 4, `Store products active in catalog (${products.length})`);
    const storeOrders = await StoreOrder_1.StoreOrder.find();
    assert(storeOrders.length >= 2, `Store purchase orders completed (${storeOrders.length})`);
    // 15. Structured Paper Exams
    console.log('\n--- 15. Paper Exams & Evaluations ---');
    const paperExams = await Exam_1.Exam.find();
    assert(paperExams.length >= 2, `Structured paper exams created (${paperExams.length})`);
    // 16. Digital Study Packs (Past Recordings, Videos & PDFs)
    console.log('\n--- 16. Digital Study Packs (Recordings, Videos & PDFs) ---');
    const digitalPacks = await StudyPack_1.StudyPack.find();
    assert(digitalPacks.length >= 2, `Digital study packs created (${digitalPacks.length})`);
    const packWithRecordings = await StudyPack_1.StudyPack.findOne({ recordings: { $exists: true, $not: { $size: 0 } } });
    assert(!!packWithRecordings, 'Digital study pack linked with past class lecture recordings');
    assert(packWithRecordings?.custom_videos?.length > 0, 'Digital study pack contains video lessons');
    assert(packWithRecordings?.materials?.length > 0, 'Digital study pack contains PDF study materials');
    console.log('\n==========================================================');
    console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('==========================================================');
    await mongoose_1.default.disconnect();
    if (failed > 0) {
        process.exit(1);
    }
}
verifyAllModules().catch(err => {
    console.error('Validation error:', err);
    process.exit(1);
});
