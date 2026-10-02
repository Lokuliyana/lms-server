import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignment extends Document {
  class_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  due_date: Date;
  urls?: string[];
  file_ids?: mongoose.Types.ObjectId[];
  max_points: number;
  created_by: mongoose.Types.ObjectId;
  is_published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    class_id: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    title: { type: String, required: true },
    description: { type: String },
    due_date: { type: Date, required: true },
    urls: [{ type: String }],
    file_ids: [{ type: Schema.Types.ObjectId, ref: 'File' }],
    max_points: { type: Number, default: 100 },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    is_published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Assignment: mongoose.Model<IAssignment> =
  (mongoose.models.Assignment as mongoose.Model<IAssignment>) ||
  mongoose.model<IAssignment>('Assignment', assignmentSchema);
