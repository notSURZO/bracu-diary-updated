import mongoose, { Schema, models, model } from 'mongoose';

export interface ICourseResourceDirectory extends mongoose.Document {
  courseCode: string;
  title: string;
  ownerUserId: string;
  visibility: 'public' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

const CourseResourceDirectorySchema = new Schema<ICourseResourceDirectory>(
  {
    courseCode: { type: String, required: true, index: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    ownerUserId: { type: String, required: true, index: true },
    visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
  },
  { timestamps: true }
);

CourseResourceDirectorySchema.index({ courseCode: 1, visibility: 1, createdAt: -1 });

const CourseResourceDirectory =
  models.CourseResourceDirectory || model<ICourseResourceDirectory>('CourseResourceDirectory', CourseResourceDirectorySchema);

export default CourseResourceDirectory;
