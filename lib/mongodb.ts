import mongoose from 'mongoose';

// Use a cached connection across hot reloads in development and serverless environments
// to prevent creating multiple connections.
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bracu-diary';

if (!global.mongooseCache) {
  global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<void> {
  const cache = global.mongooseCache!;

  if (cache.conn) {
    return;
  }

  if (!cache.promise) {
    try {
      cache.promise = mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        dbName: 'bracu-diary',
      });
    } catch (err) {
      cache.promise = null;
      throw err;
    }
  }

  try {
    cache.conn = await cache.promise;
    if (process.env.NODE_ENV !== 'test') {
      console.log('Connected to MongoDB (bracu-diary database)');
    }
  } catch (error) {
    cache.promise = null;
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
