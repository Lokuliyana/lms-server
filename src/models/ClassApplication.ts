import mongoose, { Schema, Document } from 'mongoose';

export interface IClassApplication extends Document {
  user_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  requested_month: string | null;
  supporting_document: string | null;
  applied_at: Date;
  approved_by: mongoose.Types.ObjectId | null;
  approved_at: Date | null;
}

const classApplicationSchema = new Schema<IClassApplication>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    class_id: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], required: true, default: 'pending' },
    requested_month: { type: String, match: [/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM"], default: null, index: true },
    supporting_document: { type: String, default: null }, // URL or base64
    applied_at: { type: Date, default: Date.now },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
  },
  {
    collection: 'classApplications',
    timestamps: true,  
  }
);

classApplicationSchema.index(
  { user_id: 1, class_id: 1, requested_month: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

classApplicationSchema.index({ status: 1, createdAt: -1 });
classApplicationSchema.index({ class_id: 1, status: 1, createdAt: -1 });
classApplicationSchema.index({ user_id: 1, status: 1, createdAt: -1 });

export const ClassApplication = mongoose.model<IClassApplication>('ClassApplication', classApplicationSchema);
