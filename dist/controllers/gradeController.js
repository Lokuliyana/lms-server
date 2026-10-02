"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportClassExamResults = exports.getMyExamResults = exports.getClassExamResults = exports.togglePublishExamResults = exports.updateExamResults = exports.recordExamResults = void 0;
exports.calculateGrade = calculateGrade;
const mongoose_1 = __importDefault(require("mongoose"));
const ExamResult_1 = __importDefault(require("../models/ExamResult"));
const Class_1 = require("../models/Class");
function calculateGrade(percentage) {
    if (percentage >= 85)
        return "A+";
    if (percentage >= 75)
        return "A";
    if (percentage >= 65)
        return "B";
    if (percentage >= 55)
        return "C";
    if (percentage >= 40)
        return "S";
    return "F";
}
const recordExamResults = async (req, res) => {
    try {
        const { classId, examTitle, examDate, termOrMonth, maxMarks = 100, passMarks = 40, isPublished = false, scores = [], notes = "", } = req.body;
        const userId = req.user?.userId || req.user?._id;
        if (!classId || !examTitle || !examDate) {
            res.status(400).json({ success: false, message: "classId, examTitle, and examDate are required" });
            return;
        }
        const classDoc = await Class_1.Class.findById(classId);
        if (!classDoc || classDoc.is_deleted) {
            res.status(404).json({ success: false, message: "Class not found" });
            return;
        }
        const max = Number(maxMarks) > 0 ? Number(maxMarks) : 100;
        const computedScores = (scores || []).map((s) => {
            const marks = Number(s.marksObtained) || 0;
            const pct = Math.round((marks / max) * 100 * 10) / 10;
            return {
                studentId: new mongoose_1.default.Types.ObjectId(s.studentId),
                marksObtained: marks,
                percentage: pct,
                grade: s.grade || calculateGrade(pct),
                remarks: s.remarks || "",
            };
        });
        const result = await ExamResult_1.default.create({
            classId: new mongoose_1.default.Types.ObjectId(classId),
            examTitle,
            examDate: new Date(examDate),
            termOrMonth: termOrMonth || "",
            maxMarks: max,
            passMarks: Number(passMarks) || 40,
            isPublished: Boolean(isPublished),
            recordedBy: new mongoose_1.default.Types.ObjectId(userId),
            scores: computedScores,
            notes,
        });
        const populated = await ExamResult_1.default.findById(result._id)
            .populate("recordedBy", "name email full_name")
            .populate("scores.studentId", "name email full_name username student_profile");
        res.status(201).json({ success: true, data: populated });
    }
    catch (err) {
        console.error("Error recording exam results:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to record exam results" });
    }
};
exports.recordExamResults = recordExamResults;
const updateExamResults = async (req, res) => {
    try {
        const { id } = req.params;
        const { examTitle, examDate, termOrMonth, maxMarks, passMarks, isPublished, scores, notes } = req.body;
        const userId = req.user?.userId || req.user?._id;
        const result = await ExamResult_1.default.findById(id);
        if (!result) {
            res.status(404).json({ success: false, message: "Exam result not found" });
            return;
        }
        if (examTitle)
            result.examTitle = examTitle;
        if (examDate)
            result.examDate = new Date(examDate);
        if (termOrMonth !== undefined)
            result.termOrMonth = termOrMonth;
        if (maxMarks !== undefined)
            result.maxMarks = Number(maxMarks);
        if (passMarks !== undefined)
            result.passMarks = Number(passMarks);
        if (isPublished !== undefined)
            result.isPublished = Boolean(isPublished);
        if (notes !== undefined)
            result.notes = notes;
        const max = result.maxMarks || 100;
        if (scores && Array.isArray(scores)) {
            result.scores = scores.map((s) => {
                const marks = Number(s.marksObtained) || 0;
                const pct = Math.round((marks / max) * 100 * 10) / 10;
                return {
                    studentId: new mongoose_1.default.Types.ObjectId(s.studentId),
                    marksObtained: marks,
                    percentage: pct,
                    grade: s.grade || calculateGrade(pct),
                    remarks: s.remarks || "",
                };
            });
        }
        result.recordedBy = new mongoose_1.default.Types.ObjectId(userId);
        await result.save();
        const populated = await ExamResult_1.default.findById(result._id)
            .populate("recordedBy", "name email full_name")
            .populate("scores.studentId", "name email full_name username student_profile");
        res.json({ success: true, data: populated });
    }
    catch (err) {
        console.error("Error updating exam results:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to update exam results" });
    }
};
exports.updateExamResults = updateExamResults;
const togglePublishExamResults = async (req, res) => {
    try {
        const { id } = req.params;
        const { isPublished } = req.body;
        const result = await ExamResult_1.default.findById(id);
        if (!result) {
            res.status(404).json({ success: false, message: "Exam result not found" });
            return;
        }
        result.isPublished = isPublished !== undefined ? Boolean(isPublished) : !result.isPublished;
        await result.save();
        res.json({
            success: true,
            message: `Exam results ${result.isPublished ? "published" : "unpublished"} successfully`,
            isPublished: result.isPublished,
        });
    }
    catch (err) {
        console.error("Error toggling publish status:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to toggle publish status" });
    }
};
exports.togglePublishExamResults = togglePublishExamResults;
const getClassExamResults = async (req, res) => {
    try {
        const { classId } = req.params;
        const user = req.user;
        const permissions = user?.permissions || [];
        const isPrivileged = permissions.includes("grades.record") ||
            permissions.includes("grades.publish") ||
            ["teacher", "admin", "moderator"].includes(user?.role);
        const query = { classId: new mongoose_1.default.Types.ObjectId(classId) };
        if (!isPrivileged) {
            query.isPublished = true;
        }
        const list = await ExamResult_1.default.find(query)
            .sort({ examDate: -1 })
            .populate("recordedBy", "name email full_name")
            .populate("scores.studentId", "name email full_name username student_profile")
            .lean();
        // If student, compute summary stats and keep only their score or anonymous ranking
        if (!isPrivileged) {
            const studentId = (user?.userId || user?._id || "").toString();
            const studentView = list.map((exam) => {
                const scores = exam.scores || [];
                const total = scores.length;
                const totalMarks = scores.reduce((sum, s) => sum + (s.marksObtained || 0), 0);
                const avg = total > 0 ? Math.round((totalMarks / total) * 10) / 10 : 0;
                const highest = scores.reduce((max, s) => Math.max(max, s.marksObtained || 0), 0);
                const lowest = total > 0 ? scores.reduce((min, s) => Math.min(min, s.marksObtained || 0), exam.maxMarks) : 0;
                const myScore = scores.find((s) => {
                    const sid = s.studentId?._id ? s.studentId._id.toString() : s.studentId?.toString();
                    return sid === studentId;
                });
                return {
                    _id: exam._id,
                    classId: exam.classId,
                    examTitle: exam.examTitle,
                    examDate: exam.examDate,
                    termOrMonth: exam.termOrMonth,
                    maxMarks: exam.maxMarks,
                    passMarks: exam.passMarks,
                    stats: {
                        averageScore: avg,
                        averagePercentage: Math.round((avg / exam.maxMarks) * 100),
                        highestScore: highest,
                        lowestScore: lowest,
                        totalStudents: total,
                    },
                    myScore: myScore
                        ? {
                            marksObtained: myScore.marksObtained,
                            percentage: myScore.percentage,
                            grade: myScore.grade,
                            remarks: myScore.remarks,
                        }
                        : null,
                };
            });
            res.json({ success: true, data: studentView });
            return;
        }
        res.json({ success: true, data: list });
    }
    catch (err) {
        console.error("Error fetching class exam results:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to fetch exam results" });
    }
};
exports.getClassExamResults = getClassExamResults;
const getMyExamResults = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?._id;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { classId } = req.query;
        const studentObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const query = {
            isPublished: true,
            "scores.studentId": studentObjectId,
        };
        if (classId) {
            query.classId = new mongoose_1.default.Types.ObjectId(classId);
        }
        const list = await ExamResult_1.default.find(query)
            .sort({ examDate: -1 })
            .populate("classId", "title subject grade format")
            .lean();
        const results = list.map((exam) => {
            const scores = exam.scores || [];
            const total = scores.length;
            const sorted = [...scores].sort((a, b) => b.marksObtained - a.marksObtained);
            const myScore = scores.find((s) => s.studentId?.toString() === studentObjectId.toString());
            const myRank = sorted.findIndex((s) => s.studentId?.toString() === studentObjectId.toString()) + 1;
            const totalMarks = scores.reduce((sum, s) => sum + (s.marksObtained || 0), 0);
            const avgMarks = total > 0 ? Math.round((totalMarks / total) * 10) / 10 : 0;
            return {
                _id: exam._id,
                class: exam.classId,
                examTitle: exam.examTitle,
                examDate: exam.examDate,
                termOrMonth: exam.termOrMonth,
                maxMarks: exam.maxMarks,
                passMarks: exam.passMarks,
                myScore: myScore
                    ? {
                        marksObtained: myScore.marksObtained,
                        percentage: myScore.percentage,
                        grade: myScore.grade,
                        remarks: myScore.remarks,
                        rank: myRank > 0 ? myRank : null,
                        totalStudents: total,
                    }
                    : null,
                classStats: {
                    averageMarks: avgMarks,
                    averagePercentage: Math.round((avgMarks / exam.maxMarks) * 100),
                    highestMarks: sorted[0]?.marksObtained ?? 0,
                },
            };
        });
        res.json({ success: true, data: results });
    }
    catch (err) {
        console.error("Error fetching my exam results:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to fetch student exam results" });
    }
};
exports.getMyExamResults = getMyExamResults;
const exportClassExamResults = async (req, res) => {
    try {
        const user = req.user;
        const permissions = user?.permissions || [];
        const isPrivileged = permissions.includes("grades.exportReport") ||
            permissions.includes("grades.record") ||
            permissions.includes("grades.publish") ||
            ["teacher", "admin", "moderator"].includes(user?.role);
        if (!isPrivileged) {
            res.status(403).json({ success: false, message: "Forbidden: Only staff may export full class rosters and exam records" });
            return;
        }
        const { id } = req.params;
        const exam = await ExamResult_1.default.findById(id)
            .populate("classId", "title")
            .populate("scores.studentId", "name email full_name username")
            .lean();
        if (!exam) {
            res.status(404).json({ success: false, message: "Exam result not found" });
            return;
        }
        const className = exam.classId?.title || "Class";
        const rows = [
            ["Class", className],
            ["Exam Title", exam.examTitle],
            ["Date", new Date(exam.examDate).toLocaleDateString()],
            ["Max Marks", String(exam.maxMarks)],
            ["Pass Marks", String(exam.passMarks)],
            [],
            ["Student Name", "Email", "Marks Obtained", "Percentage (%)", "Grade", "Remarks"],
        ];
        (exam.scores || []).forEach((s) => {
            const student = s.studentId;
            const name = student?.full_name || student?.name || student?.username || "Student";
            const email = student?.email || "";
            rows.push([
                `"${name}"`,
                `"${email}"`,
                String(s.marksObtained),
                String(s.percentage),
                s.grade,
                `"${(s.remarks || "").replace(/"/g, '""')}"`,
            ]);
        });
        const csvContent = rows.map((r) => r.join(",")).join("\n");
        const filename = `${exam.examTitle.replace(/[^a-z0-9]/gi, "_")}_Results.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(csvContent);
    }
    catch (err) {
        console.error("Error exporting exam results:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to export exam results" });
    }
};
exports.exportClassExamResults = exportClassExamResults;
