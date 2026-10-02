import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema({
  // Fix 1.8: user_id not unique on profile models -> Add unique: true index
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  full_name: { type: String, required: true },
  avatar_url: { type: String },
  school: { type: String },
  grade: { type: String },
  birth_date: { type: Date },
  ol_year: { type: String },
  al_year: { type: String },
  bio: { type: String },
  qualifications: { type: String }
}, { timestamps: true });

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
