import mongoose, { Schema, Document } from 'mongoose';

export interface IClassEntitlement extends Document {
  user_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  month_key: string;
  source: string;
  payment_ref: string | null;
  granted_at: Date;
}

const classEntitlementSchema = new Schema<IClassEntitlement>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  class_id: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  month_key: { type: String, required: true },
  source: { type: String, default: 'manual' },
  payment_ref: { type: String, default: null },
  granted_at: { type: Date, default: Date.now },
}, { timestamps: true });

classEntitlementSchema.index({ user_id: 1, class_id: 1, month_key: 1 }, { unique: true });

export const ClassEntitlement = mongoose.model<IClassEntitlement>('ClassEntitlement', classEntitlementSchema);
