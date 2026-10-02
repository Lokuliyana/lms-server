import mongoose, { Schema, Document } from "mongoose";

export interface IStudentScore {
  studentId: mongoose.Types.ObjectId;
  marksObtained: number;
  percentage: number;
  grade: string;
  isAbsent?: boolean;
  remarks?: string;
}

export interface IExamResult extends Document {
  examId?: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  examTitle: string;
  examDate: Date;
  termOrMonth: string;
  maxMarks: number;
  passMarks: number;
  isPublished: boolean;
  recordedBy: mongoose.Types.ObjectId;
  scores: IStudentScore[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentScoreSchema = new Schema<IStudentScore>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    marksObtained: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, default: "F" },
    isAbsent: { type: Boolean, default: false },
    remarks: { type: String, default: "" },
  },
  { _id: false }
);

const ExamResultSchema = new Schema<IExamResult>(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: false, index: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    examTitle: { type: String, required: true },
    examDate: { type: Date, required: true },
    termOrMonth: { type: String, default: "" },
    maxMarks: { type: Number, required: true, default: 100 },
    passMarks: { type: Number, default: 40 },
    isPublished: { type: Boolean, default: false, index: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scores: [StudentScoreSchema],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

ExamResultSchema.index({ classId: 1, isPublished: 1, examDate: -1 });
ExamResultSchema.index({ "scores.studentId": 1 });

export const ExamResult = (mongoose.models.ExamResult as mongoose.Model<IExamResult>) || mongoose.model<IExamResult>("ExamResult", ExamResultSchema);
export default ExamResult;
