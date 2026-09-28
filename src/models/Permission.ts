import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. "classes.create"
  module: { type: String, required: true },
  action: { type: String, required: true },
  label: { type: String, required: true }
}, { timestamps: true });

export const Permission = mongoose.model('Permission', permissionSchema);
