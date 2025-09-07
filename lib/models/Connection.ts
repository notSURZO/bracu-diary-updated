import { Schema, models, model, Document } from 'mongoose';

export interface IConnection extends Document {
  senderId: string; // Clerk user ID
  receiverId: string; // Clerk user ID
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    senderId: { type: String, required: true, index: true },
    receiverId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// Index to quickly find connections for a user
ConnectionSchema.index({ senderId: 1, receiverId: 1, status: 1 });

const Connection = models.Connection || model<IConnection>('Connection', ConnectionSchema);

export default Connection;
