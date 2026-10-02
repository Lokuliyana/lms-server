import mongoose, { Schema, Document } from 'mongoose';

export interface IGrade extends Document {
  name: string;
  level?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const gradeSchema = new Schema<IGrade>({
  name: { type: String, required: true, unique: true },
  level: { type: Number },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Grade = mongoose.model<IGrade>("Grade", gradeSchema);
