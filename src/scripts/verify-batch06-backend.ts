import mongoose from "mongoose";
import http from "http";
import { app } from "../app";
import { User } from "../models/User";
import { Class } from "../models/Class";
import { Subject } from "../models/Subject";
import { Grade } from "../models/Grade";
import { Recording } from "../models/Recording";
import { seedPermissionsAndRoles } from "./seedPermissions";
import bcrypt from "bcrypt";

async function run() {
  console.log("==================================================");
  console.log("       BATCH 06 BACKEND VERIFICATION SUITE        ");
  console.log("==================================================");

  process.env.LOCAL_STORAGE_MODE = "true";

  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms");
  await seedPermissionsAndRoles();

  const hashedPassword = await bcrypt.hash("password123", 10);
  await User.updateMany(
    { email: { $in: ["teacher@lms.com", "student@lms.com"] } },
    { $set: { password_hash: hashedPassword } }
  );

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  async function login(email: string) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password: "password123" }),
    });
    const cookie = res.headers.get("set-cookie") || "";
    const body: any = await res.json();
    const token = body?.token || body?.data?.token || "";
    return { status: res.status, cookie, token, user: body?.user || body?.data?.user };
  }

  const teacher = await login("teacher@lms.com");
  const teacherHeaders = { "Content-Type": "application/json", Cookie: teacher.cookie, Authorization: `Bearer ${teacher.token}` };

  let passed = 0;
  let failed = 0;
  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  // 1. LOCAL_STORAGE_MODE media upload & deletion
  console.log("\n--- TEST 1: Offline Local Media Storage ---");
  const form = new globalThis.FormData();
  const fileBlob = new Blob(["dummy test file content for local storage"], { type: "image/png" });
  form.append("file", fileBlob, "test-thumbnail.png");
  form.append("ownerType", "class");
  form.append("ownerId", "new"); // Verify ownerId: 'new' doesn't crash CastError

  const uploadRes = await fetch(`${baseUrl}/api/media/upload`, {
    method: "POST",
    headers: {
      Cookie: teacher.cookie,
      Authorization: `Bearer ${teacher.token}`,
    },
    body: form,
  });

  const uploadJson: any = await uploadRes.json();
  assert("Media upload succeeds with ownerId: 'new' without CastError", uploadRes.status === 200 && uploadJson.success === true, JSON.stringify(uploadJson));
  assert("Media upload returns local URL under /uploads/", typeof uploadJson.publicUrl === "string" && uploadJson.publicUrl.includes("/uploads/"), uploadJson.publicUrl);

  const fs = require('fs');
  const path = require('path');
  const uploadedDiskPath = path.join(process.cwd(), 'public/uploads', uploadJson.filePath);
  assert("Media file actually written to local public/uploads directory", fs.existsSync(uploadedDiskPath), uploadedDiskPath);

  // Test media deletion via public URL
  const deleteRes = await fetch(`${baseUrl}/api/media/delete`, {
    method: "POST",
    headers: teacherHeaders,
    body: JSON.stringify({ filePath: uploadJson.publicUrl }),
  });
  const deleteJson: any = await deleteRes.json();
  assert("Media deletion handles full /uploads/ URL cleanly", deleteRes.status === 200 && deleteJson.success === true, JSON.stringify(deleteJson));
  assert("Media file unlinked from disk upon deletion", !fs.existsSync(uploadedDiskPath), uploadedDiskPath);

  // 2. Canonical Class API Routing Alignment
  console.log("\n--- TEST 2: Canonical Class API Routing Alignment ---");
  const classPayload = {
    title: "Batch 06 Alignment Class",
    description: "Testing /create and canonical /",
    format: "theory",
    type: "regular",
    price: 3000,
    delivery_type: "both",
    subject: "mathematics",
    grade: "11",
    batches: [{ batch_name: "Batch 1", day: "Sunday", start: "10:00", end: "12:00" }],
  };

  const createAliasRes = await fetch(`${baseUrl}/api/classes/create`, {
    method: "POST",
    headers: teacherHeaders,
    body: JSON.stringify(classPayload),
  });
  const createAliasJson: any = await createAliasRes.json();
  assert("POST /api/classes/create returns 201 Created", createAliasRes.status === 201 && !!createAliasJson.data?._id, JSON.stringify(createAliasJson));

  const canonicalRes = await fetch(`${baseUrl}/api/classes`, {
    method: "POST",
    headers: teacherHeaders,
    body: JSON.stringify({ ...classPayload, title: "Batch 06 Canonical Class" }),
  });
  const canonicalJson: any = await canonicalRes.json();
  assert("POST /api/classes returns 201 Created", canonicalRes.status === 201 && !!canonicalJson.data?._id, JSON.stringify(canonicalJson));

  const classId = canonicalJson.data?._id;

  // 3. Quiz Taxonomy ObjectId Sanitization
  console.log("\n--- TEST 3: Quiz Taxonomy ObjectId Sanitization ---");
  const quizRes = await fetch(`${baseUrl}/api/quizzes`, {
    method: "POST",
    headers: teacherHeaders,
    body: JSON.stringify({
      title: "Chemistry Organic Quiz",
      instructions: "Taxonomy resolver verification",
      class_id: classId,
      subject: "Chemistry", // String subject!
      grade: "10",          // String grade!
      difficulty: "Medium",
      time_limit_sec: 900,
    }),
  });
  const quizJson: any = await quizRes.json();
  assert("Quiz creation with string subject & grade resolves without CastError (201)", quizRes.status === 201 && !!quizJson.quiz?._id, JSON.stringify(quizJson));
  assert("Quiz stored with valid ObjectId for subject and grade", mongoose.Types.ObjectId.isValid(quizJson.quiz?.subject) && mongoose.Types.ObjectId.isValid(quizJson.quiz?.grade), JSON.stringify(quizJson.quiz));

  // 4. Class-Linked Recording Storage & Playback
  console.log("\n--- TEST 4: Class-Linked Recording Storage & Playback ---");
  const recRes = await fetch(`${baseUrl}/api/recordings`, {
    method: "POST",
    headers: teacherHeaders,
    body: JSON.stringify({
      class_id: classId,
      title: "Session 01 Local Recording",
      driveUrl: "http://127.0.0.1:5000/uploads/class/test-video.mp4",
      session_date: "2026-10-02",
      batch_name: "Batch 1",
    }),
  });
  const recJson: any = await recRes.json();
  assert("Recording created with local/direct video URL (201)", recRes.status === 201 && !!recJson.recording?._id, JSON.stringify(recJson));
  const recordingId = recJson.recording?._id;

  // Verify Class document recordings array is linked
  const updatedClass = await Class.findById(classId).lean();
  assert("Class document linked with recording _id in recordings array", updatedClass?.recordings?.some((r: any) => String(r) === String(recordingId)), JSON.stringify(updatedClass?.recordings));

  // Get recording by ID
  const getRecRes = await fetch(`${baseUrl}/api/recordings/${recordingId}`, {
    headers: teacherHeaders,
  });
  const getRecJson: any = await getRecRes.json();
  assert("GET /api/recordings/:id returns populated recording and direct playback URL", getRecRes.status === 200 && !!getRecJson.recording?.playback_url, JSON.stringify(getRecJson));

  // Get recordings by class
  const getByClassRes = await fetch(`${baseUrl}/api/recordings/class/${classId}`, {
    headers: teacherHeaders,
  });
  const getByClassJson: any = await getByClassRes.json();
  assert("GET /api/recordings/class/:classId returns class recordings", getByClassRes.status === 200 && Array.isArray(getByClassJson.recordings) && getByClassJson.recordings.length > 0, JSON.stringify(getByClassJson));

  const getByClassRouteRes = await fetch(`${baseUrl}/api/classes/${classId}/recordings`, {
    headers: teacherHeaders,
  });
  const getByClassRouteJson: any = await getByClassRouteRes.json();
  assert("GET /api/classes/:id/recordings returns class recordings", getByClassRouteRes.status === 200 && Array.isArray(getByClassRouteJson.data), JSON.stringify(getByClassRouteJson));

  // Test recording deletion unlinks from Class
  const delRecRes = await fetch(`${baseUrl}/api/recordings/${recordingId}`, {
    method: "DELETE",
    headers: teacherHeaders,
  });
  assert("DELETE /api/recordings/:id returns 200", delRecRes.status === 200);
  const classAfterDelete = await Class.findById(classId).lean();
  assert("Class document unlinks recording _id upon deletion", !classAfterDelete?.recordings?.some((r: any) => String(r) === String(recordingId)));

  console.log("\n==================================================");
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log("==================================================");

  server.close();
  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
