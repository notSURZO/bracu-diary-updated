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
  enrolledCourses: Array<{
    _id: string; // Modified course ID (with section/lab suffix)
    originalCourseId: string; // Original MongoDB ObjectId
    courseCode: string;
    courseName: string;
    section: string;
    faculty: string;
    details: string;
    day: string[];
    startTime: string;
    endTime: string;
    examDay?: string;
    hasLab: boolean;
    link: string;
  }>; // Array to store enrolled courses with both modified and original IDs
  connections: string[]; // Array to store emails of accepted connections
  deadlines?: Array<{
    id: string;
    title: string;
    details: string;
    submissionLink?: string;
    lastDate: Date;
    courseId: string; // Modified course ID (with section/lab suffix)
    originalCourseId: string; // Original MongoDB ObjectId
    courseCode: string;
    courseName: string;
    section: string;
    type: 'theory' | 'lab';
    createdBy: string;
    createdAt: Date;
  }>;
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
  enrolledCourses: [{
    _id: { type: String, required: true },
    originalCourseId: { type: String, required: true },
    courseCode: { type: String, required: true },
    courseName: { type: String, required: true },
    section: { type: String, required: true },
    faculty: { type: String, required: true },
    details: { type: String, required: true },
    day: { type: [String], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    examDay: { type: String, required: false },
    hasLab: { type: Boolean, required: true },
    link: { type: String, required: true }
  }],
  connections: [{ type: String, default: [] }], // Added for accepted connections
  deadlines: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    details: { type: String, required: true },
    submissionLink: { type: String, default: '' },
    lastDate: { type: Date, required: true },
    courseId: { type: String, required: true }, // Modified course ID (with section/lab suffix)
    originalCourseId: { type: String, required: true }, // Original MongoDB ObjectId
    courseCode: { type: String, required: true },
    courseName: { type: String, required: true },
    section: { type: String, required: true },
    type: { type: String, enum: ['theory', 'lab'], required: true },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
});

// Update the updatedAt field before saving
UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);