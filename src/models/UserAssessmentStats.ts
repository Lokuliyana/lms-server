import mongoose, { Document, Schema } from 'mongoose';

export interface IUserAssessmentStats extends Document {
  user_id: mongoose.Types.ObjectId;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
  streak: number;
  last_played_at?: Date;
  by_subject: {
    subject: string;
    elo: number;
    wins: number;
    losses: number;
  }[];
  by_class: {
    class_id: mongoose.Types.ObjectId;
    elo: number;
    wins: number;
    losses: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const userAssessmentStatsSchema = new Schema<IUserAssessmentStats>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', unique: true },
  elo: { type: Number, default: 1200 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  ties: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  last_played_at: { type: Date },

  by_subject: [{
    subject: String,
    elo: Number,
    wins: Number,
    losses: Number
  }],
  by_class: [{
    class_id: { type: Schema.Types.ObjectId, ref: 'Class' },
    elo: Number,
    wins: Number,
    losses: Number
  }]
}, { timestamps: true });

userAssessmentStatsSchema.index({ elo: -1 });
userAssessmentStatsSchema.index({ 'by_subject.subject': 1, 'by_subject.elo': -1 });
userAssessmentStatsSchema.index({ 'by_class.class_id': 1, 'by_class.elo': -1 });

export const UserAssessmentStats = mongoose.models.UserAssessmentStats || mongoose.model<IUserAssessmentStats>('UserAssessmentStats', userAssessmentStatsSchema);
