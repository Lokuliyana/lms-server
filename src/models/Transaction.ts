import mongoose from "mongoose";
const { Schema } = mongoose;

const transactionSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  class_id: { type: Schema.Types.ObjectId, ref: "Class", required: true },
  month_key: { type: String, required: true }, // e.g., "2026-09"
  gateway: { type: String, enum: ["stripe", "payhere", "manual"], required: true },
  gateway_transaction_id: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

transactionSchema.index({ user_id: 1, class_id: 1, month_key: 1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
