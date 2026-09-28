import mongoose, { Document, Schema } from 'mongoose';

export interface IAssessmentSubmission extends Document {
  user_id: mongoose.Types.ObjectId;
  assessment_id: mongoose.Types.ObjectId;
  subject?: string;
  paper_title?: string;
  answers: {
    question_id: mongoose.Types.ObjectId;
    answer: any;
    is_correct: boolean;
    score: number;
    time_ms: number;
  }[];
  total_score: number;
  max_score: number;
  total_questions: number;
  correct_answers: number;
  time_spent: number;
  submitted_at: Date;
  attempt_number: number;
  feedback_given: boolean;
  device_info?: string;
  ip_address?: string;
}

const assessmentSubmissionSchema = new Schema<IAssessmentSubmission>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assessment_id: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },

  subject: { type: String },
  paper_title: { type: String },

  answers: [
    {
      question_id: { type: Schema.Types.ObjectId, ref: 'AssessmentQuestion', required: true },
      answer: Schema.Types.Mixed,
      is_correct: { type: Boolean, required: true },
      score: { type: Number, required: true, default: 0 },
      time_ms: { type: Number, default: 0 },
    },
  ],

  total_score: { type: Number, required: true },
  max_score: { type: Number, required: true, default: 0 },
  total_questions: { type: Number },
  correct_answers: { type: Number },

  time_spent: { type: Number, required: true },
  submitted_at: { type: Date, default: Date.now },

  attempt_number: { type: Number, default: 1 },
  feedback_given: { type: Boolean, default: false },

  device_info: { type: String },
  ip_address: { type: String },
});

assessmentSubmissionSchema.index({ user_id: 1, assessment_id: 1, attempt_number: 1 }, { unique: true });
assessmentSubmissionSchema.index({ assessment_id: 1, attempt_number: 1, submitted_at: 1 });
assessmentSubmissionSchema.index({ user_id: 1, assessment_id: 1, submitted_at: -1 });

export const AssessmentSubmission = mongoose.models.AssessmentSubmission || mongoose.model<IAssessmentSubmission>('AssessmentSubmission', assessmentSubmissionSchema);
