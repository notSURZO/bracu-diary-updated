import mongoose, { Schema, Model, Document } from 'mongoose';

export type Visibility = 'public' | 'private';

export interface ICourseResource extends Document {
  courseCode: string;
  courseName: string;
  directoryId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  kind: 'file' | 'youtube';
  file?: {
    url: string;
    mime?: string;
    bytes?: number;
    provider?: string;
    publicId?: string;
    originalName?: string;
  };
  youtube?: {
    url: string;
    videoId: string;
  };
  ownerUserId: string; // Clerk user id
  visibility: Visibility; // default 'public' for this feature
  upvoters?: string[]; // Clerk user ids
  downvoters?: string[]; // Clerk user ids
  createdAt: Date;
  updatedAt: Date;
}

const FileSubSchema = new Schema(
  {
    url: { type: String, required: true },
    mime: { type: String },
    bytes: { type: Number },
    provider: { type: String },
    publicId: { type: String },
    originalName: { type: String },
  },
  { _id: false }
);

const CourseResourceSchema = new Schema<ICourseResource>(
  {
    courseCode: { type: String, required: true, index: true },
    courseName: { type: String, required: true },
    directoryId: { type: Schema.Types.ObjectId, ref: 'CourseResourceDirectory' },
    title: { type: String, required: true },
    description: { type: String },
    kind: { type: String, enum: ['file', 'youtube'], required: true },
    file: { type: FileSubSchema, required: false },
    youtube: {
      url: { type: String },
      videoId: { type: String },
    },
    ownerUserId: { type: String, required: true },
    visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
    upvoters: { type: [String], default: [] },
    downvoters: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Compound index for courseCode + visibility
CourseResourceSchema.index({ courseCode: 1, visibility: 1 });

// Text index for title + description
CourseResourceSchema.index({ title: 'text', description: 'text' });

const CourseResource: Model<ICourseResource> =
  mongoose.models.CourseResource ||
  mongoose.model<ICourseResource>('CourseResource', CourseResourceSchema);

export default CourseResource;
