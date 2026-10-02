import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  code?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const subjectSchema = new Schema<ISubject>({
  name: { type: String, required: true, unique: true },
  code: { type: String },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Subject = mongoose.model<ISubject>("Subject", subjectSchema);
