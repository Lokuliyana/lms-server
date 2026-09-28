import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { config } from "../config/env";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { Class } from "../models/Class";
import { Quiz } from "../models/Quiz";
import { Permission } from "../models/Permission";
import { RolePermission } from "../models/RolePermission";

async function seedData() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Connected to local MongoDB");

    // Clear existing
    await User.deleteMany({});
    await Role.deleteMany({});
    await Class.deleteMany({});
    await Quiz.deleteMany({});
    await Permission.deleteMany({});
    await RolePermission.deleteMany({});

    console.log("Cleared existing data");

    // 1. Roles
    const adminRole = await Role.create({ name: "admin", description: "Super Admin" });
    const teacherRole = await Role.create({ name: "teacher", description: "Teacher" });
    const studentRole = await Role.create({ name: "student", description: "Student" });

    // 2. Users
    const password = await bcrypt.hash("password123", 10);
    
    const adminUser = await User.create({
      first_name: "Admin", last_name: "User", phone: "+1234567890",
      email: "admin@lms.com",
      password_hash: password,
      role: "admin",
      role_ids: [adminRole._id],
      is_active: true
    });

    const teacherUser = await User.create({
      first_name: "Teacher", last_name: "User", phone: "+1234567891",
      email: "teacher@lms.com",
      password_hash: password,
      role: "teacher",
      role_ids: [teacherRole._id],
      is_active: true
    });

    const studentUser = await User.create({
      first_name: "Student", last_name: "User", phone: "+1234567892",
      email: "student@lms.com",
      password_hash: password,
      role: "student",
      role_ids: [studentRole._id],
      is_active: true
    });

    // 3. Classes
    const mathClass = await Class.create({
      title: "Advanced Mathematics",
      subject: "Math", grade: "12", type: "regular", format: "theory",
      description: "Learn calculus and linear algebra",
      created_by: teacherUser._id,
      tutor: teacherUser._id,
      monthly_fee: 50,
      enrolled_students: [studentUser._id],
      currency: "USD",
      price: 50
    });

    const physicsClass = await Class.create({
      title: "Physics 101",
      subject: "Science", grade: "10", type: "regular", format: "revision",
      description: "Introduction to mechanics",
      created_by: teacherUser._id,
      tutor: teacherUser._id,
      monthly_fee: 40,
      enrolled_students: [],
      currency: "USD",
      price: 40
    });

    // 4. Quizzes
    await Quiz.create({
      title: "Math Midterm",
      instructions: "Answer all questions",
      subject: "Math", grade: "12", type: "regular", format: "theory",
      created_by: teacherUser._id,
      class_id: mathClass._id,
      question_count: 10,
      type: "quiz"
    });

    await Quiz.create({
      title: "Physics Quiz 1",
      instructions: "No calculators allowed",
      subject: "Science", grade: "10", type: "regular", format: "revision",
      created_by: teacherUser._id,
      class_id: physicsClass._id,
      question_count: 5,
      type: "quiz"
    });

    console.log("Seeding complete! Credentials:");
    console.log("Admin: admin@lms.com / password123");
    console.log("Teacher: teacher@lms.com / password123");
    console.log("Student: student@lms.com / password123");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed", error);
    process.exit(1);
  }
}

seedData();
