import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  date: Date;
  time: string;
  location: string;
  adminClub: mongoose.Types.ObjectId;
  tags?: string[];
  imageUrl?: string;
  imagePath?: string;
  imageBucket?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema = new Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    required: true, 
    trim: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  time: { 
    type: String, 
    required: true, 
    trim: true 
  },
  location: { 
    type: String, 
    required: true, 
    trim: true 
  },
  adminClub: { 
    type: Schema.Types.ObjectId, 
    ref: 'Club', 
    required: true 
  },
  tags: { type: [String], default: [] }
  ,
  imageUrl: { type: String, default: '' },
  imagePath: { type: String, default: '' },
  imageBucket: { type: String, default: '' }
}, { 
  timestamps: true 
});

// Index for quick lookups
EventSchema.index({ adminClub: 1 });
EventSchema.index({ date: 1 });

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
