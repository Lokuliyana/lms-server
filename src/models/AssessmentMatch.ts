import mongoose, { Document, Schema } from 'mongoose';

export interface IAssessmentMatch extends Document {
  assessment_id: mongoose.Types.ObjectId;
  mode: 'live' | 'async';
  status: 'queued' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
  p1_id: mongoose.Types.ObjectId;
  p2_id?: mongoose.Types.ObjectId;
  class_id?: mongoose.Types.ObjectId;
  requires_enrollment: boolean;
  question_seed: string;
  assessment_version: number;
  time_limit_sec: number;
  p1_submission_id?: mongoose.Types.ObjectId;
  p2_submission_id?: mongoose.Types.ObjectId;
  p1_score_pct?: number;
  p2_score_pct?: number;
  p1_time_ms?: number;
  p2_time_ms?: number;
  winner?: mongoose.Types.ObjectId;
  p1_powerups: { key: 'fifty_fifty' | '+15s' | 'double'; at_ms: number; qid: mongoose.Types.ObjectId }[];
  p2_powerups: { key: 'fifty_fifty' | '+15s' | 'double'; at_ms: number; qid: mongoose.Types.ObjectId }[];
  p1_streak_max: number;
  p2_streak_max: number;
  tiebreak: 'faster_time' | 'sudden_death' | 'none';
  p1_elo_before?: number;
  p2_elo_before?: number;
  p1_elo_after?: number;
  p2_elo_after?: number;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

const assessmentMatchSchema = new Schema<IAssessmentMatch>({
  assessment_id: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  mode: { type: String, enum: ['live', 'async'], required: true },
  status: {
    type: String,
    enum: ['queued', 'in_progress', 'completed', 'expired', 'cancelled'],
    default: 'queued',
  },
  p1_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  p2_id: { type: Schema.Types.ObjectId, ref: 'User' },
  class_id: { type: Schema.Types.ObjectId, ref: 'Class' },
  requires_enrollment: { type: Boolean, default: false },
  question_seed: { type: String, required: true },
  assessment_version: { type: Number, required: true },
  time_limit_sec: { type: Number, default: 0 },
  p1_submission_id: { type: Schema.Types.ObjectId, ref: 'AssessmentSubmission' },
  p2_submission_id: { type: Schema.Types.ObjectId, ref: 'AssessmentSubmission' },
  p1_score_pct: Number,
  p2_score_pct: Number,
  p1_time_ms: Number,
  p2_time_ms: Number,
  winner: { type: Schema.Types.ObjectId, ref: 'User' },
  p1_powerups: [
    {
      key: { type: String, enum: ['fifty_fifty', '+15s', 'double'] },
      at_ms: Number,
      qid: Schema.Types.ObjectId,
    },
  ],
  p2_powerups: [
    {
      key: { type: String, enum: ['fifty_fifty', '+15s', 'double'] },
      at_ms: Number,
      qid: Schema.Types.ObjectId,
    },
  ],
  p1_streak_max: { type: Number, default: 0 },
  p2_streak_max: { type: Number, default: 0 },
  tiebreak: {
    type: String,
    enum: ['faster_time', 'sudden_death', 'none'],
    default: 'none',
  },
  p1_elo_before: Number,
  p2_elo_before: Number,
  p1_elo_after: Number,
  p2_elo_after: Number,
  created_at: { type: Date, default: Date.now },
  started_at: { type: Date },
  completed_at: { type: Date },
});

assessmentMatchSchema.index({ status: 1, mode: 1, class_id: 1 });
assessmentMatchSchema.index({ p1_id: 1, status: 1 });
assessmentMatchSchema.index({ p2_id: 1, status: 1 });
assessmentMatchSchema.index({ assessment_id: 1, created_at: 1 });

export const AssessmentMatch = mongoose.models.AssessmentMatch || mongoose.model<IAssessmentMatch>('AssessmentMatch', assessmentMatchSchema);
