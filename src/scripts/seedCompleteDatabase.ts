import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { config } from "../config/env";

import { User } from "../models/User";
import { StudentProfile } from "../models/StudentProfile";
import { Role } from "../models/Role";
import { Permission } from "../models/Permission";
import { RolePermission } from "../models/RolePermission";
import { OTP } from "../models/OTP";

import { Subject } from "../models/Subject";
import { Grade } from "../models/Grade";
import { Class } from "../models/Class";
import { ClassEnrollment } from "../models/ClassEnrollment";
import { ClassEntitlement } from "../models/ClassEntitlement";
import { ClassApplication } from "../models/ClassApplication";
import { DeliveryOrder } from "../models/DeliveryOrder";

import { Assignment } from "../models/Assignment";
import { AssignmentSubmission } from "../models/AssignmentSubmission";

import { Quiz } from "../models/Quiz";
import { QuizQuestion } from "../models/QuizQuestion";
import { QuizSubmission } from "../models/QuizSubmission";

import { Assessment } from "../models/Assessment";
import { AssessmentQuestion } from "../models/AssessmentQuestion";
import { AssessmentSubmission } from "../models/AssessmentSubmission";
import { AssessmentMatch } from "../models/AssessmentMatch";
import { ChallengeMatch } from "../models/ChallengeMatch";
import { UserAssessmentStats } from "../models/UserAssessmentStats";
import { UserPerformance } from "../models/UserPerformance";

import { AttendanceRecord } from "../models/AttendanceRecord";
import { ExamResult } from "../models/ExamResult";
import { MeetingTicket } from "../models/MeetingTicket";
import { Recording } from "../models/Recording";
import { Transaction } from "../models/Transaction";
import { File } from "../models/File";
import { TenantSettings } from "../models/TenantSettings";
import { SiteSettings } from "../models/SiteSettings";
import { Product } from "../models/Product";
import { StoreOrder } from "../models/StoreOrder";
import { Exam } from "../models/Exam";
import { StudyPack } from "../models/StudyPack";

import { seedPermissionsAndRoles } from "./seedPermissions";

export async function seedCompleteLmsDatabase() {
  console.log("==========================================================");
  console.log("🌱 STARTING COMPREHENSIVE END-TO-END DATA SEEDING (ALL MODULES)");
  console.log("==========================================================");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongoUri || "mongodb://127.0.0.1:27017/lms");
  }

  // 1. CLEAR COLLECTIONS TO BUILD A FRESH, COHERENT KNOWLEDGE GRAPH
  console.log("1. Cleaning old collections...");
  await Promise.all([
    User.deleteMany({}),
    StudentProfile.deleteMany({}),
    Role.deleteMany({}),
    Permission.deleteMany({}),
    RolePermission.deleteMany({}),
    OTP.deleteMany({}),
    Subject.deleteMany({}),
    Grade.deleteMany({}),
    Class.deleteMany({}),
    ClassEnrollment.deleteMany({}),
    ClassEntitlement.deleteMany({}),
    ClassApplication.deleteMany({}),
    DeliveryOrder.deleteMany({}),
    Assignment.deleteMany({}),
    AssignmentSubmission.deleteMany({}),
    Quiz.deleteMany({}),
    QuizQuestion.deleteMany({}),
    QuizSubmission.deleteMany({}),
    Assessment.deleteMany({}),
    AssessmentQuestion.deleteMany({}),
    AssessmentSubmission.deleteMany({}),
    AssessmentMatch.deleteMany({}),
    ChallengeMatch.deleteMany({}),
    UserAssessmentStats.deleteMany({}),
    UserPerformance.deleteMany({}),
    AttendanceRecord.deleteMany({}),
    ExamResult.deleteMany({}),
    MeetingTicket.deleteMany({}),
    Recording.deleteMany({}),
    Transaction.deleteMany({}),
    File.deleteMany({}),
    TenantSettings.deleteMany({}),
    SiteSettings.deleteMany({}),
    Product.deleteMany({}),
    StoreOrder.deleteMany({}),
    Exam.deleteMany({}),
    StudyPack.deleteMany({}),
  ]);
  console.log("   ✓ Collections reset successfully.");

  // 2. SEED CANONICAL PERMISSIONS & ROLES FIRST
  console.log("2. Seeding RBAC Permissions & Roles...");
  await seedPermissionsAndRoles();
  const teacherRole = await Role.findOne({ name: "Teacher" });
  const studentRole = await Role.findOne({ name: "Student" });
  const adminRole = await Role.findOne({ name: "Admin" });
  const moderatorRole = await Role.findOne({ name: "Moderator" });
  console.log("   ✓ RBAC Roles and Permissions initialized.");

  // 3. CREATE USERS & STUDENT PROFILES
  console.log("3. Creating rich user roster (Admin, Teachers, Students, Moderator)...");
  const defaultPassword = await bcrypt.hash("password123", 10);

  // Admin
  const adminUser = await User.create({
    first_name: "Eleanor",
    last_name: "Vance",
    email: "admin@lms.com",
    phone: "+94770000001",
    password_hash: defaultPassword,
    is_verified: true,
    role_ids: [adminRole?._id, teacherRole?._id],
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  });

  // Teachers
  const teacherDanidu = await User.create({
    first_name: "Danidu",
    last_name: "Lokuliyana",
    email: "teacher@lms.com",
    phone: "+94770000002",
    password_hash: defaultPassword,
    is_verified: true,
    role_ids: [teacherRole?._id],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  });

  const teacherSarah = await User.create({
    first_name: "Sarah",
    last_name: "Perera",
    email: "sarah.teacher@lms.com",
    phone: "+94770000003",
    password_hash: defaultPassword,
    is_verified: true,
    role_ids: [teacherRole?._id],
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  });

  // Moderator
  const moderatorMark = await User.create({
    first_name: "Marcus",
    last_name: "Aurelius",
    email: "moderator@lms.com",
    phone: "+94770000004",
    password_hash: defaultPassword,
    is_verified: true,
    role_ids: [moderatorRole?._id],
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
  });

  // Students (Multiple real student profiles)
  const studentAlice = await User.create({
    first_name: "Alice",
    last_name: "Senanayake",
    email: "student@lms.com",
    phone: "+94770000005",
    password_hash: defaultPassword,
    is_verified: true,
    role_ids: [studentRole?._id],
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
  });
  await StudentProfile.create({
    user_id: studentAlice._id,
    full_name: "Alice Senanayake",
    school: "Visakha Vidyalaya",
    grade: "Grade 12",
    birth_date: new Date("2007-04-12"),
    ol_year: "2023",
    al_year: "2025",
    bio: "Passionate about pure mathematics and astrophysics.",
    qualifications: "9 As at GCE O/L",
    avatar_url: studentAlice.avatar,
  });

  const studentBob = await User.create({
    first_name: "Bob",
    last_name: "Fernando",
    email: "bob.student@lms.com",
    phone: "+94770000006",
    password_hash: defaultPassword,
    is_verified: true,
    role_ids: [studentRole?._id],
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
  });
  await StudentProfile.create({
    user_id: studentBob._id,
    full_name: "Bob Fernando",
    school: "Royal College Colombo",
    grade: "Grade 12",
    birth_date: new Date("2007-09-20"),
    ol_year: "2023",
    al_year: "2025",
    bio: "Interested in robotics and mechanics.",
    qualifications: "District rank 12 O/L",
    avatar_url: studentBob.avatar,
  });

  const studentCharlie = await User.create({
    first_name: "Charlie",
    last_name: "Dias",
    email: "charlie.student@lms.com",
    phone: "+94770000007",
    password_hash: defaultPassword,
    is_verified: true,
    role_ids: [studentRole?._id],
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
  });
  await StudentProfile.create({
    user_id: studentCharlie._id,
    full_name: "Charlie Dias",
    school: "St. Thomas College",
    grade: "Grade 11",
    birth_date: new Date("2008-01-15"),
    ol_year: "2024",
    al_year: "2026",
    bio: "Preparing for O/L mathematics and science distinction.",
    avatar_url: studentCharlie.avatar,
  });

  const studentDiana = await User.create({
    first_name: "Diana",
    last_name: "Silva",
    email: "diana.student@lms.com",
    phone: "+94770000008",
    password_hash: defaultPassword,
    is_verified: true,
    role_ids: [studentRole?._id],
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
  });
  await StudentProfile.create({
    user_id: studentDiana._id,
    full_name: "Diana Silva",
    school: "Anula Vidyalaya",
    grade: "Grade 10",
    birth_date: new Date("2009-06-30"),
    bio: "Science enthusiast and competitive math quizzer.",
    avatar_url: studentDiana.avatar,
  });

  // Also create a sample OTP record for validation flow
  await OTP.create({
    email: "newstudent@lms.com",
    otp: "654321",
    full_name: "Newbie Student",
    phone: "+94770009999",
    password_hash: defaultPassword,
  });
  console.log("   ✓ User roster and student profiles seeded.");

  // 4. SUBJECTS & GRADES
  console.log("4. Seeding curriculum Subjects and Grades...");
  const subMath = await Subject.findOneAndUpdate(
    { name: "Mathematics" },
    { $set: { is_active: true } },
    { upsert: true, returnDocument: "after" }
  );
  const subPhysics = await Subject.findOneAndUpdate(
    { name: "Physics" },
    { $set: { is_active: true } },
    { upsert: true, returnDocument: "after" }
  );
  const subScience = await Subject.findOneAndUpdate(
    { name: "Science" },
    { $set: { is_active: true } },
    { upsert: true, returnDocument: "after" }
  );
  const subChem = await Subject.findOneAndUpdate(
    { name: "Chemistry" },
    { $set: { is_active: true } },
    { upsert: true, returnDocument: "after" }
  );

  const grade10 = await Grade.findOneAndUpdate(
    { name: "Grade 10" },
    { $set: { is_active: true } },
    { upsert: true, returnDocument: "after" }
  );
  const grade11 = await Grade.findOneAndUpdate(
    { name: "Grade 11" },
    { $set: { is_active: true } },
    { upsert: true, returnDocument: "after" }
  );
  const grade12 = await Grade.findOneAndUpdate(
    { name: "Grade 12" },
    { $set: { is_active: true } },
    { upsert: true, returnDocument: "after" }
  );
  console.log("   ✓ Subjects and Grades synchronized.");

  // 5. CLASSES (Multiple active classes across grades & subjects)
  console.log("5. Creating Classes with enterprise IDs, batch schedules & Zoom configurations...");
  const classMath12 = new Class({
    title: "Combined Mathematics 2026 A/L Theory",
    description: "In-depth calculus, integration, vectors, and mechanics for 2026 A/L candidates.",
    batches: [
      { batch_name: "Saturday Morning Batch", day: "Saturday", start: "08:00 AM", end: "12:30 PM" },
      { batch_name: "Wednesday Evening Revision", day: "Wednesday", start: "05:00 PM", end: "08:00 PM" },
    ],
    format: "theory",
    type: "regular",
    subject: subMath._id,
    grade: grade12._id,
    price: 3500,
    monthly_fee: 3500,
    currency: "LKR",
    delivery_type: "both",
    has_delivery_pack: true,
    delivery_fee: 450,
    physical_location: "Rotary Hall, Nugegoda",
    zoom_meeting_id: "98273618293",
    zoom_join_url: "https://zoom.us/j/98273618293?pwd=math_secret_join",
    zoom_start_url: "https://zoom.us/s/98273618293?zak=math_host_zak",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600",
    created_by: teacherDanidu._id,
    tutor: teacherDanidu._id,
    enrolled_students: [studentAlice._id, studentBob._id],
  });
  await classMath12.save();

  const classPhysics12 = new Class({
    title: "Physics 2026 A/L Masterclass",
    description: "Wave mechanics, thermal physics, electronics, and gravitational fields.",
    batches: [
      { batch_name: "Sunday Theory Intensive", day: "Sunday", start: "08:30 AM", end: "01:00 PM" },
    ],
    format: "theory",
    type: "regular",
    subject: subPhysics._id,
    grade: grade12._id,
    price: 3200,
    monthly_fee: 3200,
    currency: "LKR",
    delivery_type: "online_only",
    has_delivery_pack: false,
    zoom_meeting_id: "87123912831",
    zoom_join_url: "https://zoom.us/j/87123912831?pwd=phys_secret_join",
    zoom_start_url: "https://zoom.us/s/87123912831?zak=phys_host_zak",
    image: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600",
    created_by: teacherSarah._id,
    tutor: teacherSarah._id,
    enrolled_students: [studentAlice._id, studentBob._id, studentCharlie._id],
  });
  await classPhysics12.save();

  const classScience11 = new Class({
    title: "O/L Science Fast-Track Revision",
    description: "Complete coverage of physics, chemistry, and biology components for GCE O/L.",
    batches: [
      { batch_name: "Friday Evening Group", day: "Friday", start: "04:30 PM", end: "07:30 PM" },
    ],
    format: "revision",
    type: "regular",
    subject: subScience._id,
    grade: grade11._id,
    price: 2500,
    monthly_fee: 2500,
    currency: "LKR",
    delivery_type: "physical_tute",
    has_delivery_pack: true,
    delivery_fee: 350,
    physical_location: "Syzygy Institute, Gampaha",
    zoom_meeting_id: "71283912091",
    zoom_join_url: "https://zoom.us/j/71283912091?pwd=sci_secret_join",
    zoom_start_url: "https://zoom.us/s/71283912091?zak=sci_host_zak",
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600",
    created_by: teacherDanidu._id,
    tutor: teacherDanidu._id,
    enrolled_students: [studentCharlie._id, studentDiana._id],
  });
  await classScience11.save();

  const classChemSeminar = new Class({
    title: "Chemistry Organic Synthesis Seminar",
    description: "Special one-day seminar covering high-yield reaction mechanisms and reagents.",
    batches: [
      { batch_name: "Special Seminar Day", day: "Sunday", start: "09:00 AM", end: "04:00 PM" },
    ],
    format: "seminar",
    type: "special",
    subject: subChem._id,
    grade: grade12._id,
    price: 1800,
    monthly_fee: 1800,
    currency: "LKR",
    delivery_type: "online_only",
    zoom_meeting_id: "61298401928",
    zoom_join_url: "https://zoom.us/j/61298401928?pwd=chem_secret_join",
    zoom_start_url: "https://zoom.us/s/61298401928?zak=chem_host_zak",
    image: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=600",
    created_by: teacherSarah._id,
    tutor: teacherSarah._id,
    enrolled_students: [studentAlice._id],
  });
  await classChemSeminar.save();
  console.log(`   ✓ Classes seeded with codes: ${classMath12.class_code}, ${classPhysics12.class_code}, ${classScience11.class_code}, ${classChemSeminar.class_code}.`);

  // 6. ENROLLMENTS & MONTHLY ENTITLEMENTS (Current & previous months)
  console.log("6. Generating unified ClassEnrollments and monthly ClassEntitlements...");
  const currentMonthKey = "2026-10";
  const prevMonthKey = "2026-09";

  const enrollmentsData = [
    { classId: classMath12._id, userId: studentAlice._id, status: "active" as const },
    { classId: classMath12._id, userId: studentBob._id, status: "active" as const },
    { classId: classPhysics12._id, userId: studentAlice._id, status: "active" as const },
    { classId: classPhysics12._id, userId: studentBob._id, status: "active" as const },
    { classId: classPhysics12._id, userId: studentCharlie._id, status: "active" as const },
    { classId: classScience11._id, userId: studentCharlie._id, status: "active" as const },
    { classId: classScience11._id, userId: studentDiana._id, status: "active" as const },
    { classId: classChemSeminar._id, userId: studentAlice._id, status: "active" as const },
  ];

  for (const enr of enrollmentsData) {
    await ClassEnrollment.create(enr);
    // Active monthly entitlement for October 2026
    await ClassEntitlement.create({
      user_id: enr.userId,
      class_id: enr.classId,
      month_key: currentMonthKey,
      source: "subscription",
      payment_ref: `PAY-TXN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      granted_at: new Date(),
    });
    // Entitlement for September 2026
    await ClassEntitlement.create({
      user_id: enr.userId,
      class_id: enr.classId,
      month_key: prevMonthKey,
      source: "subscription",
      payment_ref: `PAY-TXN-PREV-${Math.floor(Math.random() * 1000)}`,
      granted_at: new Date(Date.now() - 30 * 86400000),
    });
  }
  console.log("   ✓ Active ClassEnrollments and Entitlements created.");

  // 7. CLASS APPLICATIONS & DELIVERY ORDERS (Approved, pending, rejected)
  console.log("7. Creating ClassApplications and physical DeliveryOrders...");
  const appApproved = await ClassApplication.create({
    user_id: studentBob._id,
    class_id: classMath12._id,
    status: "approved",
    requested_month: currentMonthKey,
    supporting_document: "https://storage.googleapis.com/demo-bucket/slips/bank_slip_bob_math.pdf",
    applied_at: new Date(Date.now() - 2 * 86400000),
    approved_by: teacherDanidu._id,
    approved_at: new Date(Date.now() - 1 * 86400000),
  });

  const appPending = await ClassApplication.create({
    user_id: studentDiana._id,
    class_id: classMath12._id,
    status: "pending",
    requested_month: currentMonthKey,
    supporting_document: "https://storage.googleapis.com/demo-bucket/slips/bank_slip_diana_math.jpg",
    applied_at: new Date(),
  });

  const appRejected = await ClassApplication.create({
    user_id: studentCharlie._id,
    class_id: classChemSeminar._id,
    status: "rejected",
    requested_month: currentMonthKey,
    supporting_document: "https://storage.googleapis.com/demo-bucket/slips/invalid_receipt.png",
    applied_at: new Date(Date.now() - 5 * 86400000),
    approved_by: teacherSarah._id,
    approved_at: new Date(Date.now() - 4 * 86400000),
  });

  // Physical Delivery Order for students receiving tute packs
  await DeliveryOrder.create({
    order_id: `DEL-${Date.now().toString().slice(-6)}-101`,
    student_id: studentBob._id,
    class_id: classMath12._id,
    month_key: currentMonthKey,
    delivery_method: "Currier (Pronto Lanka)",
    shipping_address: "No. 45, Temple Road, Nugegoda",
    status: "shipped",
    created_at: new Date(Date.now() - 86400000),
  });

  await DeliveryOrder.create({
    order_id: `DEL-${Date.now().toString().slice(-6)}-102`,
    student_id: studentCharlie._id,
    class_id: classScience11._id,
    month_key: currentMonthKey,
    delivery_method: "Courier (Domex)",
    shipping_address: "12/A, Kandy Road, Yakkala",
    status: "pending_processing",
    created_at: new Date(),
  });
  console.log("   ✓ ClassApplications & DeliveryOrders created.");

  // 8. RECORDINGS (Class video playback library)
  console.log("8. Populating class lecture recordings library...");
  const rec1 = await Recording.create({
    class_id: classMath12._id,
    title: "Lesson 01: Foundations of Differential Calculus",
    provider: "drive",
    driveFileId: "1A2B3C4D5E6F7G8H9I0J",
    driveUrl: "https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view",
    video_url: "https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/preview",
    session_date: new Date(Date.now() - 14 * 86400000),
    month_key: prevMonthKey,
    batch_name: "Saturday Morning Batch",
  });

  const rec2 = await Recording.create({
    class_id: classMath12._id,
    title: "Lesson 02: Applications of Derivatives & Maxima-Minima",
    provider: "youtube",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    session_date: new Date(Date.now() - 7 * 86400000),
    month_key: currentMonthKey,
    batch_name: "Saturday Morning Batch",
  });

  const rec3 = await Recording.create({
    class_id: classPhysics12._id,
    title: "Unit 04: Mechanical Resonance & Simple Harmonic Motion",
    provider: "b2",
    storageKey: "recordings/phys12/shm_oct2026.mp4",
    video_url: "https://f002.backblazeb2.com/file/demo-lms/shm_oct2026.mp4",
    session_date: new Date(Date.now() - 4 * 86400000),
    month_key: currentMonthKey,
    batch_name: "Sunday Theory Intensive",
  });

  // Attach recording IDs to class documents
  await Class.findByIdAndUpdate(classMath12._id, { $addToSet: { recordings: [rec1._id, rec2._id] } });
  await Class.findByIdAndUpdate(classPhysics12._id, { $addToSet: { recordings: [rec3._id] } });
  console.log("   ✓ Lecture recordings seeded.");

  // 9. ASSIGNMENTS & HOMEWORK SUBMISSIONS
  console.log("9. Creating Coursework Assignments & student submissions...");
  const asgCalculus = await Assignment.create({
    class_id: classMath12._id,
    title: "Problem Set 01: Curve Sketching & Inflection Points",
    description: "Solve problems 1-15 from chapter 4. Show complete algebraic workings and submit PDF scan.",
    due_date: new Date(Date.now() + 5 * 86400000),
    urls: ["https://storage.googleapis.com/demo-bucket/assignments/pset1_calculus.pdf"],
    max_points: 100,
    created_by: teacherDanidu._id,
    is_published: true,
  });

  const asgPhysicsVectors = await Assignment.create({
    class_id: classPhysics12._id,
    title: "Laboratory Assignment: Measurement of Gravitational Acceleration (g)",
    description: "Analyze the simple pendulum data sheet and calculate experimental error percentage.",
    due_date: new Date(Date.now() - 2 * 86400000), // Past due date (for testing late submissions)
    urls: ["https://storage.googleapis.com/demo-bucket/assignments/pendulum_lab_sheet.pdf"],
    max_points: 50,
    created_by: teacherSarah._id,
    is_published: true,
  });

  // Alice submits on-time, graded with high marks
  await AssignmentSubmission.create({
    assignment_id: asgCalculus._id,
    class_id: classMath12._id,
    student_id: studentAlice._id,
    url: "https://storage.googleapis.com/demo-bucket/submissions/alice_pset1_solution.pdf",
    urls: ["https://storage.googleapis.com/demo-bucket/submissions/alice_pset1_solution.pdf"],
    file_urls: ["https://storage.googleapis.com/demo-bucket/submissions/alice_pset1_solution.pdf"],
    submission_text: "Attached is my complete solution with graphs drawn to scale.",
    note: "All 15 problems completed.",
    status: "graded",
    grade: 96,
    marks_obtained: 96,
    feedback: "Outstanding presentation and rigorous derivative justifications! Excellent work.",
    graded_by: teacherDanidu._id,
    submitted_at: new Date(Date.now() - 86400000),
  });

  // Bob submits on-time, waiting for grading
  await AssignmentSubmission.create({
    assignment_id: asgCalculus._id,
    class_id: classMath12._id,
    student_id: studentBob._id,
    url: "https://storage.googleapis.com/demo-bucket/submissions/bob_pset1_solution.pdf",
    urls: ["https://storage.googleapis.com/demo-bucket/submissions/bob_pset1_solution.pdf"],
    file_urls: ["https://storage.googleapis.com/demo-bucket/submissions/bob_pset1_solution.pdf"],
    submission_text: "Completed up to Question 14. Graph for Q15 on page 6.",
    status: "submitted",
    submitted_at: new Date(),
  });

  // Charlie submits late for physics assignment
  await AssignmentSubmission.create({
    assignment_id: asgPhysicsVectors._id,
    class_id: classPhysics12._id,
    student_id: studentCharlie._id,
    url: "https://storage.googleapis.com/demo-bucket/submissions/charlie_physics_lab.pdf",
    urls: ["https://storage.googleapis.com/demo-bucket/submissions/charlie_physics_lab.pdf"],
    file_urls: ["https://storage.googleapis.com/demo-bucket/submissions/charlie_physics_lab.pdf"],
    submission_text: "Late submission due to school athletics meet.",
    status: "late",
    submitted_at: new Date(),
  });
  console.log("   ✓ Coursework assignments & submissions seeded.");

  // 10. QUIZZES & QUESTIONS & QUIZ SUBMISSIONS (Interactive assessment engine)
  console.log("10. Seeding Quizzes, diverse Question types, and student attempt submissions...");
  const quizMath = await Quiz.create({
    title: "Calculus & Limits Speed Drill",
    instructions: "10 MCQ and Short-Answer questions. 20 minutes countdown timer.",
    created_by: teacherDanidu._id,
    class_id: classMath12._id,
    subject: subMath._id,
    difficulty: "Medium",
    time_limit_sec: 1200,
    question_count: 5,
    type: "quiz",
    is_active: true,
  });

  const q1 = await QuizQuestion.create({
    quiz_id: quizMath._id,
    type: "mcq",
    question: "Evaluate the limit: lim(x->0) [sin(5x) / x].",
    options: ["0", "1", "5", "Does not exist"],
    correct_answer: "5",
    explanation: "Standard limit identity lim(t->0) sin(t)/t = 1. Here lim 5*(sin(5x)/5x) = 5*1 = 5.",
    marks: 10,
  });

  const q2 = await QuizQuestion.create({
    quiz_id: quizMath._id,
    type: "mcq",
    question: "What is the derivative of f(x) = ln(x^3 + 1)?",
    options: ["3x^2 / (x^3 + 1)", "1 / (x^3 + 1)", "3x^2 * (x^3 + 1)", "3 / (x^3 + 1)"],
    correct_answer: "3x^2 / (x^3 + 1)",
    explanation: "By chain rule, d/dx ln(u) = (1/u) * u'. Here u' = 3x^2.",
    marks: 10,
  });

  const q3 = await QuizQuestion.create({
    quiz_id: quizMath._id,
    type: "true-false",
    question: "If a function is continuous at a point x = c, it is always differentiable at x = c.",
    options: ["True", "False"],
    correct_answer: "False",
    explanation: "Continuous functions can have sharp corners (e.g. f(x) = |x| at x = 0) where they are not differentiable.",
    marks: 10,
  });

  const q4 = await QuizQuestion.create({
    quiz_id: quizMath._id,
    type: "mcq",
    question: "Find the x-coordinate of the stationary point of f(x) = x^2 - 6x + 8.",
    options: ["2", "3", "4", "6"],
    correct_answer: "3",
    explanation: "f'(x) = 2x - 6 = 0 => x = 3.",
    marks: 10,
  });

  const q5 = await QuizQuestion.create({
    quiz_id: quizMath._id,
    type: "multiple-select",
    question: "Which of the following functions are strictly increasing for all real x > 0? (Select all that apply)",
    options: ["f(x) = e^x", "f(x) = ln(x)", "f(x) = 1/x", "f(x) = x^3"],
    correct_answer: ["f(x) = e^x", "f(x) = ln(x)", "f(x) = x^3"],
    explanation: "e^x, ln(x), and x^3 have strictly positive first derivatives for x > 0. 1/x has negative derivative -1/x^2.",
    marks: 10,
  });

  // Attach quiz to class
  await Class.findByIdAndUpdate(classMath12._id, { $addToSet: { quizzes: [quizMath._id] } });

  // Student Submissions for Math Quiz
  await QuizSubmission.create({
    user_id: studentAlice._id,
    quiz_id: quizMath._id,
    subject: "Mathematics",
    paper_title: "Calculus & Limits Speed Drill",
    answers: [
      { question_id: q1._id, answer: "5", is_correct: true, score: 10, time_ms: 12000 },
      { question_id: q2._id, answer: "3x^2 / (x^3 + 1)", is_correct: true, score: 10, time_ms: 18000 },
      { question_id: q3._id, answer: "False", is_correct: true, score: 10, time_ms: 8000 },
      { question_id: q4._id, answer: "3", is_correct: true, score: 10, time_ms: 14000 },
      { question_id: q5._id, answer: ["f(x) = e^x", "f(x) = ln(x)", "f(x) = x^3"], is_correct: true, score: 10, time_ms: 22000 },
    ],
    total_score: 50,
    total_questions: 5,
    correct_answers: 5,
    time_spent: 74, // 74 seconds
    attempt_number: 1,
    feedback_given: true,
  });

  await QuizSubmission.create({
    user_id: studentBob._id,
    quiz_id: quizMath._id,
    subject: "Mathematics",
    paper_title: "Calculus & Limits Speed Drill",
    answers: [
      { question_id: q1._id, answer: "5", is_correct: true, score: 10, time_ms: 15000 },
      { question_id: q2._id, answer: "3x^2 / (x^3 + 1)", is_correct: true, score: 10, time_ms: 25000 },
      { question_id: q3._id, answer: "True", is_correct: false, score: 0, time_ms: 10000 }, // missed
      { question_id: q4._id, answer: "3", is_correct: true, score: 10, time_ms: 19000 },
      { question_id: q5._id, answer: ["f(x) = e^x", "f(x) = x^3"], is_correct: false, score: 0, time_ms: 30000 },
    ],
    total_score: 30,
    total_questions: 5,
    correct_answers: 3,
    time_spent: 99,
    attempt_number: 1,
    feedback_given: true,
  });
  console.log("   ✓ Quizzes, questions & submissions seeded.");

  // 11. ASSESSMENTS, CHALLENGE MATCHES & ELO STATS (Peer challenge arena)
  console.log("11. Seeding Assessment peer battleground, ChallengeMatches, and ELO ratings...");
  const assessmentBattle = await Assessment.create({
    title: "1v1 Science Clash Arena",
    instructions: "Compete live head-to-head or asynchronously against peers. Fast response speed grants streak bonuses.",
    type: "challenge",
    class_id: classPhysics12._id,
    subject: "Physics",
    difficulty: "Medium",
    time_limit_sec: 300,
    question_count: 3,
    version: 1,
    matchmaking_enabled: true,
    async_enabled: true,
    created_by: teacherSarah._id,
  });

  const aq1 = await AssessmentQuestion.create({
    assessment_id: assessmentBattle._id,
    type: "mcq",
    question: "Which conserved quantity dictates the recoil velocity in firearms?",
    options: ["Kinetic Energy", "Linear Momentum", "Angular Momentum", "Total Power"],
    correct_answer: "Linear Momentum",
    explanation: "By conservation of linear momentum: m1*v1 + m2*v2 = 0.",
    marks: 10,
  });

  const aq2 = await AssessmentQuestion.create({
    assessment_id: assessmentBattle._id,
    type: "true-false",
    question: "Sound waves can propagate through an absolute vacuum.",
    options: ["True", "False"],
    correct_answer: "False",
    explanation: "Sound is a mechanical longitudinal wave requiring a physical material medium.",
    marks: 10,
  });

  const aq3 = await AssessmentQuestion.create({
    assessment_id: assessmentBattle._id,
    type: "mcq",
    question: "What is the unit of magnetic flux density?",
    options: ["Tesla (T)", "Weber (Wb)", "Henry (H)", "Farad (F)"],
    correct_answer: "Tesla (T)",
    explanation: "Magnetic flux is Weber; magnetic flux density is Tesla (Wb/m^2).",
    marks: 10,
  });

  // Assessment Submissions for Assessment Battle
  const asSubAlice = await AssessmentSubmission.create({
    user_id: studentAlice._id,
    assessment_id: assessmentBattle._id,
    subject: "Physics",
    paper_title: "1v1 Science Clash Arena",
    answers: [
      { question_id: aq1._id, answer: "Linear Momentum", is_correct: true, score: 10, time_ms: 8000 },
      { question_id: aq2._id, answer: "False", is_correct: true, score: 10, time_ms: 6000 },
      { question_id: aq3._id, answer: "Tesla (T)", is_correct: true, score: 10, time_ms: 9000 },
    ],
    total_score: 30,
    max_score: 30,
    total_questions: 3,
    correct_answers: 3,
    time_spent: 23,
    attempt_number: 1,
    feedback_given: true,
  });

  const asSubBob = await AssessmentSubmission.create({
    user_id: studentBob._id,
    assessment_id: assessmentBattle._id,
    subject: "Physics",
    paper_title: "1v1 Science Clash Arena",
    answers: [
      { question_id: aq1._id, answer: "Linear Momentum", is_correct: true, score: 10, time_ms: 12000 },
      { question_id: aq2._id, answer: "True", is_correct: false, score: 0, time_ms: 8000 },
      { question_id: aq3._id, answer: "Tesla (T)", is_correct: true, score: 10, time_ms: 11000 },
    ],
    total_score: 20,
    max_score: 30,
    total_questions: 3,
    correct_answers: 2,
    time_spent: 31,
    attempt_number: 1,
    feedback_given: true,
  });

  // Assessment Match between Alice and Bob
  await AssessmentMatch.create({
    assessment_id: assessmentBattle._id,
    mode: "live",
    status: "completed",
    p1_id: studentAlice._id,
    p2_id: studentBob._id,
    class_id: classPhysics12._id,
    requires_enrollment: true,
    question_seed: "assess_seed_7721",
    assessment_version: 1,
    time_limit_sec: 300,
    p1_submission_id: asSubAlice._id,
    p2_submission_id: asSubBob._id,
    p1_score_pct: 100,
    p2_score_pct: 66.7,
    p1_time_ms: 23000,
    p2_time_ms: 31000,
    winner: studentAlice._id,
    p1_powerups: [{ key: "fifty_fifty", at_ms: 5000, qid: aq2._id }],
    p2_powerups: [],
    p1_streak_max: 3,
    p2_streak_max: 1,
    tiebreak: "faster_time",
    p1_elo_before: 1200,
    p2_elo_before: 1200,
    p1_elo_after: 1230,
    p2_elo_after: 1170,
    started_at: new Date(Date.now() - 1800000),
    completed_at: new Date(Date.now() - 1700000),
  });

  // Completed Challenge Match between Alice and Bob
  const match1 = await ChallengeMatch.create({
    quiz_id: quizMath._id,
    mode: "live",
    status: "completed",
    p1_id: studentAlice._id,
    p2_id: studentBob._id,
    class_id: classMath12._id,
    question_seed: "seed_987213",
    quiz_version: 1,
    time_limit_sec: 120,
    p1_score_pct: 100,
    p2_score_pct: 60,
    p1_time_ms: 34000,
    p2_time_ms: 45000,
    winner: studentAlice._id,
    p1_streak_max: 5,
    p2_streak_max: 2,
    p1_elo_before: 1200,
    p2_elo_before: 1200,
    p1_elo_after: 1232,
    p2_elo_after: 1168,
    started_at: new Date(Date.now() - 3600000),
    completed_at: new Date(Date.now() - 3500000),
  });

  // Queued live challenge match waiting for opponent
  await ChallengeMatch.create({
    quiz_id: quizMath._id,
    mode: "live",
    status: "queued",
    p1_id: studentCharlie._id,
    class_id: classPhysics12._id,
    question_seed: "seed_queued_01",
    quiz_version: 1,
    time_limit_sec: 120,
    p1_elo_before: 1150,
  });

  // ELO Rating Stats for students
  await UserAssessmentStats.create({
    user_id: studentAlice._id,
    elo: 1232,
    wins: 8,
    losses: 1,
    ties: 0,
    streak: 5,
    last_played_at: new Date(),
    by_subject: [{ subject: "Mathematics", elo: 1250, wins: 5, losses: 0 }],
  });

  await UserAssessmentStats.create({
    user_id: studentBob._id,
    elo: 1168,
    wins: 4,
    losses: 4,
    ties: 1,
    streak: 0,
    last_played_at: new Date(),
    by_subject: [{ subject: "Mathematics", elo: 1160, wins: 2, losses: 3 }],
  });

  // User Performance aggregation records
  await UserPerformance.create({
    user_id: studentAlice._id,
    scope_type: "global",
    window: "lifetime",
    attempts: 12,
    sum_score: 1140,
    sum_time_sec: 620,
    average_score: 95.0,
    efficiency: 1.84,
    consistency: 0.92,
    streak: 6,
    elo: 1232,
  });

  await UserPerformance.create({
    user_id: studentBob._id,
    scope_type: "global",
    window: "lifetime",
    attempts: 9,
    sum_score: 690,
    sum_time_sec: 710,
    average_score: 76.6,
    efficiency: 0.97,
    consistency: 0.78,
    streak: 1,
    elo: 1168,
  });
  console.log("   ✓ Assessments, ChallengeMatches, and ELO stats seeded.");

  // 12. ATTENDANCE RECORDS (Live roster tracking)
  console.log("12. Recording classroom session attendance registers...");
  await AttendanceRecord.create({
    classId: classMath12._id,
    date: new Date(Date.now() - 7 * 86400000),
    sessionTitle: "Session 01: Calculus Introduction & Notation",
    sessionType: "lecture",
    markedBy: teacherDanidu._id,
    notes: "Both students attended on time and participated in live working.",
    records: [
      { studentId: studentAlice._id, status: "present", note: "Punctual, camera on" },
      { studentId: studentBob._id, status: "present", note: "Punctual" },
    ],
  });

  await AttendanceRecord.create({
    classId: classMath12._id,
    date: new Date(Date.now() - 1 * 86400000),
    sessionTitle: "Session 02: Advanced Derivatives & Tangent Normal Lines",
    sessionType: "lecture",
    markedBy: teacherDanidu._id,
    notes: "Regular weekly lecture session.",
    records: [
      { studentId: studentAlice._id, status: "present" },
      { studentId: studentBob._id, status: "late", note: "Joined 15 minutes late due to power cut" },
    ],
  });

  await AttendanceRecord.create({
    classId: classPhysics12._id,
    date: new Date(Date.now() - 3 * 86400000),
    sessionTitle: "Session 01: Simple Harmonic Motion Physics Lab",
    sessionType: "tutorial",
    markedBy: teacherSarah._id,
    records: [
      { studentId: studentAlice._id, status: "present" },
      { studentId: studentBob._id, status: "present" },
      { studentId: studentCharlie._id, status: "excused", note: "Medical note submitted" },
    ],
  });
  console.log("   ✓ Classroom session attendance registers recorded.");

  // 13. EXAM RESULTS (Term tests, monthly evaluations & report cards)
  console.log("13. Seeding Term Examination results and student report card records...");
  const examMath = await Exam.create({
    title: "September Monthly Assessment: Pure Mathematics",
    description: "Paper covered functions, limits, and trigonometry.",
    class_id: classMath12._id,
    exam_type: "paper",
    total_marks: 100,
    pass_marks: 40,
    held_date: new Date(Date.now() - 12 * 86400000),
    is_published: true,
    created_by: teacherDanidu._id,
  });

  const examPhysics = await Exam.create({
    title: "Physics Mid-Term Evaluation: Mechanics",
    description: "Rigorous analytical problem solving paper.",
    class_id: classPhysics12._id,
    exam_type: "paper",
    total_marks: 100,
    pass_marks: 40,
    held_date: new Date(Date.now() - 5 * 86400000),
    is_published: true,
    created_by: teacherSarah._id,
  });

  await ExamResult.create({
    examId: examMath._id,
    classId: classMath12._id,
    examTitle: "September Monthly Assessment: Pure Mathematics",
    examDate: new Date(Date.now() - 12 * 86400000),
    termOrMonth: "September 2026",
    maxMarks: 100,
    passMarks: 40,
    isPublished: true,
    recordedBy: teacherDanidu._id,
    notes: "Paper covered functions, limits, and trigonometry.",
    scores: [
      {
        studentId: studentAlice._id,
        marksObtained: 94,
        percentage: 94.0,
        grade: "A",
        remarks: "Distinction. Superb algebraic mastery.",
      },
      {
        studentId: studentBob._id,
        marksObtained: 72,
        percentage: 72.0,
        grade: "B",
        remarks: "Good work. Practice trigonometry reduction identities.",
      },
    ],
  });

  await ExamResult.create({
    examId: examPhysics._id,
    classId: classPhysics12._id,
    examTitle: "Physics Mid-Term Evaluation: Mechanics",
    examDate: new Date(Date.now() - 5 * 86400000),
    termOrMonth: "October 2026",
    maxMarks: 100,
    passMarks: 40,
    isPublished: true,
    recordedBy: teacherSarah._id,
    notes: "Rigorous analytical paper.",
    scores: [
      {
        studentId: studentAlice._id,
        marksObtained: 88,
        percentage: 88.0,
        grade: "A",
        remarks: "Strong conceptual understanding.",
      },
      {
        studentId: studentBob._id,
        marksObtained: 68,
        percentage: 68.0,
        grade: "C",
        remarks: "Review friction and circular motion problems.",
      },
      {
        studentId: studentCharlie._id,
        marksObtained: 81,
        percentage: 81.0,
        grade: "A",
        remarks: "Very commendable score.",
      },
    ],
  });
  console.log("   ✓ Examination results & report cards recorded.");

  // 14. TRANSACTIONS & FINANCIAL AUDIT LOGS
  console.log("14. Creating Digital payment transactions and fee records...");
  await Transaction.create({
    user_id: studentAlice._id,
    class_id: classMath12._id,
    month_key: currentMonthKey,
    gateway: "stripe",
    gateway_transaction_id: "ch_stripe_mock_alice_math_1026",
    amount: 3500,
    currency: "LKR",
    status: "success",
    created_at: new Date(Date.now() - 3 * 86400000),
  });

  await Transaction.create({
    user_id: studentBob._id,
    class_id: classPhysics12._id,
    month_key: currentMonthKey,
    gateway: "payhere",
    gateway_transaction_id: "payhere_txn_bob_phys_1026",
    amount: 3200,
    currency: "LKR",
    status: "success",
    created_at: new Date(Date.now() - 2 * 86400000),
  });

  await Transaction.create({
    user_id: studentCharlie._id,
    class_id: classScience11._id,
    month_key: currentMonthKey,
    gateway: "manual",
    amount: 2500,
    currency: "LKR",
    status: "success",
    created_at: new Date(Date.now() - 86400000),
  });

  await Transaction.create({
    user_id: studentDiana._id,
    class_id: classMath12._id,
    month_key: currentMonthKey,
    gateway: "stripe",
    amount: 3500,
    currency: "LKR",
    status: "pending",
  });
  console.log("   ✓ Financial Transactions seeded.");

  // 15. LIVE MEETING TICKETS
  console.log("15. Generating Zoom single-use meeting authorization tickets...");
  await MeetingTicket.create({
    ticket: "ticket_host_danidu_" + Date.now().toString(36),
    class_id: classMath12._id,
    user_id: teacherDanidu._id,
    mode: "start",
    join_url: classMath12.zoom_start_url,
    expires_at: new Date(Date.now() + 86400000 * 30),
  });

  await MeetingTicket.create({
    ticket: "ticket_student_alice_" + Date.now().toString(36),
    class_id: classMath12._id,
    user_id: studentAlice._id,
    mode: "join",
    join_url: classMath12.zoom_join_url,
    expires_at: new Date(Date.now() + 86400000 * 30),
  });
  console.log("   ✓ Zoom meeting launch tickets created.");

  // 16. GOVERNED FILES STORAGE METADATA
  console.log("16. Registering governed file upload records...");
  await File.create({
    ownerType: "class",
    ownerId: classMath12._id,
    filePath: "classes/math12/syllabus_overview_2026.pdf",
    previewUrl: "https://storage.googleapis.com/demo-bucket/classes/math12/syllabus.pdf",
    contentType: "application/pdf",
    size: 2451000,
  });

  await File.create({
    ownerType: "assignment",
    ownerId: asgCalculus._id,
    filePath: "assignments/calculus_pset1.pdf",
    previewUrl: "https://storage.googleapis.com/demo-bucket/assignments/pset1_calculus.pdf",
    contentType: "application/pdf",
    size: 1120000,
  });

  await File.create({
    ownerType: "other",
    filePath: "temp/expired_receipt_demo.png",
    contentType: "image/png",
    size: 450000,
    expiresAt: new Date(Date.now() - 3600000), // Expired file for storageCleaner sweep
  });
  console.log("   ✓ Storage files registered.");

  // 17. TENANT SETTINGS & SITE CONFIGURATION (White-label branding)
  console.log("17. Initializing White-label Platform Identity & CMS Page Layouts...");
  await TenantSettings.create({
    platformName: "NexvoLearn",
    instructorName: "Danidu Lokuliyana",
    slogan: "Empowering Minds Through Modern Scientific & Mathematical Education",
    contactPhone: "+94 77 123 4567",
    contactEmail: "support@nexvolearn.com",
    supportWhatsApp: "+94771234567",
    assets: {
      logoUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150",
      faviconUrl: "/favicon.ico",
      heroBannerUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200",
      loginIllustrationUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600",
      defaultAvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    },
    themeTokens: {
      primaryColor: "#4f46e5",
      accentColor: "#06b6d4",
    },
  });

  await SiteSettings.create({
    site: {
      name: "NexvoLearn",
      title: "NexvoLearn | Danidu Lokuliyana",
      description: "Premier Online Tuition & Interactive Learning Management Portal",
    },
    pages: {
      home: {
        heroTitle: "Unlock Academic Excellence in Advanced Mathematics & Science",
        heroSubtitle: "Live interactive classes, timed speed quizzes, weekly tutorial packs, and 1v1 knowledge challenges.",
        showStats: true,
      },
    },
  });
  console.log("   ✓ White-label branding and site settings initialized.");

  // 18. ACADEMIC STORE PRODUCTS & PHYSICAL STORE ORDERS
  console.log("18. Seeding Academic Store Products & Physical Store Orders...");
  const prodPureMath = await Product.create({
    title: "October 2026 Combined Maths Pure Math Tute Pack",
    description: "Official printed theory tutes, weekly homework problems, and past-paper model answers.",
    price: 2500,
    category: "study_pack",
    inventory_count: 85,
    thumbnail_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
    is_active: true,
  });

  const prodMechanics = await Product.create({
    title: "Applied Mathematics Mechanics Practice Handbook",
    description: "Comprehensive step-by-step problem sets covering forces, equilibrium, and kinematics.",
    price: 1800,
    category: "book",
    inventory_count: 45,
    thumbnail_url: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=400",
    is_active: true,
  });

  const prodPhysics = await Product.create({
    title: "Physics Advanced Level Revision Master Booklet",
    description: "Full summary sheets, key derivations, and experimental setup revision notes.",
    price: 2200,
    category: "study_pack",
    inventory_count: 60,
    thumbnail_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400",
    is_active: true,
  });

  const prodKit = await Product.create({
    title: "NexvoLearn Premium Scientific Study Notebook & Pen Set",
    description: "Hardcover grid journal tailored for engineering diagramming and mathematical notes.",
    price: 1200,
    category: "merchandise",
    inventory_count: 120,
    thumbnail_url: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=400",
    is_active: true,
  });

  const orderAliceId = `ORD-${Date.now()}-201`;
  const orderAlice = await StoreOrder.create({
    order_id: orderAliceId,
    user_id: studentAlice._id,
    items: [
      {
        product_id: prodPureMath._id,
        title: prodPureMath.title,
        price: prodPureMath.price,
        quantity: 1,
      },
    ],
    total_amount: 2500,
    shipping_address: "No. 12, Flower Road, Colombo 07",
    contact_phone: studentAlice.phone || "0771234567",
    payment_status: "paid",
    fulfillment_status: "dispatched",
  });

  const delAlice = await DeliveryOrder.create({
    order_id: `DEL-${orderAliceId}`,
    student_id: studentAlice._id,
    store_order_id: orderAlice._id,
    delivery_method: "Courier Delivery (Domex)",
    shipping_address: "No. 12, Flower Road, Colombo 07",
    recipient_phone: studentAlice.phone || "0771234567",
    recipient_name: `${studentAlice.first_name} ${studentAlice.last_name}`.trim() || "Alice Student",
    status: "dispatched",
    tracking_number: "DMX-8891024",
    courier_service: "Domex Courier",
    dispatched_at: new Date(Date.now() - 36000000),
    items: [
      {
        product_id: prodPureMath._id,
        title: prodPureMath.title,
        price: prodPureMath.price,
        quantity: 1,
      },
    ],
  });

  orderAlice.delivery_order_id = delAlice._id;
  await orderAlice.save();

  const orderBobId = `ORD-${Date.now()}-202`;
  const orderBob = await StoreOrder.create({
    order_id: orderBobId,
    user_id: studentBob._id,
    items: [
      {
        product_id: prodMechanics._id,
        title: prodMechanics.title,
        price: prodMechanics.price,
        quantity: 1,
      },
    ],
    total_amount: 1800,
    shipping_address: "No. 45, Temple Road, Nugegoda",
    contact_phone: studentBob.phone || "0777654321",
    payment_status: "paid",
    fulfillment_status: "delivered",
  });

  const delBob = await DeliveryOrder.create({
    order_id: `DEL-${orderBobId}`,
    student_id: studentBob._id,
    store_order_id: orderBob._id,
    delivery_method: "Courier Delivery (Pronto Lanka)",
    shipping_address: "No. 45, Temple Road, Nugegoda",
    recipient_phone: studentBob.phone || "0777654321",
    recipient_name: `${studentBob.first_name} ${studentBob.last_name}`.trim() || "Bob Student",
    status: "delivered",
    tracking_number: "PRN-9902184",
    courier_service: "Pronto Lanka",
    dispatched_at: new Date(Date.now() - 86400000 * 2),
    delivered_at: new Date(Date.now() - 86400000),
    items: [
      {
        product_id: prodMechanics._id,
        title: prodMechanics.title,
        price: prodMechanics.price,
        quantity: 1,
      },
    ],
  });

  orderBob.delivery_order_id = delBob._id;
  await orderBob.save();

  console.log("   ✓ Academic store products and fulfillment orders created.");

  // 19. DIGITAL STUDY PACKS (PAST RECORDINGS, VIDEOS & MATERIAL PDFS)
  console.log("19. Seeding Digital Study Packs (Past Recordings, Videos & PDFs)...");
  await StudyPack.create({
    title: "Combined Mathematics Calculus & Integration Master Study Pack",
    description: "Complete digital master pack containing past class live recordings, video breakdowns, and PDF derivation summaries.",
    grade: grade12._id,
    class_id: classMath12._id,
    subject: subMath._id,
    price: 3000,
    thumbnail_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600",
    recordings: [rec1._id, rec2._id],
    custom_videos: [
      {
        title: "Calculus: Integration by Parts Visual Masterclass",
        url: "https://www.youtube.com/watch?v=rfscVS0vtbw",
        provider: "youtube",
      },
      {
        title: "Definite Integral Applications in Geometry",
        url: "https://www.youtube.com/watch?v=FN948K9g95Y",
        provider: "youtube",
      },
    ],
    materials: [
      {
        title: "Pure Mathematics Formulas & Integration Standard Integrals Sheet",
        file_url: "https://akeagjxcoxqqfjurotod.supabase.co/storage/v1/object/public/materials/calculus-formulas.pdf",
        file_type: "pdf",
        size_bytes: 2048576,
      },
      {
        title: "Model Paper Solutions & Worked Proofs",
        file_url: "https://akeagjxcoxqqfjurotod.supabase.co/storage/v1/object/public/materials/integration-proofs.pdf",
        file_type: "pdf",
        size_bytes: 3145728,
      },
    ],
    is_published: true,
    created_by: teacherDanidu._id,
  });

  await StudyPack.create({
    title: "Physics Mechanics & Wave Optics Complete Digital Bundle",
    description: "Digital archive bundle covering theoretical fundamentals, past exam recording analyses, and downloadable formula handbooks.",
    grade: grade12._id,
    class_id: classPhysics12._id,
    subject: subPhysics._id,
    price: 2800,
    thumbnail_url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600",
    recordings: [rec3._id],
    custom_videos: [
      {
        title: "Wave Optics Double Slit Experiment Simulation",
        url: "https://www.youtube.com/watch?v=Iuv6hY6zsd0",
        provider: "youtube",
      },
    ],
    materials: [
      {
        title: "Optics and Thermal Physics Short Notes & Graph Guides",
        file_url: "https://akeagjxcoxqqfjurotod.supabase.co/storage/v1/object/public/materials/physics-notes.pdf",
        file_type: "pdf",
        size_bytes: 1548576,
      },
    ],
    is_published: true,
    created_by: teacherSarah._id,
  });
  console.log("   ✓ Digital study packs seeded with recordings, videos, and PDFs.");

  console.log("==========================================================");
  console.log("🎉 ALL MODULES POPULATED WITH RICH, INTERCONNECTED DATA!");
  console.log("==========================================================");
  console.log("Credentials for Testing & Verification:");
  console.log("  • Admin:     admin@lms.com / password123");
  console.log("  • Teacher:   teacher@lms.com / password123");
  console.log("  • Student:   student@lms.com / password123 (Alice)");
  console.log("  • Student 2: bob.student@lms.com / password123 (Bob)");
  console.log("  • Moderator: moderator@lms.com / password123");
  console.log("==========================================================");
}

if (require.main === module) {
  seedCompleteLmsDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal Seeding Error:", err);
      process.exit(1);
    });
}
