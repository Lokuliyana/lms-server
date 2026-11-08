import mongoose, { Schema, Document } from 'mongoose';

export interface IStudyPackOrder extends Document {
  order_id: string;
  student_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  study_pack_id: mongoose.Types.ObjectId;
  include_physical_delivery: boolean;
  shipping_address?: string;
  recipient_phone?: string;
  recipient_name?: string;
  delivery_order_id?: mongoose.Types.ObjectId;
  digital_access_granted: boolean;
  digital_access_granted_at: Date;
  status: 'active' | 'completed' | 'cancelled';
  payment_status: 'paid' | 'pending' | 'free' | 'failed';
  amount_paid: number;
  transaction_id?: mongoose.Types.ObjectId;
  payment_proof?: string;
  payment_slip_name?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const studyPackOrderSchema = new Schema<IStudyPackOrder>(
  {
    order_id: { type: String, required: true, unique: true, index: true },
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    study_pack_id: { type: Schema.Types.ObjectId, ref: 'StudyPack', required: true, index: true },
    include_physical_delivery: { type: Boolean, default: false },
    shipping_address: { type: String, default: '' },
    recipient_phone: { type: String, default: '' },
    recipient_name: { type: String, default: '' },
    delivery_order_id: { type: Schema.Types.ObjectId, ref: 'DeliveryOrder' },
    digital_access_granted: { type: Boolean, default: true },
    digital_access_granted_at: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
    payment_status: {
      type: String,
      enum: ['paid', 'pending', 'free', 'failed'],
      default: 'paid',
      index: true,
    },
    amount_paid: { type: Number, required: true, default: 0, min: 0 },
    transaction_id: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    payment_proof: { type: String, default: '' },
    payment_slip_name: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  {
    collection: 'studyPackOrders',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound indexes for fast entitlement lookups
studyPackOrderSchema.index({ student_id: 1, study_pack_id: 1 });
studyPackOrderSchema.index({ user_id: 1, study_pack_id: 1 });

export const StudyPackOrder =
  (mongoose.models.StudyPackOrder as mongoose.Model<IStudyPackOrder>) ||
  mongoose.model<IStudyPackOrder>('StudyPackOrder', studyPackOrderSchema);
