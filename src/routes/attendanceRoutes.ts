import { Router } from "express";
import { requirePermission, authenticate } from "../middlewares/auth";
import {
  markAttendance,
  updateAttendance,
  getClassAttendance,
  getMyAttendance,
  getClassAttendanceStats,
  getSessionRoster,
  markBulkAttendance,
} from "../controllers/attendanceController";

const router = Router();

// Student access to own attendance
router.get("/my", authenticate, getMyAttendance);

// Attendance Roster endpoints for live session marking
router.get("/classes/:classId/session", requirePermission("attendance.mark"), getSessionRoster);
router.get("/class/:classId/roster", requirePermission("attendance.mark"), getSessionRoster);
router.post("/classes/:classId/mark-bulk", requirePermission("attendance.mark"), markBulkAttendance);
router.post("/class/:classId/roster", requirePermission("attendance.mark"), markBulkAttendance);

// Core attendance endpoints
router.post("/", requirePermission("attendance.mark"), markAttendance);
router.put("/:id", requirePermission("attendance.mark"), updateAttendance);
router.get("/class/:classId", requirePermission("attendance.view"), getClassAttendance);
router.get("/class/:classId/stats", requirePermission("attendance.view"), getClassAttendanceStats);

export default router;
