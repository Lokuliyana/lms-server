import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  // Fix 1.4: Registration API bloat - Cache full_name, phone, password in OTPCollection
  full_name: { type: String, required: true },
  phone: { type: String, required: true },
  password_hash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Expires in 10 minutes
}, { timestamps: true });

export const OTP = mongoose.model('OTP', otpSchema);
