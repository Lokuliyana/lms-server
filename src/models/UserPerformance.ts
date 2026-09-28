// UserPerformance.js  (replace your current PerformanceView with this)
import mongoose from "mongoose";
const { Schema } = mongoose;

const userPerformanceSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  scope_type: { type: String, enum: ['global','subject','class','quiz'], required: true },
  scope_id: { type: Schema.Types.ObjectId }, // null for global & subject
  subject: { type: String },                 // set for subject scope

  window: { type: String, enum: ['lifetime','weekly','monthly','season'], default: 'lifetime' },
  window_key: { type: String }, // e.g. "2025-W32", "2025-08", or season UUID

  attempts: { type: Number, default: 0 },
  sum_score: { type: Number, default: 0 },
  sum_time_sec: { type: Number, default: 0 },
  sum_sq_score: { type: Number, default: 0 }, // for variance/consistency

  average_score: { type: Number, default: 0 },
  efficiency: { type: Number, default: 0 }, // average_score / average_time_sec
  consistency: { type: Number, default: 0 }, // 1 / (1 + std_dev) or similar
  streak: { type: Number, default: 0 }, // consecutive improved attempts (or consecutive days—pick one definition)
  last_attempt_at: { type: Date },

  elo: { type: Number, default: 1200 },

  generated_at: { type: Date, default: Date.now },
}, { timestamps: true });

userPerformanceSchema.index(
  { user_id: 1, scope_type: 1, scope_id: 1, subject: 1, window: 1, window_key: 1 },
  { unique: true, sparse: true }
);

userPerformanceSchema.index({ scope_type: 1, scope_id: 1, window: 1, window_key: 1, average_score: -1 });
userPerformanceSchema.index({ scope_type: 1, scope_id: 1, window: 1, window_key: 1, elo: -1 });

export const UserPerformance = mongoose.model('UserPerformance', userPerformanceSchema);
