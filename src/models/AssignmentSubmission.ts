import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignmentSubmission extends Document {
  assignment_id: mongoose.Types.ObjectId;
  class_id?: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  url?: string;
  urls: string[];
  file_urls?: string[];
  submission_text?: string;
  file_ids: mongoose.Types.ObjectId[];
  submitted_at: Date;
  updated_at: Date;
  note: string;
  marks_obtained?: number;
  graded_by?: mongoose.Types.ObjectId;
  grade?: number;
  feedback: string;
  status: 'submitted' | 'late' | 'graded';
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>({
  assignment_id: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
  class_id: { type: Schema.Types.ObjectId, ref: 'Class' },
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  url: { type: String, default: null },
  urls: [{ type: String }],
  file_urls: [{ type: String }],
  submission_text: { type: String, default: '' },
  file_ids: [{ type: Schema.Types.ObjectId, ref: 'File' }],
  submitted_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  marks_obtained: { type: Number, default: null },
  graded_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  grade: { type: Number, default: null },
  feedback: { type: String, default: '' },
  status: { type: String, enum: ['submitted', 'late', 'graded'], default: 'submitted' },
}, {
  collection: 'assignmentSubmissions',
  timestamps: true,
});

assignmentSubmissionSchema.index(
  { assignment_id: 1, student_id: 1 },
  { unique: true }
);

export const AssignmentSubmission: mongoose.Model<IAssignmentSubmission> =
  (mongoose.models.AssignmentSubmission as mongoose.Model<IAssignmentSubmission>) ||
  mongoose.model<IAssignmentSubmission>('AssignmentSubmission', assignmentSubmissionSchema);
