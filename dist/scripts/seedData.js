"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const env_1 = require("../config/env");
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const Class_1 = require("../models/Class");
const Quiz_1 = require("../models/Quiz");
const QuizQuestion_1 = require("../models/QuizQuestion");
const Permission_1 = require("../models/Permission");
const RolePermission_1 = require("../models/RolePermission");
const Subject_1 = require("../models/Subject");
const Grade_1 = require("../models/Grade");
async function seedData() {
    try {
        await mongoose_1.default.connect(env_1.config.mongoUri);
        console.log("Connected to local MongoDB");
        // Clear existing
        await User_1.User.deleteMany({});
        await Role_1.Role.deleteMany({});
        await Class_1.Class.deleteMany({});
        await Quiz_1.Quiz.deleteMany({});
        await QuizQuestion_1.QuizQuestion.deleteMany({});
        await Permission_1.Permission.deleteMany({});
        await RolePermission_1.RolePermission.deleteMany({});
        await Subject_1.Subject.deleteMany({});
        await Grade_1.Grade.deleteMany({});
        console.log("Cleared existing data");
        // 1. Roles
        const adminRole = await Role_1.Role.create({ name: "admin" });
        const teacherRole = await Role_1.Role.create({ name: "teacher" });
        const studentRole = await Role_1.Role.create({ name: "student" });
        const moderatorRole = await Role_1.Role.create({ name: "moderator" });
        // 2. Users
        const password = await bcrypt_1.default.hash("password123", 10);
        const adminUser = await User_1.User.create({
            first_name: "Admin", last_name: "User", phone: "+1234567890",
            email: "admin@lms.com",
            password_hash: password,
            role_ids: [adminRole._id],
            is_verified: true
        });
        const teacherUser = await User_1.User.create({
            first_name: "Teacher", last_name: "User", phone: "+1234567891",
            email: "teacher@lms.com",
            password_hash: password,
            role_ids: [teacherRole._id],
            is_verified: true
        });
        const studentUser = await User_1.User.create({
            first_name: "Student", last_name: "User", phone: "+1234567892",
            email: "student@lms.com",
            password_hash: password,
            role_ids: [studentRole._id],
            is_verified: true
        });
        const moderatorUser = await User_1.User.create({
            first_name: "Moderator", last_name: "User", phone: "+1234567893",
            email: "moderator@lms.com",
            password_hash: password,
            role_ids: [moderatorRole._id],
            is_verified: true
        });
        // 3. Subjects & Grades
        const mathSubject = await Subject_1.Subject.create({ name: "Math" });
        const scienceSubject = await Subject_1.Subject.create({ name: "Science" });
        const grade10 = await Grade_1.Grade.create({ name: "10" });
        const grade12 = await Grade_1.Grade.create({ name: "12" });
        // 4. Classes
        const mathClass = await Class_1.Class.create({
            title: "Advanced Mathematics",
            subject: mathSubject._id,
            grade: grade12._id,
            type: "regular",
            format: "theory",
            description: "Learn calculus and linear algebra",
            created_by: teacherUser._id,
            tutor: teacherUser._id,
            monthly_fee: 50,
            enrolled_students: [studentUser._id],
            currency: "USD",
            price: 50
        });
        const physicsClass = await Class_1.Class.create({
            title: "Physics 101",
            subject: scienceSubject._id,
            grade: grade10._id,
            type: "regular",
            format: "revision",
            description: "Introduction to mechanics",
            created_by: teacherUser._id,
            tutor: teacherUser._id,
            monthly_fee: 40,
            enrolled_students: [],
            currency: "USD",
            price: 40
        });
        // 5. Quizzes
        const mathQuiz = await Quiz_1.Quiz.create({
            title: "Math Midterm",
            instructions: "Answer all questions. Calculators allowed for section B.",
            created_by: teacherUser._id,
            class_id: mathClass._id,
            subject: mathSubject._id,
            difficulty: "Medium",
            time_limit_sec: 1800, // 30 minutes
            question_count: 5,
            type: "quiz",
            is_active: true,
        });
        await QuizQuestion_1.QuizQuestion.insertMany([
            {
                quiz_id: mathQuiz._id,
                type: "mcq",
                question: "What is the derivative of f(x) = 3x^2 + 5x - 2?",
                options: ["6x + 5", "3x + 5", "6x - 2", "5x + 3"],
                correct_answer: "6x + 5",
                explanation: "Using the power rule: d/dx(3x^2) = 6x, and d/dx(5x) = 5.",
                marks: 5,
            },
            {
                quiz_id: mathQuiz._id,
                type: "mcq",
                question: "Solve for x: 2^(x+1) = 16.",
                options: ["2", "3", "4", "5"],
                correct_answer: "3",
                explanation: "16 = 2^4, so x + 1 = 4 => x = 3.",
                marks: 5,
            },
            {
                quiz_id: mathQuiz._id,
                type: "true-false",
                question: "Every prime number except 2 is odd.",
                options: ["True", "False"],
                correct_answer: "True",
                explanation: "Any even number greater than 2 is divisible by 2 and therefore composite.",
                marks: 5,
            },
            {
                quiz_id: mathQuiz._id,
                type: "mcq",
                question: "What is the area of a circle with radius 7? (Use π = 22/7)",
                options: ["154", "44", "144", "308"],
                correct_answer: "154",
                explanation: "Area = π * r^2 = (22/7) * 49 = 154.",
                marks: 5,
            },
            {
                quiz_id: mathQuiz._id,
                type: "mcq",
                question: "What is the value of log10(1000)?",
                options: ["1", "2", "3", "4"],
                correct_answer: "3",
                explanation: "10^3 = 1000, so log10(1000) = 3.",
                marks: 5,
            },
        ]);
        const physicsQuiz = await Quiz_1.Quiz.create({
            title: "Physics Quiz 1",
            instructions: "No calculators allowed. Answer all conceptual questions.",
            created_by: teacherUser._id,
            class_id: physicsClass._id,
            subject: scienceSubject._id,
            difficulty: "Easy",
            time_limit_sec: 900, // 15 minutes
            question_count: 3,
            type: "quiz",
            is_active: true,
        });
        await QuizQuestion_1.QuizQuestion.insertMany([
            {
                quiz_id: physicsQuiz._id,
                type: "mcq",
                question: "What is the SI unit of electric current?",
                options: ["Ampere", "Volt", "Ohm", "Watt"],
                correct_answer: "Ampere",
                explanation: "Electric current is measured in Amperes (A).",
                marks: 10,
            },
            {
                quiz_id: physicsQuiz._id,
                type: "true-false",
                question: "Light travels faster in water than in a vacuum.",
                options: ["True", "False"],
                correct_answer: "False",
                explanation: "Light travels fastest in a vacuum (approximately 3 x 10^8 m/s).",
                marks: 10,
            },
            {
                quiz_id: physicsQuiz._id,
                type: "mcq",
                question: "Which of Newton's laws is also known as the Law of Inertia?",
                options: ["First Law", "Second Law", "Third Law", "Law of Gravitation"],
                correct_answer: "First Law",
                explanation: "Newton's First Law states that an object remains at rest or in uniform motion unless acted upon by a net external force.",
                marks: 10,
            },
        ]);
        // Restore all canonical permissions and roles idempotently
        const { seedPermissionsAndRoles } = await Promise.resolve().then(() => __importStar(require("./seedPermissions")));
        await seedPermissionsAndRoles();
        console.log("RBAC Permissions and Roles restored successfully.");
        console.log("Seeding complete! Credentials:");
        console.log("Admin: admin@lms.com / password123");
        console.log("Teacher: teacher@lms.com / password123");
        console.log("Student: student@lms.com / password123");
        process.exit(0);
    }
    catch (error) {
        console.error("Seeding failed", error);
        process.exit(1);
    }
}
seedData();
