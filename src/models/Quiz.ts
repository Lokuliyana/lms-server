import mongoose from "mongoose";
const { Schema } = mongoose;

const quizSchema = new Schema({
  frontend_id: { type: String, sparse: true, unique: true },
  class_id: { type: Schema.Types.ObjectId, ref: 'Class', required: false },
  title: { type: String, required: true },
  instructions: { type: String, required: true },
  type: { type: String, enum: ["quiz", "challenge"], default: "quiz" },
  is_active: { type: Boolean, default: true },
  difficulty: { type: String, enum: ['Easy','Medium','Hard'], default: 'Easy' },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
  grade: { type: Schema.Types.ObjectId, ref: 'Grade' },
  time_limit_sec: { type: Number, default: 0 },
  question_count: { type: Number },            
  version: { type: Number, default: 1 },    
  matchmaking_enabled: { type: Boolean, default: true },
  async_enabled: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now },
  is_deleted: { type: Boolean, default: false },
});

// helpful indexes
quizSchema.index({ class_id: 1, is_active: 1 });
quizSchema.index({ subject: 1, difficulty: 1 });

export const Quiz = mongoose.model('Quiz', quizSchema);
