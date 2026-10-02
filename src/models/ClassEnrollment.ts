import mongoose, { Schema, Document } from 'mongoose';

export interface IClassEnrollment extends Document {
  classId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'active' | 'dropped' | 'completed';
  enrolledAt: Date;
  updatedAt: Date;
}

const classEnrollmentSchema = new Schema<IClassEnrollment>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'dropped', 'completed'],
      default: 'active',
      index: true,
    },
    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index ensuring idempotent student enrollments
classEnrollmentSchema.index({ classId: 1, userId: 1 }, { unique: true });

export const ClassEnrollment = mongoose.model<IClassEnrollment>(
  'ClassEnrollment',
  classEnrollmentSchema
);
