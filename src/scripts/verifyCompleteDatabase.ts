import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { RolePermission } from '../models/RolePermission';
import { Subject } from '../models/Subject';
import { Grade } from '../models/Grade';
import { Class } from '../models/Class';
import { ClassEnrollment } from '../models/ClassEnrollment';
import { ClassEntitlement } from '../models/ClassEntitlement';
import { ClassApplication } from '../models/ClassApplication';
import { DeliveryOrder } from '../models/DeliveryOrder';
import { Assignment } from '../models/Assignment';
import { AssignmentSubmission } from '../models/AssignmentSubmission';
import { Quiz } from '../models/Quiz';
import { QuizQuestion } from '../models/QuizQuestion';
import { QuizSubmission } from '../models/QuizSubmission';
import { Assessment } from '../models/Assessment';
import { AssessmentQuestion } from '../models/AssessmentQuestion';
import { AssessmentSubmission } from '../models/AssessmentSubmission';
import { AssessmentMatch } from '../models/AssessmentMatch';
import { ChallengeMatch } from '../models/ChallengeMatch';
import { UserAssessmentStats } from '../models/UserAssessmentStats';
import { UserPerformance } from '../models/UserPerformance';
import { AttendanceRecord } from '../models/AttendanceRecord';
import { ExamResult } from '../models/ExamResult';
import { MeetingTicket } from '../models/MeetingTicket';
import { Recording } from '../models/Recording';
import { Transaction } from '../models/Transaction';
import { File } from '../models/File';
import { TenantSettings } from '../models/TenantSettings';
import { SiteSettings } from '../models/SiteSettings';
import { OTP } from '../models/OTP';
import { Product } from '../models/Product';
import { StoreOrder } from '../models/StoreOrder';
import { Exam } from '../models/Exam';
import { StudyPack } from '../models/StudyPack';

async function verifyAllModules() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms');
  console.log('Connected to DB. Starting comprehensive module-by-module validation...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. RBAC & Permissions
  console.log('--- 1. RBAC & Permissions ---');
  const roleCount = await Role.countDocuments();
  const permCount = await Permission.countDocuments();
  const rolePermCount = await RolePermission.countDocuments();
  assert(roleCount >= 4, `Roles seeded (found ${roleCount})`);
  assert(permCount >= 30, `Canonical permissions seeded (found ${permCount})`);
  assert(rolePermCount > 100, `Role-permission mappings seeded (found ${rolePermCount})`);

  // 2. Users & Profiles
  console.log('\n--- 2. Users & Student Profiles ---');
  const admin = await User.findOne({ email: 'admin@lms.com' }).populate('role_ids');
  assert(!!admin, 'Admin user exists');
  assert(admin?.role_ids && (admin.role_ids as any).length > 0, 'Admin has assigned role_ids');
  const validAdminPw = await bcrypt.compare('password123', (admin as any).password_hash || '');
  assert(validAdminPw, 'Admin password hash verifies correctly with bcrypt');

  const alice = await User.findOne({ email: 'student@lms.com' });
  assert(!!alice, 'Student Alice exists');
  const aliceProfile = await StudentProfile.findOne({ user_id: alice?._id });
  assert(!!aliceProfile && aliceProfile.school === 'Visakha Vidyalaya', 'Alice student profile has valid school data');

  const otp = await OTP.findOne({ email: 'newstudent@lms.com' });
  assert(!!otp && otp.otp === '654321', 'OTP verification record exists');

  // 3. Subjects & Grades
  console.log('\n--- 3. Subjects & Grades ---');
  const math = await Subject.findOne({ name: 'Mathematics' });
  const grade12 = await Grade.findOne({ name: 'Grade 12' });
  assert(!!math, 'Subject Mathematics exists');
  assert(!!grade12, 'Grade 12 exists');

  // 4. Classes & Enrolments & Entitlements
  console.log('\n--- 4. Classes, Enrolments & Entitlements ---');
  const classes = await Class.find().populate('subject grade tutor enrolled_students');
  assert(classes.length >= 4, `Classes seeded with populated relationships (found ${classes.length})`);
  const mathClass = classes.find(c => c.title.includes('Combined Mathematics'));
  assert(!!mathClass && mathClass.class_code === 'CLS-0001', 'Math class has enterprise sequential code CLS-0001');
  assert(mathClass?.enrolled_students.length >= 2, 'Math class has enrolled students');

  const enrollments = await ClassEnrollment.find({ classId: mathClass?._id });
  assert(enrollments.length >= 2, `ClassEnrollment records created for math class (${enrollments.length})`);

  const entitlements = await ClassEntitlement.find({ class_id: mathClass?._id, month_key: '2026-10' });
  assert(entitlements.length >= 2, `Active October 2026 ClassEntitlement records found (${entitlements.length})`);

  // 5. Applications & Delivery Orders
  console.log('\n--- 5. Class Applications & Delivery Orders ---');
  const applications = await ClassApplication.find();
  assert(applications.length >= 3, `ClassApplication records seeded (${applications.length})`);
  const approvedApp = applications.find(a => a.status === 'approved');
  assert(!!approvedApp, 'Approved ClassApplication exists');

  const deliveryOrders = await DeliveryOrder.find();
  assert(deliveryOrders.length >= 2, `DeliveryOrder physical tute shipments seeded (${deliveryOrders.length})`);

  // 6. Coursework & Submissions
  console.log('\n--- 6. Assignments & Submissions ---');
  const assignments = await Assignment.find();
  assert(assignments.length >= 2, `Assignments seeded (${assignments.length})`);
  const submissions = await AssignmentSubmission.find();
  assert(submissions.length >= 3, `AssignmentSubmissions seeded (${submissions.length})`);
  const gradedSub = submissions.find(s => s.status === 'graded');
  assert(!!gradedSub && gradedSub.grade === 96, 'Graded assignment submission verified with score 96');

  // 7. Quizzes, Questions & Submissions
  console.log('\n--- 7. Quizzes & Submissions ---');
  const quiz = await Quiz.findOne();
  assert(!!quiz, 'Quiz seeded');
  const questions = await QuizQuestion.find({ quiz_id: quiz?._id });
  assert(questions.length >= 5, `Quiz questions seeded (${questions.length})`);
  const quizSubs = await QuizSubmission.find({ quiz_id: quiz?._id });
  assert(quizSubs.length >= 2, `Quiz submissions completed by students (${quizSubs.length})`);

  // 8. Assessments & Peer Arena (1v1)
  console.log('\n--- 8. Assessments, 1v1 Arena & ELO ---');
  const assessment = await Assessment.findOne();
  assert(!!assessment, 'Assessment seeded');
  const aQuestions = await AssessmentQuestion.find({ assessment_id: assessment?._id } as any);
  assert(aQuestions.length >= 3, `Assessment questions seeded (${aQuestions.length})`);
  const aSubmissions = await AssessmentSubmission.find({ assessment_id: assessment?._id } as any);
  assert(aSubmissions.length >= 2, `Assessment submissions seeded (${aSubmissions.length})`);
  const aMatch = await AssessmentMatch.findOne({ assessment_id: assessment?._id } as any);
  assert(!!aMatch && aMatch.status === 'completed', 'AssessmentMatch completed');
  const challengeMatch = await ChallengeMatch.findOne({ status: 'completed' });
  assert(!!challengeMatch && challengeMatch.p1_score_pct === 100, 'ChallengeMatch 1v1 completed with scores');
  const eloStats = await UserAssessmentStats.find();
  assert(eloStats.length >= 2, `UserAssessmentStats ELO rankings tracked (${eloStats.length})`);
  const perf = await UserPerformance.find();
  assert(perf.length >= 2, `UserPerformance analytical records found (${perf.length})`);

  // 9. Attendance & Exam Results
  console.log('\n--- 9. Attendance & Exam Results ---');
  const attendance = await AttendanceRecord.find();
  assert(attendance.length >= 3, `Attendance registers recorded (${attendance.length})`);
  const exams = await ExamResult.find();
  assert(exams.length >= 2, `Exam results report cards recorded (${exams.length})`);

  // 10. Financial Transactions
  console.log('\n--- 10. Financial Transactions ---');
  const txns = await Transaction.find();
  assert(txns.length >= 4, `Financial transactions recorded across Stripe/PayHere/Manual (${txns.length})`);

  // 11. Recordings & Meeting Tickets
  console.log('\n--- 11. Recordings & Zoom Meeting Tickets ---');
  const recordings = await Recording.find();
  assert(recordings.length >= 3, `Class recordings available (${recordings.length})`);
  const tickets = await MeetingTicket.find();
  assert(tickets.length >= 2, `Single-use meeting launch tickets generated (${tickets.length})`);

  // 12. Storage Files
  console.log('\n--- 12. Governed File Storage ---');
  const files = await File.find();
  assert(files.length >= 3, `Governed files registered (${files.length})`);

  // 13. Tenant & Site Settings
  console.log('\n--- 13. White-Label Branding & CMS Settings ---');
  const tenant = await TenantSettings.findOne({ platformName: 'NexvoLearn' });
  assert(!!tenant && tenant.instructorName === 'Danidu Lokuliyana', 'TenantSettings active');
  const site = await SiteSettings.findOne();
  assert(!!site && site.site?.name === 'NexvoLearn', 'SiteSettings CMS configuration active');

  // 14. Academic Store & Products
  console.log('\n--- 14. Academic Store Products & Orders ---');
  const products = await Product.find();
  assert(products.length >= 4, `Store products active in catalog (${products.length})`);
  const storeOrders = await StoreOrder.find();
  assert(storeOrders.length >= 2, `Store purchase orders completed (${storeOrders.length})`);

  // 15. Structured Paper Exams
  console.log('\n--- 15. Paper Exams & Evaluations ---');
  const paperExams = await Exam.find();
  assert(paperExams.length >= 2, `Structured paper exams created (${paperExams.length})`);

  // 16. Digital Study Packs (Past Recordings, Videos & PDFs)
  console.log('\n--- 16. Digital Study Packs (Recordings, Videos & PDFs) ---');
  const digitalPacks = await StudyPack.find();
  assert(digitalPacks.length >= 2, `Digital study packs created (${digitalPacks.length})`);
  const packWithRecordings = await StudyPack.findOne({ recordings: { $exists: true, $not: { $size: 0 } } });
  assert(!!packWithRecordings, 'Digital study pack linked with past class lecture recordings');
  assert(packWithRecordings?.custom_videos?.length! > 0, 'Digital study pack contains video lessons');
  assert(packWithRecordings?.materials?.length! > 0, 'Digital study pack contains PDF study materials');

  console.log('\n==========================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==========================================================');

  await mongoose.disconnect();
  if (failed > 0) {
    process.exit(1);
  }
}

verifyAllModules().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
