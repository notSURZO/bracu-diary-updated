import mongoose, { Schema, models, model } from 'mongoose';

export interface ICourseResourceDirectory extends mongoose.Document {
  courseCode: string;
  title: string;
  ownerUserId: string;
  visibility: 'private' | 'connections' | 'public';
  sharedUserIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseResourceDirectorySchema = new Schema<ICourseResourceDirectory>(
  {
    courseCode: { type: String, required: true, index: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    ownerUserId: { type: String, required: true, index: true },
    visibility: { type: String, enum: ['private', 'connections', 'public'], default: 'private', index: true },
    sharedUserIds: { type: [String], default: [], index: true },
  },
  { timestamps: true }
);

CourseResourceDirectorySchema.index({ courseCode: 1, visibility: 1, createdAt: -1 });

// Prevent stale schema during hot-reload: if the model exists with an older schema, delete and re-register
if (mongoose.models.CourseResourceDirectory) {
  delete mongoose.models.CourseResourceDirectory;
}
const CourseResourceDirectory = model<ICourseResourceDirectory>('CourseResourceDirectory', CourseResourceDirectorySchema);

export default CourseResourceDirectory;
