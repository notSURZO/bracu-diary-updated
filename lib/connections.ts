import { connectToDatabase } from '@/lib/db';
import Connection, { IConnection } from '@/lib/models/Connection';

/**
 * Retrieves a list of user IDs for a user's accepted connections.
 * @param userId The Clerk user ID.
 * @returns A promise that resolves to an array of connection user IDs.
 */
export async function getConnectionIds(userId: string): Promise<string[]> {
  await connectToDatabase();

  const connections = await Connection.find({
    $or: [{ senderId: userId }, { receiverId: userId }],
    status: 'accepted',
  }).lean();

  const connectionIds = connections.map((conn: IConnection) => {
    return conn.senderId === userId ? conn.receiverId : conn.senderId;
  });

  return connectionIds;
}
