import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  client_id: { type: mongoose.Schema.Types.ObjectId }, // Optional for multi-tenant isolation if needed
  is_system_role: { type: Boolean, default: false }
}, { timestamps: true });

export const Role = mongoose.model('Role', roleSchema);
