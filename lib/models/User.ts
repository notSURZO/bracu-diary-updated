// lib/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface for social media links
export interface ISocialMedia {
  linkedin?: string;
  github?: string;
  facebook?: string;
  instagram?: string;
  snapchat?: string;
  twitter?: string;
  website?: string;
  youtube?: string;
}

// Interface for education details
export interface IEducation {
  school?: string;
  college?: string;
}

// Main User Interface
export interface IUser extends Document {
  clerkId: string;
  name: string;
  username: string;
  email: string;
  student_ID: string;
  phone?: string;
  picture_url: string;
  bio?: string;
  dateOfBirth?: Date;
  bloodGroup?: string;
  socialMedia?: ISocialMedia;
  education?: IEducation;
  address?: string;
  department?: string;
  enrolledCourses: string[];
  connections: string[];
  connectionRequests: string[];
  theme_color?: string;
  createdAt: Date;
  updatedAt: Date;
}

// SocialMediaSchema
const SocialMediaSchema: Schema = new Schema({
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  facebook: { type: String, default: '' },
  instagram: { type: String, default: '' },
  snapchat: { type: String, default: '' },
  twitter: { type: String, default: '' },
  website: { type: String, default: '' },
  youtube: { type: String, default: '' },
}, { _id: false });

// EducationSchema
const EducationSchema: Schema = new Schema({
  school: { type: String, default: '' },
  college: { type: String, default: '' },
}, { _id: false });

// Main UserSchema
const UserSchema: Schema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  student_ID: { type: String, required: true, unique: true },
  picture_url: { type: String, default: '' },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  dateOfBirth: { type: Date },
  bloodGroup: { type: String, default: '' },
  socialMedia: { type: SocialMediaSchema, default: {} },
  education: { type: EducationSchema, default: {} },
  address: { type: String, default: '' },
  department: { type: String, default: '' },
  enrolledCourses: [{ type: String, default: [] }],
  connections: [{ type: String, default: [] }],
  connectionRequests: [{ type: String, default: [] }],
  theme_color: { type: String, default: 'blue' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field before saving
UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);