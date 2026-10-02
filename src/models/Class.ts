import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  classId?: number;
  class_code?: string;
  title: string;
  description: string;
  batches: Array<{
    batch_name: string;
    day: string;
    start: string;
    end: string;
  }>;
  format: 'theory' | 'revision' | 'seminar';
  type: 'special' | 'regular' | 'custom';
  subject: mongoose.Types.ObjectId;
  grade: mongoose.Types.ObjectId;
  price: number;
  delivery_type?: 'online_only' | 'physical_tute' | 'both';
  institute_id?: mongoose.Types.ObjectId | null;
  physical_location?: string;
  has_delivery_pack?: boolean;
  delivery_fee?: number;
  image?: string;
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  zoom_start_url?: string;
  is_deleted: boolean;
  created_by: mongoose.Types.ObjectId;
  tutor?: mongoose.Types.ObjectId;
  monthly_fee?: number;
  quizzes: mongoose.Types.ObjectId[];
  recordings: mongoose.Types.ObjectId[];
  currency?: string;
  gateway_product_id?: string;
  gateway_price_id?: string;
  enrolled_students: mongoose.Types.ObjectId[];
  created_at: Date;
}

const classSchema = new Schema<IClass>({
  classId: { type: Number, unique: true, sparse: true, index: true },
  class_code: { type: String, unique: true, sparse: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  batches: [
    {
      batch_name: { type: String, required: true },
      day: { type: String, required: true }, 
      start: { type: String, required: true },
      end: { type: String, required: true },
    },
  ],
  format: {
    type: String,
    enum: ["theory", "revision", "seminar"],
    required: true,
  },
  type: {
    type: String,
    enum: ["special", "regular", "custom"],
    required: true,
  },
  subject: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
  grade: { type: Schema.Types.ObjectId, ref: "Grade", required: true },
  price: { type: Number, required: true },
  delivery_type: {
    type: String,
    enum: ['online_only', 'physical_tute', 'both'],
    default: 'online_only'
  },
  institute_id: {
    type: Schema.Types.ObjectId,
    ref: 'Institute',
    default: null
  },
  physical_location: { type: String, default: '' },
  has_delivery_pack: { type: Boolean, default: false },
  delivery_fee: { type: Number, default: 0 },
  image: { type: String },
  zoom_meeting_id: { type: String },
  zoom_join_url: { type: String },
  zoom_start_url: { type: String },
  is_deleted: { type: Boolean, default: false },
  created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tutor: { type: Schema.Types.ObjectId, ref: "User" },
  monthly_fee: { type: Number },
  quizzes: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
  recordings: [{ type: Schema.Types.ObjectId, ref: "Recording" }],
  currency: { type: String, default: "LKR" },
  gateway_product_id: { type: String },
  gateway_price_id: { type: String },
  enrolled_students: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
  created_at: { type: Date, default: Date.now },
});

classSchema.index({ subject: 1, grade: 1, is_deleted: 1 });

// Sequential enterprise identifier generator (e.g. classId: 1, 2, ... and class_code: CLS-0001, CLS-0002)
classSchema.pre('save', async function () {
  if (this.classId === undefined || this.classId === null) {
    const lastClass = await mongoose.model<IClass>('Class').findOne({ classId: { $ne: null } }).sort({ classId: -1 }).select('classId').lean();
    this.classId = lastClass?.classId ? lastClass.classId + 1 : 1;
  }
  if (!this.class_code) {
    this.class_code = `CLS-${String(this.classId).padStart(4, '0')}`;
  }
});

export const Class = mongoose.model<IClass>("Class", classSchema);
