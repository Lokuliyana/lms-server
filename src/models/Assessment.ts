import mongoose, { Document, Schema } from 'mongoose';

export interface IAssessment extends Document {
  frontend_id?: string;
  type: 'quiz' | 'challenge';
  class_id?: mongoose.Types.ObjectId;
  title: string;
  instructions: string;
  is_active: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject?: string;
  time_limit_sec: number;
  question_count?: number;
  version: number;
  matchmaking_enabled: boolean;
  async_enabled: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  is_deleted: boolean;
}

const assessmentSchema = new Schema<IAssessment>({
  frontend_id: { type: String, sparse: true, unique: true },
  type: { type: String, enum: ['quiz', 'challenge'], required: true, default: 'quiz' },
  class_id: { type: Schema.Types.ObjectId, ref: 'Class', required: false },
  title: { type: String, required: true },
  instructions: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  subject: { type: String },
  time_limit_sec: { type: Number, default: 0 },
  question_count: { type: Number },
  version: { type: Number, default: 1 },
  matchmaking_enabled: { type: Boolean, default: true },
  async_enabled: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now },
  is_deleted: { type: Boolean, default: false },
});

assessmentSchema.index({ class_id: 1, is_active: 1 });
assessmentSchema.index({ subject: 1, difficulty: 1 });
assessmentSchema.index({ type: 1 });

export const Assessment = mongoose.models.Assessment || mongoose.model<IAssessment>('Assessment', assessmentSchema);
