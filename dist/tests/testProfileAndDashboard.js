"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const http_1 = __importDefault(require("http"));
const app_1 = require("../app");
async function runTests() {
    console.log('========================================================');
    console.log('RUNNING PROFILE & DASHBOARD VERIFICATION TESTS');
    console.log('========================================================\n');
    await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms');
    const server = http_1.default.createServer(app_1.app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    const teacherId = '6ac4174b90c5875021be03be';
    const profileId = '6adb1d2a5ec64f601b6f851a';
    try {
        // 1. Unauthenticated GET /api/auth/user/:id
        console.log('--- 1. Public Profile Access (Unauthenticated) ---');
        const resGuest = await fetch(`${baseUrl}/api/auth/user/${teacherId}`);
        if (resGuest.status !== 200)
            throw new Error(`Expected 200 for guest profile, got ${resGuest.status}`);
        const guestJson = await resGuest.json();
        const guestData = guestJson.data;
        if (!guestData || guestData._id !== teacherId)
            throw new Error(`Invalid guest data _id: ${guestData?._id}`);
        if (guestData.password_hash)
            throw new Error('Security risk: password_hash leaked in guest profile!');
        console.log('  ✓ Public GET /api/auth/user/:id returned 200 with sanitized data (no password_hash)');
        // 2. Unauthenticated GET /api/users/:id and /api/user/:id aliases
        console.log('\n--- 2. Route Aliases (/api/users/:id and /api/user/:id) ---');
        const resAlias1 = await fetch(`${baseUrl}/api/users/${teacherId}`);
        if (resAlias1.status !== 200)
            throw new Error(`/api/users/:id failed with ${resAlias1.status}`);
        console.log('  ✓ Public GET /api/users/:id returned 200');
        const resAlias2 = await fetch(`${baseUrl}/api/user/${teacherId}`);
        if (resAlias2.status !== 200)
            throw new Error(`/api/user/:id failed with ${resAlias2.status}`);
        console.log('  ✓ Public GET /api/user/:id returned 200');
        // 3. Fallback when requested with StudentProfile ID instead of User ID
        console.log('\n--- 3. StudentProfile ID Graceful Fallback ---');
        const resProfileFallback = await fetch(`${baseUrl}/api/auth/user/${profileId}`);
        if (resProfileFallback.status !== 200)
            throw new Error(`Fallback profile lookup failed: ${resProfileFallback.status}`);
        const fallbackJson = await resProfileFallback.json();
        if (fallbackJson.data._id !== teacherId)
            throw new Error(`Expected fallback to resolve to teacherId ${teacherId}`);
        console.log('  ✓ GET with StudentProfile ID correctly resolves to User ID');
        // 4. Authenticated Login and ID Verification
        console.log('\n--- 4. Login & getProfile ID Integrity ---');
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'teacher@lms.com', password: 'password123' }),
        });
        if (loginRes.status !== 200)
            throw new Error(`Login failed with ${loginRes.status}`);
        const loginJson = await loginRes.json();
        if (loginJson.user._id !== teacherId)
            throw new Error(`Login returned wrong _id: ${loginJson.user._id}`);
        if (loginJson.user.password_hash)
            throw new Error('Security risk: password_hash leaked in login response!');
        const rawCookie = loginRes.headers.get('set-cookie') || '';
        const tokenCookie = rawCookie.split(';')[0];
        console.log('  ✓ Login returned 200, user._id is canonical User ID, no password_hash');
        const profileRes = await fetch(`${baseUrl}/api/auth/profile`, {
            headers: { Cookie: tokenCookie },
        });
        if (profileRes.status !== 200)
            throw new Error(`getProfile failed with ${profileRes.status}`);
        const profileJson = await profileRes.json();
        const profileUserData = profileJson.data;
        if (profileUserData._id !== teacherId) {
            throw new Error(`CRITICAL BUG: getProfile data._id is ${profileUserData._id}, expected ${teacherId} (was overwritten by StudentProfile ID)`);
        }
        if (profileUserData.password_hash)
            throw new Error('Security risk: password_hash leaked in getProfile!');
        console.log('  ✓ getProfile data._id matches canonical User ID (not overwritten by profile ID)');
        // 5. Updating Profile (Saving) and Verifying Persistence
        console.log('\n--- 5. Saving Profile Changes & Persistence ---');
        const testBio = `Leading STEM Educator • Live test ${Date.now()}`;
        const testQual = `B.Sc. Eng (Hons) Undergraduate • Attorney-at-Law (Reading)`;
        const editRes = await fetch(`${baseUrl}/api/auth/edit-user/${teacherId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: tokenCookie,
            },
            body: JSON.stringify({
                full_name: 'Danidu Lokuliyana',
                phone: '+94770000002',
                bio: testBio,
                qualifications: testQual,
            }),
        });
        if (editRes.status !== 200) {
            const errText = await editRes.text();
            throw new Error(`editUser failed: ${editRes.status} ${errText}`);
        }
        const editJson = await editRes.json();
        if (editJson.data.bio !== testBio)
            throw new Error(`Expected bio to be updated: ${editJson.data.bio}`);
        if (editJson.data._id !== teacherId)
            throw new Error(`editUser returned wrong _id: ${editJson.data._id}`);
        console.log('  ✓ PUT /api/auth/edit-user/:id updated bio and qualifications successfully');
        // Verify DB directly
        const dbProfile = await mongoose_1.default.connection.db.collection('studentprofiles').findOne({ user_id: new mongoose_1.default.Types.ObjectId(teacherId) });
        if (dbProfile?.bio !== testBio)
            throw new Error(`Database did not persist updated bio! Found: ${dbProfile?.bio}`);
        console.log('  ✓ MongoDB studentprofiles collection persisted updated bio directly');
        // 6. Graceful edit with profile ID
        console.log('\n--- 6. Graceful Edit using Profile ID ---');
        const testBio2 = `Leading STEM Educator • Pass 2 at ${Date.now()}`;
        const editFallbackRes = await fetch(`${baseUrl}/api/auth/edit-user/${profileId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Cookie: tokenCookie,
            },
            body: JSON.stringify({ bio: testBio2 }),
        });
        if (editFallbackRes.status !== 200) {
            const errText = await editFallbackRes.text();
            throw new Error(`editUser with profileId failed: ${editFallbackRes.status} ${errText}`);
        }
        console.log('  ✓ PUT /api/auth/edit-user/:id with profile ID gracefully resolves to user and updates');
        // 7. System Config leadTeacher dynamic population
        console.log('\n--- 7. Dynamic leadTeacher in /api/system/config ---');
        const configRes = await fetch(`${baseUrl}/api/system/config`);
        if (configRes.status !== 200)
            throw new Error(`getSystemConfig failed: ${configRes.status}`);
        const configJson = await configRes.json();
        const leadTeacher = configJson.data?.leadTeacher;
        if (!leadTeacher)
            throw new Error('leadTeacher not found in system config response!');
        if (leadTeacher.full_name !== 'Danidu Lokuliyana')
            throw new Error(`Wrong leadTeacher name: ${leadTeacher.full_name}`);
        if (leadTeacher.bio !== testBio2)
            throw new Error(`leadTeacher bio does not match latest update! Got: ${leadTeacher.bio}`);
        if (!leadTeacher.qualifications)
            throw new Error('leadTeacher qualifications missing!');
        console.log('  ✓ /api/system/config dynamically returned updated leadTeacher:');
        console.log(`     - Name: ${leadTeacher.full_name}`);
        console.log(`     - Bio: ${leadTeacher.bio}`);
        console.log(`     - Qualifications: ${leadTeacher.qualifications}`);
        console.log('\n========================================================');
        console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
        console.log('========================================================');
    }
    finally {
        server.close();
        await mongoose_1.default.disconnect();
    }
}
runTests().catch((err) => {
    console.error('\n❌ VERIFICATION TEST FAILED:', err);
    process.exit(1);
});
