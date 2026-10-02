import { Request, Response } from "express";
import mongoose from "mongoose";
import AttendanceRecord from "../models/AttendanceRecord";
import { Class } from "../models/Class";
import { ClassEnrollment } from "../models/ClassEnrollment";

export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, date, sessionTitle, sessionType, records, notes } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?._id;

    if (!classId || !date || !Array.isArray(records)) {
      res.status(400).json({ success: false, message: "classId, date, and records array are required" });
      return;
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.is_deleted) {
      res.status(404).json({ success: false, message: "Class not found" });
      return;
    }

    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if an attendance record already exists for this class on this date and sessionTitle
    let attendance = await AttendanceRecord.findOne({
      classId,
      date: { $gte: startOfDay, $lte: endOfDay },
      ...(sessionTitle ? { sessionTitle } : {})
    });

    if (attendance) {
      // Update existing record
      attendance.records = records.map((r: any) => ({
        studentId: new mongoose.Types.ObjectId(r.studentId),
        status: r.status || "present",
        note: r.note || "",
      }));
      if (sessionTitle) attendance.sessionTitle = sessionTitle;
      if (sessionType) attendance.sessionType = sessionType;
      if (notes !== undefined) attendance.notes = notes;
      attendance.markedBy = new mongoose.Types.ObjectId(userId);
      await attendance.save();
    } else {
      // Create new record
      attendance = await AttendanceRecord.create({
        classId: new mongoose.Types.ObjectId(classId),
        date: attendanceDate,
        sessionTitle: sessionTitle || "Class Session",
        sessionType: sessionType || "lecture",
        markedBy: new mongoose.Types.ObjectId(userId),
        records: records.map((r: any) => ({
          studentId: new mongoose.Types.ObjectId(r.studentId),
          status: r.status || "present",
          note: r.note || "",
        })),
        notes: notes || "",
      });
    }

    const populated = await AttendanceRecord.findById(attendance._id)
      .populate("markedBy", "name email full_name")
      .populate("records.studentId", "name email full_name username student_profile");

    res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    console.error("Error marking attendance:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to mark attendance" });
  }
};

export const updateAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { records, sessionTitle, sessionType, notes, date } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?._id;

    const attendance = await AttendanceRecord.findById(id);
    if (!attendance) {
      res.status(404).json({ success: false, message: "Attendance record not found" });
      return;
    }

    if (records && Array.isArray(records)) {
      attendance.records = records.map((r: any) => ({
        studentId: new mongoose.Types.ObjectId(r.studentId),
        status: r.status || "present",
        note: r.note || "",
      }));
    }
    if (sessionTitle) attendance.sessionTitle = sessionTitle;
    if (sessionType) attendance.sessionType = sessionType;
    if (notes !== undefined) attendance.notes = notes;
    if (date) attendance.date = new Date(date);
    attendance.markedBy = new mongoose.Types.ObjectId(userId);

    await attendance.save();

    const populated = await AttendanceRecord.findById(attendance._id)
      .populate("markedBy", "name email full_name")
      .populate("records.studentId", "name email full_name username student_profile");

    res.json({ success: true, data: populated });
  } catch (err: any) {
    console.error("Error updating attendance:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to update attendance" });
  }
};

export const getClassAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const { from, to } = req.query;

    const query: any = { classId: new mongoose.Types.ObjectId(classId as string) };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from as string);
      if (to) query.date.$lte = new Date(to as string);
    }

    const records = await AttendanceRecord.find(query)
      .sort({ date: -1 })
      .populate("markedBy", "name email full_name")
      .populate("records.studentId", "name email full_name username student_profile");

    res.json({ success: true, data: records });
  } catch (err: any) {
    console.error("Error fetching class attendance:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch attendance" });
  }
};

export const getMyAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { classId } = req.query;
    const studentObjectId = new mongoose.Types.ObjectId(userId);

    const query: any = {
      "records.studentId": studentObjectId
    };
    if (classId) {
      query.classId = new mongoose.Types.ObjectId(classId as string);
    }

    const records = await AttendanceRecord.find(query)
      .sort({ date: -1 })
      .populate("classId", "title subject grade format")
      .lean();

    let totalSessions = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    const mySessions = records.map((sheet: any) => {
      const myEntry = sheet.records.find(
        (r: any) => r.studentId.toString() === studentObjectId.toString()
      );
      const status = myEntry?.status || "absent";
      totalSessions += 1;
      if (status === "present") presentCount += 1;
      else if (status === "late") lateCount += 1;
      else if (status === "absent") absentCount += 1;
      else if (status === "excused") excusedCount += 1;

      return {
        _id: sheet._id,
        class: sheet.classId,
        date: sheet.date,
        sessionTitle: sheet.sessionTitle,
        sessionType: sheet.sessionType,
        status,
        note: myEntry?.note || "",
      };
    });

    const attendedCount = presentCount + lateCount;
    const rate = totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0;

    res.json({
      success: true,
      stats: {
        totalSessions,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        attendanceRate: rate,
      },
      sessions: mySessions,
    });
  } catch (err: any) {
    console.error("Error fetching student attendance:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch student attendance" });
  }
};

export const getClassAttendanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;

    const records = await AttendanceRecord.find({ classId: new mongoose.Types.ObjectId(classId as string) })
      .populate("records.studentId", "name email full_name username")
      .lean();

    const totalSessions = records.length;
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalExcused = 0;
    let totalEntries = 0;

    const studentMap: Record<string, {
      student: any;
      total: number;
      present: number;
      late: number;
      absent: number;
      excused: number;
    }> = {};

    records.forEach((sheet: any) => {
      sheet.records.forEach((r: any) => {
        if (!r.studentId) return;
        const sid = r.studentId._id ? r.studentId._id.toString() : r.studentId.toString();
        if (!studentMap[sid]) {
          studentMap[sid] = {
            student: r.studentId,
            total: 0,
            present: 0,
            late: 0,
            absent: 0,
            excused: 0,
          };
        }

        studentMap[sid].total += 1;
        totalEntries += 1;

        if (r.status === "present") {
          studentMap[sid].present += 1;
          totalPresent += 1;
        } else if (r.status === "late") {
          studentMap[sid].late += 1;
          totalLate += 1;
        } else if (r.status === "absent") {
          studentMap[sid].absent += 1;
          totalAbsent += 1;
        } else if (r.status === "excused") {
          studentMap[sid].excused += 1;
          totalExcused += 1;
        }
      });
    });

    const studentStats = Object.values(studentMap).map((item) => {
      const attended = item.present + item.late;
      const rate = item.total > 0 ? Math.round((attended / item.total) * 100) : 0;
      return {
        ...item,
        rate,
      };
    });

    const overallRate = totalEntries > 0
      ? Math.round(((totalPresent + totalLate) / totalEntries) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        totalSessions,
        totalEntries,
        totalPresent,
        totalLate,
        totalAbsent,
        totalExcused,
        overallRate,
      },
      students: studentStats,
    });
  } catch (err: any) {
    console.error("Error fetching class attendance stats:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch attendance stats" });
  }
};

export const getSessionRoster = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.is_deleted) {
      res.status(404).json({ success: false, message: "Class not found" });
      return;
    }

    const enrollments = await ClassEnrollment.find({
      classId: new mongoose.Types.ObjectId(classId as string),
      status: 'active',
    }).populate('userId', 'first_name last_name email phone username');

    const queryDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sheet = await AttendanceRecord.findOne({
      classId: new mongoose.Types.ObjectId(classId as string),
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const roster = enrollments
      .map((enr: any) => {
        const student = enr.userId;
        if (!student) return null;
        const sid = student._id.toString();
        const existingEntry = sheet?.records?.find(
          (r: any) => r.studentId && r.studentId.toString() === sid
        );

        return {
          studentId: student._id,
          first_name: student.first_name || '',
          last_name: student.last_name || '',
          email: student.email || '',
          phone: student.phone || '',
          status: existingEntry?.status || 'unmarked',
          note: existingEntry?.note || '',
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        class: {
          _id: classDoc._id,
          title: classDoc.title,
          class_code: classDoc.class_code,
        },
        date: queryDate,
        existingRecordId: sheet?._id || null,
        sessionTitle: sheet?.sessionTitle || 'Regular Class Session',
        sessionType: sheet?.sessionType || 'lecture',
        notes: sheet?.notes || '',
        roster,
      },
    });
  } catch (err: any) {
    console.error("Error fetching session roster:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch session roster" });
  }
};

export const markBulkAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const { date, sessionTitle, sessionType, records, notes } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?._id;

    if (!classId || !date || !Array.isArray(records)) {
      res.status(400).json({ success: false, message: "classId, date, and records array are required" });
      return;
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.is_deleted) {
      res.status(404).json({ success: false, message: "Class not found" });
      return;
    }

    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    let sheet = await AttendanceRecord.findOne({
      classId: new mongoose.Types.ObjectId(classId as string),
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const formattedRecords = records.map((r: any) => ({
      studentId: new mongoose.Types.ObjectId(r.studentId || r.student_id),
      status: r.status === 'unmarked' ? 'absent' : (r.status || 'present'),
      note: r.note || '',
    }));

    if (sheet) {
      sheet.records = formattedRecords as any;
      if (sessionTitle) sheet.sessionTitle = sessionTitle;
      if (sessionType) sheet.sessionType = sessionType;
      if (notes !== undefined) sheet.notes = notes;
      sheet.markedBy = new mongoose.Types.ObjectId(userId);
      await sheet.save();
    } else {
      sheet = await AttendanceRecord.create({
        classId: new mongoose.Types.ObjectId(classId as string),
        date: attendanceDate,
        sessionTitle: sessionTitle || 'Regular Class Session',
        sessionType: sessionType || 'lecture',
        markedBy: new mongoose.Types.ObjectId(userId),
        records: formattedRecords,
        notes: notes || '',
      });
    }

    res.json({
      success: true,
      message: 'Attendance saved successfully',
      data: sheet,
    });
  } catch (err: any) {
    console.error("Error in markBulkAttendance:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to save attendance" });
  }
};

