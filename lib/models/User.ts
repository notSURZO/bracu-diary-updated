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

// --- NEW INTERFACES FOR MARKS ---
// Interface for a single mark entry (e.g., one quiz)
export interface IMarkEntry {
  deadlineId: string;
  obtained: number;
  outOf: number;
}

// Interface to hold all marks for a single course
export interface ICourseMarks {
  courseId: mongoose.Schema.Types.ObjectId;
  quiz: IMarkEntry[];
  assignment: IMarkEntry[];
  mid: IMarkEntry[];
  final: IMarkEntry[];
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
  createdAt: Date;
  updatedAt: Date;
  bloodGroup?: string;
  socialMedia?: ISocialMedia;
  education?: IEducation;
  address?: string;
  department?: string;
  theme_color?: string;
  interests?: string[];
  studyInvites?: Array<{
    _id?: any;
    roomSlug: string;
    hostName: string;
    hostEmail: string;
    createdAt: Date;
    active: boolean;
  }>;
  enrolledCourses: Array<{
    _id: string;
    originalCourseId: string;
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
  }>;
  connections: string[];
  isAdmin?: boolean;
  adminClub?: mongoose.Types.ObjectId;
  deadlines?: Array<{
    id: string;
    title: string;
    details: string;
    submissionLink?: string;
    lastDate: Date;
    courseId: string;
    originalCourseId: string;
    courseCode: string;
    courseName: string;
    section: string;
    type: 'theory' | 'lab';
    createdBy: string;
    createdByName: string;
    createdByStudentId: string;
    createdAt: Date;
    completed: boolean;
  }>;
  // --- ADDED MARKS FIELD ---
  marks?: ICourseMarks[];
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


// --- NEW SCHEMAS FOR MARKS ---
const MarkEntrySchema: Schema = new Schema({
  deadlineId: { type: String, required: true, unique: true },
  obtained: { type: Number, required: true },
  outOf: { type: Number, required: true }
}, { _id: false });

const CourseMarksSchema: Schema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  quiz: [MarkEntrySchema],
  assignment: [MarkEntrySchema],
  mid: [MarkEntrySchema],
  final: [MarkEntrySchema]
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
  connectionRequests: [{ type: String, default: [] }],
  theme_color: { type: String, default: 'blue' },
  interests: { type: [String], default: [] },
  studyInvites: [{
    roomSlug: { type: String, required: true },
    hostName: { type: String, required: true },
    hostEmail: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

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
  connections: [{ type: String, default: [] }],
  isAdmin: { type: Boolean, default: false },
  adminClub: { type: Schema.Types.ObjectId, ref: 'Club' },
  deadlines: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    details: { type: String, required: true },
    submissionLink: { type: String, default: '' },
    lastDate: { type: Date, required: true },
    courseId: { type: String, required: true },
    originalCourseId: { type: String, required: true },
    courseCode: { type: String, required: true },
    courseName: { type: String, required: true },
    section: { type: String, required: true },
    type: { type: String, enum: ['theory', 'lab'], required: true },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: 'Unknown' },
    createdByStudentId: { type: String, default: 'Unknown' },
    createdAt: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false }
  }],
  // --- ADDED MARKS FIELD TO SCHEMA ---
  marks: {
    type: [CourseMarksSchema],
    default: []
  }
});

// Update the updatedAt field before saving
UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Prevent stale schema during hot-reload
if (mongoose.models.User) {
  delete mongoose.models.User;
}
export default mongoose.model<IUser>('User', UserSchema);
