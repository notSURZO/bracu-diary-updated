import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bracu-diary';
let isConnected: boolean = false;

export async function connectToDatabase(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      dbName: 'bracu-diary'
    });
    isConnected = true;
    console.log('Connected to MongoDB (bracu-diary database)');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
