import mongoose, { Schema, Document } from 'mongoose';

export interface IExam extends Document {
  title: string;
  description?: string;
  class_id: mongoose.Types.ObjectId;
  exam_type: 'paper' | 'online' | 'hybrid';
  total_marks: number;
  pass_marks: number;
  held_date: Date;
  question_paper_url?: string;
  marking_scheme_url?: string;
  is_published: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const examSchema = new Schema<IExam>({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  class_id: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  exam_type: {
    type: String,
    enum: ['paper', 'online', 'hybrid'],
    default: 'paper',
  },
  total_marks: { type: Number, required: true, default: 100, min: 1 },
  pass_marks: { type: Number, required: true, default: 40, min: 0 },
  held_date: { type: Date, required: true, default: Date.now },
  question_paper_url: { type: String, default: '' },
  marking_scheme_url: { type: String, default: '' },
  is_published: { type: Boolean, default: false, index: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

examSchema.index({ class_id: 1, held_date: -1 });

export const Exam = (mongoose.models.Exam as mongoose.Model<IExam>) || mongoose.model<IExam>('Exam', examSchema);
