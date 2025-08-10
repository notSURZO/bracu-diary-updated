// lib/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  student_ID: string;
  picture_url: string;
  connectionRequests: string[]; // Array to store usernames of users who sent connect requests
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  student_ID: { type: String, required: true, unique: true },
  picture_url: { type: String, default: '' },
  connectionRequests: [{ type: String, default: [] }], // Store usernames
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);