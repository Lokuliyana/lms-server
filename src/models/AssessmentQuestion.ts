import mongoose, { Document, Schema } from 'mongoose';

export interface IAssessmentQuestion extends Document {
  frontend_id?: string;
  assessment_id: mongoose.Types.ObjectId;
  type: 'mcq' | 'true-false' | 'fill-blank' | 'multiple-select' | 'slider' | 'drag-drop';
  question: string;
  options?: string[];
  image?: string | null;
  correct_answer: any;
  explanation?: string;
  marks: number;
  sliderRange?: {
    min?: number;
    max?: number;
    step?: number;
  };
  dragItems?: {
    items: string[];
    matches: string[];
  };
}

const assessmentQuestionSchema = new Schema<IAssessmentQuestion>({
  frontend_id: { type: String, sparse: true, unique: true },
  assessment_id: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  type: {
    type: String,
    enum: ['mcq', 'true-false', 'fill-blank', 'multiple-select', 'slider', 'drag-drop'],
    required: true
  },
  question: { type: String, required: true },
  options: {
    type: [String],
    default: undefined
  },
  image: { type: String, default: null },
  correct_answer: {
    type: Schema.Types.Mixed,
    required: true
  },
  explanation: { type: String },
  marks: { type: Number, required: true },
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

assessmentQuestionSchema.index({ assessment_id: 1 });

export const AssessmentQuestion = mongoose.models.AssessmentQuestion || mongoose.model<IAssessmentQuestion>('AssessmentQuestion', assessmentQuestionSchema);
