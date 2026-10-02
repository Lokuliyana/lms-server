import mongoose from 'mongoose';
import { app } from '../app';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { seedPermissionsAndRoles } from './seedPermissions';
import bcrypt from 'bcrypt';
import http from 'http';

async function runBatch04BVerification() {
  console.log('=== STARTING BATCH 04B: USER PAGINATION & INTEGRATION TESTS ===');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    await seedPermissionsAndRoles();

    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const teacher = await User.findOne({ email: 'teacher@lms.com' });
    if (teacher) {
      teacher.password_hash = hashedPassword;
      await teacher.save();
    }

    const student = await User.findOne({ email: 'student@lms.com' });
    if (student) {
      student.password_hash = hashedPassword;
      await student.save();
    }

    async function login(email: string) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: defaultPassword })
      });
      if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
      const rawCookie = res.headers.get('set-cookie');
      return rawCookie ? rawCookie.split(';')[0] : '';
    }

    const teacherCookie = await login('teacher@lms.com');
    const studentCookie = await login('student@lms.com');

    // 1. Default pagination & response structure
    console.log('\n--- Test 1: Default Pagination & Schema ---');
    const res1 = await fetch(`${baseUrl}/api/users`, {
      headers: { Cookie: teacherCookie }
    });
    if (res1.status !== 200) throw new Error(`Expected 200, got ${res1.status}`);
    const data1 = await res1.json();
    if (!data1.success || !Array.isArray(data1.data) || !Array.isArray(data1.users)) {
      throw new Error('Response missing success, data, or users array');
    }
    if (typeof data1.total !== 'number' || typeof data1.totalPages !== 'number') {
      throw new Error('Response missing total or totalPages metadata');
    }
    if (data1.page !== 1 || data1.limit !== 10) {
      throw new Error(`Expected default page=1, limit=10; got page=${data1.page}, limit=${data1.limit}`);
    }
    if (!data1.pagination || data1.pagination.page !== 1 || data1.pagination.limit !== 10) {
      throw new Error('Response missing pagination object');
    }
    // Sensitive field exclusion
    for (const u of data1.users) {
      if (u.password_hash !== undefined) {
        throw new Error(`Sensitive field password_hash exposed on user ${u._id}`);
      }
    }
    console.log(`✓ Default pagination passed: ${data1.users.length} users on page 1, total: ${data1.total}, totalPages: ${data1.totalPages}`);
    console.log('✓ Sensitive fields (password_hash) properly excluded');

    // 2. Bounded limit and custom page
    console.log('\n--- Test 2: Custom Page & Bounded Limit ---');
    const res2 = await fetch(`${baseUrl}/api/users?page=1&limit=2`, {
      headers: { Cookie: teacherCookie }
    });
    const data2 = await res2.json();
    if (data2.limit !== 2 || data2.users.length > 2) {
      throw new Error(`Expected limit=2, got ${data2.limit}, users returned: ${data2.users.length}`);
    }
    if (data2.totalPages !== Math.ceil(data2.total / 2)) {
      throw new Error(`Expected totalPages=${Math.ceil(data2.total / 2)}, got ${data2.totalPages}`);
    }
    console.log(`✓ Custom limit=2 passed: returned ${data2.users.length} users, totalPages: ${data2.totalPages}`);

    // Limit bounded to max 100
    const resMax = await fetch(`${baseUrl}/api/users?limit=250`, {
      headers: { Cookie: teacherCookie }
    });
    const dataMax = await resMax.json();
    if (dataMax.limit !== 100) {
      throw new Error(`Expected limit capped at 100, got ${dataMax.limit}`);
    }
    console.log('✓ Max limit clamp (100) enforced properly');

    // Boundary/invalid parameters
    const resBound = await fetch(`${baseUrl}/api/users?page=-5&limit=-10`, {
      headers: { Cookie: teacherCookie }
    });
    const dataBound = await resBound.json();
    if (dataBound.page !== 1 || dataBound.limit !== 10) {
      throw new Error(`Expected safe boundary fallback page=1, limit=10; got page=${dataBound.page}, limit=${dataBound.limit}`);
    }
    console.log('✓ Negative/invalid page and limit handled safely with defaults');

    // 3. Role filtering
    console.log('\n--- Test 3: Role Filtering ---');
    const resTeacher = await fetch(`${baseUrl}/api/users?role=teacher`, {
      headers: { Cookie: teacherCookie }
    });
    const dataTeacher = await resTeacher.json();
    for (const u of dataTeacher.users) {
      if (u.role !== 'teacher') {
        throw new Error(`Role filter returned non-teacher: ${u.role}`);
      }
    }
    console.log(`✓ Role filter 'teacher' passed: returned ${dataTeacher.users.length} teacher(s)`);

    const resStudent = await fetch(`${baseUrl}/api/users?role=student`, {
      headers: { Cookie: teacherCookie }
    });
    const dataStudent = await resStudent.json();
    for (const u of dataStudent.users) {
      if (u.role !== 'student') {
        throw new Error(`Role filter returned non-student: ${u.role}`);
      }
    }
    console.log(`✓ Role filter 'student' passed: returned ${dataStudent.users.length} student(s)`);

    // 4. Search filtering
    console.log('\n--- Test 4: Search Filtering & Regex Safety ---');
    const resSearch = await fetch(`${baseUrl}/api/users?search=teacher`, {
      headers: { Cookie: teacherCookie }
    });
    const dataSearch = await resSearch.json();
    if (dataSearch.users.length === 0) {
      throw new Error('Search for "teacher" should have matched teacher@lms.com');
    }
    console.log(`✓ Search for 'teacher' matched ${dataSearch.users.length} record(s)`);

    // Special regex character safety
    const resRegex = await fetch(`${baseUrl}/api/users?search=${encodeURIComponent('test+*()[]')}`, {
      headers: { Cookie: teacherCookie }
    });
    if (resRegex.status !== 200) {
      throw new Error(`Special regex character search crashed with status ${resRegex.status}`);
    }
    console.log('✓ Special regex characters in search sanitized and query executed safely');

    // Float page & limit handling (no MongoDB $skip/$limit error)
    const resFloat = await fetch(`${baseUrl}/api/users?page=1.5&limit=2.5`, {
      headers: { Cookie: teacherCookie }
    });
    if (resFloat.status !== 200) {
      throw new Error(`Float page/limit request failed with status ${resFloat.status}`);
    }
    const dataFloat = await resFloat.json();
    if (dataFloat.limit !== 2 || dataFloat.page !== 1) {
      throw new Error(`Expected floored integer limit=2, page=1; got limit=${dataFloat.limit}, page=${dataFloat.page}`);
    }
    console.log('✓ Float pagination parameters safely converted to integers without Mongo $skip error');

    // Combined role and search filtering
    const resCombined = await fetch(`${baseUrl}/api/users?role=teacher&search=teacher`, {
      headers: { Cookie: teacherCookie }
    });
    if (resCombined.status !== 200) {
      throw new Error(`Combined search & role request failed with status ${resCombined.status}`);
    }
    const dataCombined = await resCombined.json();
    for (const u of dataCombined.users) {
      if (u.role !== 'teacher') {
        throw new Error(`Combined filter returned non-teacher: ${u.role}`);
      }
    }
    console.log(`✓ Combined role & search filter matched ${dataCombined.users.length} teacher record(s)`);

    // Student profile metadata persistence (school and grade)
    const testEmail = `teststudent_${Date.now()}@lms.com`;
    const resCreate = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: teacherCookie
      },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'Scholar',
        email: testEmail,
        phone: `+9477${Math.floor(1000000 + Math.random() * 9000000)}`,
        password: 'Password123!',
        role: 'student',
        school: 'St. Joseph Academy',
        grade: '12'
      })
    });
    if (resCreate.status !== 201) {
      const errText = await resCreate.text();
      throw new Error(`Failed to create test student: ${resCreate.status} - ${errText}`);
    }
    const resVerifyProfile = await fetch(`${baseUrl}/api/users?search=${encodeURIComponent(testEmail)}`, {
      headers: { Cookie: teacherCookie }
    });
    const dataVerify = await resVerifyProfile.json();
    const createdUser = dataVerify.users.find((u: any) => u.email === testEmail);
    if (!createdUser) {
      throw new Error('Created student not found in user roster');
    }
    if (createdUser.school !== 'St. Joseph Academy' || createdUser.grade !== '12') {
      throw new Error(`Student profile school/grade not persisted: school=${createdUser.school}, grade=${createdUser.grade}`);
    }
    console.log('✓ Student profile school and grade successfully persisted and retrieved');

    // 5. Permission security guard
    console.log('\n--- Test 5: Permission & Authentication Guards ---');
    const resGuest = await fetch(`${baseUrl}/api/users`);
    if (resGuest.status !== 401) {
      throw new Error(`Guest should be rejected with 401, got ${resGuest.status}`);
    }
    console.log('✓ Unauthenticated request rejected with 401 Unauthorized');

    const resStudentForbidden = await fetch(`${baseUrl}/api/users`, {
      headers: { Cookie: studentCookie }
    });
    if (resStudentForbidden.status !== 403) {
      throw new Error(`Student without users.read should be rejected with 403, got ${resStudentForbidden.status}`);
    }
    console.log('✓ Student without users.read rejected with 403 Forbidden');

    console.log('\n==================================================');
    console.log('🎉 ALL BATCH 04B INTEGRATION TESTS PASSED CLEANLY!');
    console.log('==================================================');

  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runBatch04BVerification().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
