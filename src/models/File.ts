import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  ownerType: string;
  ownerId?: mongoose.Types.ObjectId;
  filePath: string;
  previewUrl?: string;
  contentType?: string;
  size?: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>({
  ownerType: {
    type: String,
    enum: ['class', 'quiz', 'answer', 'enrollment', 'assignment', 'user', 'other'],
    required: true,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    required: false,
    refPath: 'ownerType',
  },
  filePath: {
    type: String,
    required: true,
  },
  previewUrl: {
    type: String,
  },
  contentType: {
    type: String,
  },
  size: {
    type: Number,
  },
  expiresAt: {
    type: Date,
  },
}, { timestamps: true });

export const File = mongoose.model<IFile>('File', FileSchema);
