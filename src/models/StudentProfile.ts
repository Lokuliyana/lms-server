import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema({
  // Fix 1.8: user_id not unique on profile models -> Add unique: true index
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  full_name: { type: String, required: true },
  // Fix 1.10: Migrate avatar storage to Supabase; documents store a URL only
  avatar_url: { type: String }
}, { timestamps: true });

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
