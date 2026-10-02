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
const app_1 = require("../app");
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const Class_1 = require("../models/Class");
const seedPermissions_1 = require("./seedPermissions");
const bcrypt_1 = __importDefault(require("bcrypt"));
const http_1 = __importDefault(require("http"));
async function runIntegrationTests() {
    console.log('=== STARTING PERMISSION INTEGRATION TESTS ===');
    await mongoose_1.default.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms');
    // Start HTTP server on random port
    const server = http_1.default.createServer(app_1.app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Test server running at ${baseUrl}`);
    try {
        // Ensure fresh seed
        await (0, seedPermissions_1.seedPermissionsAndRoles)();
        const defaultPassword = 'password123';
        const hashedPassword = await bcrypt_1.default.hash(defaultPassword, 10);
        const teacher = await User_1.User.findOne({ email: 'teacher@lms.com' });
        if (teacher) {
            teacher.password_hash = hashedPassword;
            await teacher.save();
        }
        const student = await User_1.User.findOne({ email: 'student@lms.com' });
        if (student) {
            student.password_hash = hashedPassword;
            await student.save();
        }
        let moderator = await User_1.User.findOne({ email: 'moderator@lms.com' });
        const modRole = await Role_1.Role.findOne({ name: 'Moderator' });
        if (!moderator) {
            moderator = await User_1.User.create({
                first_name: 'Mod',
                last_name: 'User',
                email: 'moderator@lms.com',
                phone: '0712345679',
                password_hash: hashedPassword,
                is_verified: true,
                role_ids: [modRole?._id]
            });
        }
        else {
            moderator.password_hash = hashedPassword;
            moderator.role_ids = [modRole?._id];
            await moderator.save();
        }
        // Helper to login and extract cookie
        async function login(email) {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: email, password: defaultPassword })
            });
            const cookie = res.headers.get('set-cookie');
            const body = await res.json();
            return { status: res.status, cookie, body };
        }
        // 1. TEACHER
        console.log('\n--- 1. Testing Teacher Account ---');
        const teacherLogin = await login('teacher@lms.com');
        if (teacherLogin.status !== 200 || !teacherLogin.cookie) {
            throw new Error(`Teacher login failed: ${JSON.stringify(teacherLogin.body)}`);
        }
        const teacherCookie = teacherLogin.cookie;
        console.log('✓ Teacher login successful (HTTP 200)');
        const teacherProfileRes = await fetch(`${baseUrl}/api/auth/profile`, {
            headers: { Cookie: teacherCookie }
        });
        const teacherProfile = await teacherProfileRes.json();
        console.log(`✓ Teacher profile status: ${teacherProfileRes.status}, permissions: ${teacherProfile.data?.permissions?.length}`);
        if (!teacherProfile.data?.permissions?.includes('classes.create')) {
            throw new Error('Teacher missing classes.create in profile');
        }
        const teacherUsersRes = await fetch(`${baseUrl}/api/users`, {
            headers: { Cookie: teacherCookie }
        });
        console.log(`✓ Teacher GET /api/users status: ${teacherUsersRes.status} (Expected 200)`);
        if (teacherUsersRes.status !== 200) {
            throw new Error(`Teacher cannot get users: ${teacherUsersRes.status}`);
        }
        const { Subject } = await Promise.resolve().then(() => __importStar(require('../models/Subject')));
        const { Grade } = await Promise.resolve().then(() => __importStar(require('../models/Grade')));
        const subj = await Subject.findOne();
        const grd = await Grade.findOne();
        const classPayload = {
            title: 'Integration Test Advanced Physics',
            description: 'Testing permissions and class creation',
            subject: subj?._id,
            grade: grd?._id,
            format: 'theory',
            type: 'regular',
            price: 2500,
            monthly_fee: 2500
        };
        const teacherCreateClassRes = await fetch(`${baseUrl}/api/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
            body: JSON.stringify(classPayload)
        });
        const createdClassBody = await teacherCreateClassRes.json();
        console.log(`✓ Teacher POST /api/classes status: ${teacherCreateClassRes.status} (Expected 201)`);
        if (teacherCreateClassRes.status !== 201) {
            throw new Error(`Teacher create class failed: ${JSON.stringify(createdClassBody)}`);
        }
        const createdClassId = createdClassBody.data._id;
        const teacherUpdateClassRes = await fetch(`${baseUrl}/api/classes/${createdClassId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
            body: JSON.stringify({ description: 'Updated description for physics class' })
        });
        console.log(`✓ Teacher PUT /api/classes/:id status: ${teacherUpdateClassRes.status} (Expected 200)`);
        if (teacherUpdateClassRes.status !== 200) {
            throw new Error(`Teacher update class failed: ${teacherUpdateClassRes.status}`);
        }
        const teacherStudentsRes = await fetch(`${baseUrl}/api/classes/${createdClassId}/students`, {
            headers: { Cookie: teacherCookie }
        });
        console.log(`✓ Teacher GET /api/classes/:id/students status: ${teacherStudentsRes.status} (Expected 200)`);
        if (teacherStudentsRes.status !== 200) {
            throw new Error(`Teacher get students failed: ${teacherStudentsRes.status}`);
        }
        const teacherAppsRes = await fetch(`${baseUrl}/api/class-applications`, {
            headers: { Cookie: teacherCookie }
        });
        console.log(`✓ Teacher GET /api/class-applications status: ${teacherAppsRes.status} (Expected 200)`);
        if (teacherAppsRes.status !== 200) {
            throw new Error(`Teacher get applications failed: ${teacherAppsRes.status}`);
        }
        // 2. MODERATOR
        console.log('\n--- 2. Testing Moderator Account ---');
        const modLogin = await login('moderator@lms.com');
        const modCookie = modLogin.cookie;
        const modCreateRes = await fetch(`${baseUrl}/api/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: modCookie },
            body: JSON.stringify(classPayload)
        });
        console.log(`✓ Moderator POST /api/classes status: ${modCreateRes.status} (Expected 403 Forbidden)`);
        if (modCreateRes.status !== 403) {
            throw new Error(`Moderator should NOT be able to create class, got ${modCreateRes.status}`);
        }
        const modUpdateRes = await fetch(`${baseUrl}/api/classes/${createdClassId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Cookie: modCookie },
            body: JSON.stringify({ description: 'Moderator updated description' })
        });
        console.log(`✓ Moderator PUT /api/classes/:id status: ${modUpdateRes.status} (Expected 200)`);
        if (modUpdateRes.status !== 200) {
            throw new Error(`Moderator should be able to update class, got ${modUpdateRes.status}`);
        }
        const modUsersRes = await fetch(`${baseUrl}/api/users`, {
            headers: { Cookie: modCookie }
        });
        console.log(`✓ Moderator GET /api/users status: ${modUsersRes.status} (Expected 403 Forbidden)`);
        if (modUsersRes.status !== 403) {
            throw new Error(`Moderator should NOT be able to view user management, got ${modUsersRes.status}`);
        }
        // 3. STUDENT
        console.log('\n--- 3. Testing Student Account ---');
        const studentLogin = await login('student@lms.com');
        const studentCookie = studentLogin.cookie;
        const studentCreateRes = await fetch(`${baseUrl}/api/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
            body: JSON.stringify(classPayload)
        });
        console.log(`✓ Student POST /api/classes status: ${studentCreateRes.status} (Expected 403 Forbidden)`);
        if (studentCreateRes.status !== 403) {
            throw new Error(`Student should NOT be able to create class, got ${studentCreateRes.status}`);
        }
        const studentGetClassesRes = await fetch(`${baseUrl}/api/classes`, {
            headers: { Cookie: studentCookie }
        });
        console.log(`✓ Student GET /api/classes status: ${studentGetClassesRes.status} (Expected 200)`);
        if (studentGetClassesRes.status !== 200) {
            throw new Error(`Student should be able to read classes, got ${studentGetClassesRes.status}`);
        }
        // 4. GUEST
        console.log('\n--- 4. Testing Guest (Logged-out) ---');
        const guestClassesRes = await fetch(`${baseUrl}/api/classes`);
        console.log(`✓ Guest GET /api/classes status: ${guestClassesRes.status} (Expected 200)`);
        const guestUsersRes = await fetch(`${baseUrl}/api/users`);
        console.log(`✓ Guest GET /api/users status: ${guestUsersRes.status} (Expected 401 Not Authorized)`);
        if (guestUsersRes.status !== 401) {
            throw new Error(`Guest should get 401 on /api/users, got ${guestUsersRes.status}`);
        }
        // Cleanup
        await Class_1.Class.findByIdAndDelete(createdClassId);
        console.log('\n=== ALL PERMISSION INTEGRATION TESTS PASSED PERFECTLY! ===\n');
    }
    finally {
        server.close();
    }
    process.exit(0);
}
runIntegrationTests().catch(err => {
    console.error('\n❌ INTEGRATION TEST FAILED:', err);
    process.exit(1);
});
