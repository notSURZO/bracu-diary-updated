import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  userId: string; // Clerk user ID
  action: string; // 'resource_upload', 'deadline_created', 'event_registered', etc.
  resourceType?: string; // 'course', 'event', 'resource', etc.
  resourceId?: string; // ID of the affected resource
  details: {
    title: string;
    description?: string;
    metadata?: Record<string, any>;
  };
  timestamp: Date;
  visibility: 'private' | 'public'; // For future social features
}

const ActivitySchema: Schema = new Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  action: { 
    type: String, 
    required: true, 
    index: true 
  },
  resourceType: { 
    type: String, 
    index: true 
  },
  resourceId: { 
    type: String, 
    index: true 
  },
  details: {
    title: { type: String, required: true },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  timestamp: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  visibility: { 
    type: String, 
    enum: ['private', 'public'], 
    default: 'private' 
  }
}, { 
  timestamps: false // We use custom timestamp field
});

// Compound indexes for efficient queries
ActivitySchema.index({ userId: 1, timestamp: -1 });
ActivitySchema.index({ userId: 1, action: 1, timestamp: -1 });

// Prevent stale schema during hot-reload
if (mongoose.models.Activity) {
  delete mongoose.models.Activity;
}

export default mongoose.model<IActivity>('Activity', ActivitySchema);
