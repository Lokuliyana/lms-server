import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  user_id: mongoose.Types.ObjectId;
  class_id?: mongoose.Types.ObjectId;
  order_id?: string;
  order_type?: string;
  month_key?: string;
  gateway: "stripe" | "payhere" | "manual";
  gateway_transaction_id?: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed";
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

const transactionSchema = new Schema<ITransaction>({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  class_id: { type: Schema.Types.ObjectId, ref: "Class", required: false, index: true },
  order_id: { type: String, required: false, index: true },
  order_type: { type: String, default: "class_subscription" },
  month_key: { type: String, required: false }, // e.g., "2026-09"
  gateway: { type: String, enum: ["stripe", "payhere", "manual"], required: true },
  gateway_transaction_id: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending", index: true },
  metadata: { type: Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

transactionSchema.index({ user_id: 1, class_id: 1, month_key: 1 });

export const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema);
