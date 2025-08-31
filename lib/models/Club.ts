import mongoose, { Schema, Document } from 'mongoose';

export interface IClub extends Document {
  name: string;
  adminEmail: string;
  secretKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClubSchema: Schema = new Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  adminEmail: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  secretKey: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  }
}, { 
  timestamps: true 
});

export default mongoose.models.Club || mongoose.model<IClub>('Club', ClubSchema);
