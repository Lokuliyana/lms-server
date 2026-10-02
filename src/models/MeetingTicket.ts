import mongoose, { Schema, Document } from "mongoose";

export interface IMeetingTicket extends Document {
  ticket: string;
  class_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  mode: "start" | "join";
  join_url: string;
  expires_at: Date;
  created_at: Date;
}

const MeetingTicketSchema = new Schema<IMeetingTicket>({
  ticket: { type: String, required: true, unique: true, index: true },
  class_id: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  mode: { type: String, enum: ["start", "join"], required: true },
  join_url: { type: String, required: true },
  expires_at: { type: Date, required: true, expires: 120 }, // 120s TTL
  created_at: { type: Date, default: Date.now }
});

export const MeetingTicket = mongoose.model<IMeetingTicket>("MeetingTicket", MeetingTicketSchema);
export default MeetingTicket;
