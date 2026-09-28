import mongoose from "mongoose";
const { Schema } = mongoose;

const quizSubmissionSchema = new Schema({
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
      time_ms: { type: Number, default: 0 },
    },
  ],

  total_score: { type: Number, required: true },
  total_questions: { type: Number },
  correct_answers: { type: Number },

  time_spent: { type: Number, required: true }, // in seconds
  submitted_at: { type: Date, default: Date.now },

  attempt_number: { type: Number, default: 1 },
  feedback_given: { type: Boolean, default: false },

  device_info: { type: String },
  ip_address: { type: String },
});

quizSubmissionSchema.index({ user_id: 1, quiz_id: 1, attempt_number: 1 }, { unique: true });
quizSubmissionSchema.index({ quiz_id: 1, attempt_number: 1, submitted_at: 1 });
quizSubmissionSchema.index({ user_id: 1, quiz_id: 1, submitted_at: -1 });


export const QuizSubmission = mongoose.model("QuizSubmission", quizSubmissionSchema);
