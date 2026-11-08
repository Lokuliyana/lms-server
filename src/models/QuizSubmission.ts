import mongoose, { Document, Schema } from "mongoose";
export interface IQuizSubmissionAnswer {
  question_id: mongoose.Types.ObjectId;
  answer: any;
  is_correct: boolean;
  score: number;
  max_score?: number;
  time_ms?: number;
  feedback?: {
    correct_answer?: any;
    canonical_solution?: string;
    explanation?: string;
  };
}

export interface IQuizSubmission extends Document {
  user_id: mongoose.Types.ObjectId;
  quiz_id: mongoose.Types.ObjectId;
  subject?: string;
  paper_title?: string;
  answers: IQuizSubmissionAnswer[];
  total_score: number;
  max_score: number;
  accuracy?: number;
  percentage?: number;
  total_questions?: number;
  correct_answers?: number;
  time_spent: number;
  submitted_at: Date;
  attempt_number: number;
  feedback_given: boolean;
  device_info?: string;
  ip_address?: string;
}

const quizSubmissionSchema = new Schema<IQuizSubmission>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  quiz_id: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },

  subject: { type: String },
  paper_title: { type: String },

  answers: [
    {
      question_id: {
        type: Schema.Types.ObjectId,
        ref: "QuizQuestion",
        required: true,
      },
      answer: Schema.Types.Mixed,
      is_correct: { type: Boolean, required: true },
      score: { type: Number, default: 0 },
      max_score: { type: Number, default: 0 },
      time_ms: { type: Number, default: 0 },
      feedback: {
        correct_answer: { type: Schema.Types.Mixed },
        canonical_solution: { type: String },
        explanation: { type: String },
      },
    },
  ],

  total_score: { type: Number, required: true },
  max_score: { type: Number, required: true, default: 0 },
  accuracy: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  total_questions: { type: Number },
  correct_answers: { type: Number },

  time_spent: { type: Number, required: true }, // in seconds
  submitted_at: { type: Date, default: Date.now },

  attempt_number: { type: Number, default: 1 },
  feedback_given: { type: Boolean, default: false },

  device_info: { type: String },
  ip_address: { type: String },
});

quizSubmissionSchema.pre('save', function () {
  // If answers array is present, backfill answer-level max_scores and derive submission max_score if missing
  if (Array.isArray(this.answers) && this.answers.length > 0) {
    for (const ans of this.answers) {
      if (typeof ans.score === 'number' && (!ans.max_score || ans.max_score < ans.score)) {
        ans.max_score = ans.score;
      }
    }
    if (!this.max_score || this.max_score === 0) {
      const sumMax = this.answers.reduce((acc, a) => acc + (a.max_score || 0), 0);
      if (sumMax > 0) {
        this.max_score = sumMax;
      }
    }
    if (this.total_questions === undefined || this.total_questions === 0) {
      this.total_questions = this.answers.length;
    }
    if (this.correct_answers === undefined) {
      this.correct_answers = this.answers.filter((a) => a.is_correct).length;
    }
  }

  // Ensure max_score is never less than total_score
  if (this.total_score > 0 && (!this.max_score || this.max_score < this.total_score)) {
    this.max_score = this.total_score;
  }

  // Compute accuracy and percentage telemetry
  if (this.max_score > 0) {
    const acc = Number(((this.total_score / this.max_score) * 100).toFixed(2));
    const shouldUpdateAccuracy = this.isNew
      ? !this.isModified('accuracy') || this.accuracy === 0
      : ((this.isModified('total_score') || this.isModified('max_score')) && !this.isModified('accuracy')) || this.accuracy === 0 || this.accuracy === undefined;

    if (shouldUpdateAccuracy) {
      this.accuracy = acc;
    }

    const shouldUpdatePercentage = this.isNew
      ? !this.isModified('percentage') || this.percentage === 0
      : ((this.isModified('total_score') || this.isModified('max_score')) && !this.isModified('percentage')) || this.percentage === 0 || this.percentage === undefined;

    if (shouldUpdatePercentage) {
      this.percentage = acc;
    }
  }
});

quizSubmissionSchema.index({ user_id: 1, quiz_id: 1, attempt_number: 1 }, { unique: true });
quizSubmissionSchema.index({ quiz_id: 1, attempt_number: 1, submitted_at: 1 });
quizSubmissionSchema.index({ user_id: 1, quiz_id: 1, submitted_at: -1 });

export const QuizSubmission = (mongoose.models.QuizSubmission as mongoose.Model<IQuizSubmission>) || mongoose.model<IQuizSubmission>("QuizSubmission", quizSubmissionSchema);

