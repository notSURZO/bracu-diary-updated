// lib/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;
  name: string;
  username: string;
  email: string;
  student_ID: string;
  phone?: string;
  picture_url: string;
  createdAt: Date;
  updatedAt: Date;
  bio?: string;

  connectionRequests: string[]; // Array to store emails of users who sent connect requests
  avatarUrl?: string;
  address?: string;
  department?: string;
  enrolledCourses: string[]; // Array to store IDs of enrolled courses
  connections: string[]; // Array to store emails of accepted connections
}

const UserSchema: Schema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  student_ID: { type: String, required: true, unique: true },
  picture_url: { type: String, default: '' },
  phone: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  bio: { type: String },
  avatarUrl: { type: String },
  connectionRequests: [{ type: String, default: [] }],
  address: { type: String, default: '' },
  department: { type: String, default: '' },
  enrolledCourses: { type: Array, default: [] },
  connections: [{ type: String, default: [] }], // Added for accepted connections
});

// Update the updatedAt field before saving
UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);