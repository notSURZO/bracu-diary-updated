import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  courseId: mongoose.Schema.Types.ObjectId; // Use ObjectId for reference
  userEmail: string;
  rating: number; // 1 to 5
  reviewText: string;
  agrees: string[]; // Array of user emails who agree
  disagrees: string[]; // Array of user emails who disagree
  createdAt: Date;
}

const ReviewSchema: Schema = new Schema({
  courseId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course', // Reference the Course model
    required: true, 
    index: true 
  },
  userEmail: { type: String, required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  reviewText: { type: String, required: true, maxlength: 500 },
  agrees: { type: [String], default: [] },
  disagrees: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);