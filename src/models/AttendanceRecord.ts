import mongoose, { Schema, Document } from "mongoose";

export interface IStudentAttendance {
  studentId: mongoose.Types.ObjectId;
  status: "present" | "absent" | "late" | "excused";
  note?: string;
}

export interface IAttendanceRecord extends Document {
  classId: mongoose.Types.ObjectId;
  date: Date;
  sessionTitle: string;
  sessionType: "lecture" | "tutorial" | "revision" | "exam" | "other";
  markedBy: mongoose.Types.ObjectId;
  records: IStudentAttendance[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentAttendanceSchema = new Schema<IStudentAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      default: "present",
      required: true,
    },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    date: { type: Date, required: true, index: true },
    sessionTitle: { type: String, default: "Regular Class Session" },
    sessionType: {
      type: String,
      enum: ["lecture", "tutorial", "revision", "exam", "other"],
      default: "lecture",
    },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    records: [StudentAttendanceSchema],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Index for query optimization
AttendanceRecordSchema.index({ classId: 1, date: -1 });
AttendanceRecordSchema.index({ "records.studentId": 1 });

export const AttendanceRecord = mongoose.model<IAttendanceRecord>(
  "AttendanceRecord",
  AttendanceRecordSchema
);

export default AttendanceRecord;
