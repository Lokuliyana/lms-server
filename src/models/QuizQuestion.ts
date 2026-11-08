import mongoose, { Document, Schema } from "mongoose";

export interface IQuizQuestion extends Document {
  frontend_id?: string;
  quiz_id: mongoose.Types.ObjectId;
  type: 'mcq' | 'true-false' | 'fill-blank' | 'multiple-select' | 'slider' | 'drag-drop';
  question: string;
  options?: string[];
  image?: string | null;
  correct_answer: any;
  explanation?: string;
  marks: number;
  formula?: string | null;
  tolerance?: number;
  sliderRange?: {
    min?: number;
    max?: number;
    step?: number;
  };
  dragItems?: {
    items?: string[];
    matches?: string[];
  };
}

const quizQuestionSchema = new Schema<IQuizQuestion>({
  frontend_id: { type: String, sparse: true, unique: true },
  quiz_id: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  type: {
    type: String,
    enum: ['mcq', 'true-false', 'fill-blank', 'multiple-select', 'slider', 'drag-drop'],
    required: true
  },
  question: { type: String, required: true },

  options: {
    type: [String], // For MCQ, multiple-select
    default: undefined
  },
  image: { type: String, default: null }, 
  correct_answer: {
    type: Schema.Types.Mixed, // Can be index, string, array, boolean, or number
    required: true
  },

  explanation: { type: String },
  marks: { type: Number, required: true },

  // Mathematical formula and numerical tolerance
  formula: { type: String, default: null },
  tolerance: { type: Number, default: 0 },

  // Optional fields for advanced types
  sliderRange: {
    min: { type: Number },
    max: { type: Number },
    step: { type: Number }
  },

  dragItems: {
    items: [String],
    matches: [String]
  }
});

quizQuestionSchema.index({ quiz_id: 1 });

export const QuizQuestion = (mongoose.models.QuizQuestion as mongoose.Model<IQuizQuestion>) || mongoose.model<IQuizQuestion>('QuizQuestion', quizQuestionSchema);

