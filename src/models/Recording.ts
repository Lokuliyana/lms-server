import mongoose, { Schema, Document } from 'mongoose';

export interface IRecording extends Document {
  class_id: mongoose.Types.ObjectId;
  title: string;
  driveUrl?: string;
  driveFileId?: string;
  provider: 'drive' | 'b2' | 'processing' | 'youtube' | 'local';
  storageKey?: string;
  video_url?: string;
  zoom_meeting_id?: string;
  zoom_recording_id?: string;
  uploaded_at: Date;
  is_expired: boolean;
  is_deleted?: boolean;
  session_date?: Date;
  month_key?: string;
  batch_name?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recordingSchema = new Schema<IRecording>({
  class_id: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  title: { type: String, required: true },
  driveUrl: { type: String },
  driveFileId: { type: String },
  provider: { 
    type: String, 
    enum: ['drive', 'b2', 'processing', 'youtube', 'local'], 
    default: 'drive' 
  },
  storageKey: { type: String },
  video_url: { type: String },
  zoom_meeting_id: { type: String },
  zoom_recording_id: { type: String },
  uploaded_at: { type: Date, default: Date.now },
  is_expired: { type: Boolean, default: false },
  is_deleted: { type: Boolean, default: false },
  session_date: { type: Date },
  month_key: { type: String },
  batch_name: { type: String },
}, { timestamps: true });


recordingSchema.index({ zoom_recording_id: 1 }, { unique: true, sparse: true });

export const Recording = mongoose.model<IRecording>('Recording', recordingSchema);
