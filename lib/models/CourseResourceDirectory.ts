import mongoose, { Schema, model } from 'mongoose';

export interface ICourseResourceDirectory extends mongoose.Document {
  courseCode: string;
  title: string;
  ownerUserId: string;
  visibility: 'private' | 'connections' | 'public';
  sharedUserIds?: string[];
  parentDirectoryId?: mongoose.Types.ObjectId;
  isSubdirectory?: boolean;
  subdirectoryType?: 'theory' | 'lab';
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
    parentDirectoryId: { type: Schema.Types.ObjectId, ref: 'CourseResourceDirectory', index: true },
    isSubdirectory: { type: Boolean, default: false, index: true },
    subdirectoryType: { type: String, enum: ['theory', 'lab'] },
  },
  { timestamps: true }
);

// Compound indexes for common query patterns
CourseResourceDirectorySchema.index({ courseCode: 1, visibility: 1, createdAt: -1 });
CourseResourceDirectorySchema.index({ ownerUserId: 1, visibility: 1, isSubdirectory: 1 });
CourseResourceDirectorySchema.index({ parentDirectoryId: 1, isSubdirectory: 1 });
CourseResourceDirectorySchema.index({ visibility: 1, isSubdirectory: 1, courseCode: 1 });

// Text search index for title and courseCode
CourseResourceDirectorySchema.index({ 
  title: 'text', 
  courseCode: 'text' 
}, {
  weights: { 
    courseCode: 10,  // Higher weight for courseCode matches
    title: 5 
  }
});

// Prevent stale schema during hot-reload: if the model exists with an older schema, delete and re-register
if (mongoose.models.CourseResourceDirectory) {
  delete mongoose.models.CourseResourceDirectory;
}
const CourseResourceDirectory = model<ICourseResourceDirectory>('CourseResourceDirectory', CourseResourceDirectorySchema);

export default CourseResourceDirectory;
