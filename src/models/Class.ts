import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  title: string;
  description: string;
  batches: Array<{
    batch_name: string;
    day: string;
    start: string;
    end: string;
  }>;
  format: 'theory' | 'revision' | 'seminar';
  type: 'special' | 'regular' | 'custom';
  subject: string;
  grade: string;
  price: number;
  image?: string;
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  zoom_start_url?: string;
  is_deleted: boolean;
  created_by: mongoose.Types.ObjectId;
  quizzes: mongoose.Types.ObjectId[];
  recordings: mongoose.Types.ObjectId[];
  currency: { type: String, default: "LKR" },
  price: { type: Number, default: 0 },
  gateway_product_id: { type: String },
  gateway_price_id: { type: String },
  enrolled_students: mongoose.Types.ObjectId[];
  created_at: Date;
}

const classSchema = new Schema<IClass>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  batches: [
    {
      batch_name: { type: String, required: true },
      day: { type: String, required: true }, 
      start: { type: String, required: true },
      end: { type: String, required: true },
    },
  ],
  format: {
    type: String,
    enum: ["theory", "revision", "seminar"],
    required: true,
  },
  type: {
    type: String,
    enum: ["special", "regular", "custom"],
    required: true,
  },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  zoom_meeting_id: { type: String },
  zoom_join_url: { type: String },
  zoom_start_url: { type: String },
  is_deleted: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  quizzes: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
  recordings: [{ type: Schema.Types.ObjectId, ref: "Recording" }],
  // Fix 2.1: Drop ClassEnrollment, use enrolled_students directly
  currency: { type: String, default: "LKR" },
  price: { type: Number, default: 0 },
  gateway_product_id: { type: String },
  gateway_price_id: { type: String },
  enrolled_students: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
  created_at: { type: Date, default: Date.now },
});

export const Class = mongoose.model<IClass>("Class", classSchema);
