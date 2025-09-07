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
        dbName: 'bracu-diary',
        // Connection pool optimization
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 2,  // Maintain at least 2 socket connections
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        serverSelectionTimeoutMS: 5000, // How long to try selecting a server
        socketTimeoutMS: 45000, // How long a send or receive on a socket can take
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
