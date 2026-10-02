import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomVideo {
  title: string;
  url: string;
  provider: 'youtube' | 'upload' | 'vimeo' | 'external';
}

export interface IStudyMaterial {
  title: string;
  file_url: string;
  file_type?: string;
  size_bytes?: number;
}

export interface IStudyPack extends Document {
  title: string;
  description: string;
  grade?: mongoose.Types.ObjectId;
  class_id?: mongoose.Types.ObjectId;
  subject?: mongoose.Types.ObjectId;
  price: number;
  thumbnail_url: string;
  recordings: mongoose.Types.ObjectId[];
  custom_videos: ICustomVideo[];
  materials: IStudyMaterial[];
  is_published: boolean;
  created_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const customVideoSchema = new Schema<ICustomVideo>({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  provider: {
    type: String,
    enum: ['youtube', 'upload', 'vimeo', 'external'],
    default: 'youtube',
  },
}, { _id: true });

const studyMaterialSchema = new Schema<IStudyMaterial>({
  title: { type: String, required: true, trim: true },
  file_url: { type: String, required: true, trim: true },
  file_type: { type: String, default: 'pdf' },
  size_bytes: { type: Number, default: 0 },
}, { _id: true });

const studyPackSchema = new Schema<IStudyPack>({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  grade: { type: Schema.Types.ObjectId, ref: 'Grade' },
  class_id: { type: Schema.Types.ObjectId, ref: 'Class' },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
  price: { type: Number, required: true, default: 0, min: 0 },
  thumbnail_url: { type: String, default: '' },
  recordings: [{ type: Schema.Types.ObjectId, ref: 'Recording' }],
  custom_videos: [customVideoSchema],
  materials: [studyMaterialSchema],
  is_published: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

studyPackSchema.index({ is_published: 1, grade: 1, class_id: 1 });
studyPackSchema.index({ title: 'text', description: 'text' });

export const StudyPack = (mongoose.models.StudyPack as mongoose.Model<IStudyPack>) || mongoose.model<IStudyPack>('StudyPack', studyPackSchema);
