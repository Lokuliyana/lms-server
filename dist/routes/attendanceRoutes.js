"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const attendanceController_1 = require("../controllers/attendanceController");
const router = (0, express_1.Router)();
// Student access to own attendance
router.get("/my", auth_1.authenticate, attendanceController_1.getMyAttendance);
// Attendance Roster endpoints for live session marking
router.get("/classes/:classId/session", (0, auth_1.requirePermission)("attendance.mark"), attendanceController_1.getSessionRoster);
router.get("/class/:classId/roster", (0, auth_1.requirePermission)("attendance.mark"), attendanceController_1.getSessionRoster);
router.post("/classes/:classId/mark-bulk", (0, auth_1.requirePermission)("attendance.mark"), attendanceController_1.markBulkAttendance);
router.post("/class/:classId/roster", (0, auth_1.requirePermission)("attendance.mark"), attendanceController_1.markBulkAttendance);
// Core attendance endpoints
router.post("/", (0, auth_1.requirePermission)("attendance.mark"), attendanceController_1.markAttendance);
router.put("/:id", (0, auth_1.requirePermission)("attendance.mark"), attendanceController_1.updateAttendance);
router.get("/class/:classId", (0, auth_1.requirePermission)("attendance.view"), attendanceController_1.getClassAttendance);
router.get("/class/:classId/stats", (0, auth_1.requirePermission)("attendance.view"), attendanceController_1.getClassAttendanceStats);
exports.default = router;
