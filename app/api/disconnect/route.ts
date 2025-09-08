import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { auth } from '@clerk/nextjs/server';
import { logConnectionRemoved } from '@/lib/utils/activityLogger';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    console.log('Disconnect API - userId:', userId);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { friendEmail } = await req.json();
    console.log('Disconnect API - friendEmail:', friendEmail);
    if (!friendEmail) {
      return NextResponse.json({ error: 'Friend email is required' }, { status: 400 });
    }

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('Disconnect API - currentUser email:', currentUser.email);
    console.log('Disconnect API - currentUser connections:', currentUser.connections);

    const friend = await User.findOne({ email: friendEmail });
    if (!friend) {
      return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
    }
    console.log('Disconnect API - friend email:', friend.email);
    console.log('Disconnect API - friend connections:', friend.connections);

    // Remove friendEmail from currentUser's connections if it exists
    const currentUserHadConnection = currentUser.connections.includes(friendEmail);
    if (currentUserHadConnection) {
      currentUser.connections = currentUser.connections.filter((email: string) => email !== friendEmail);
      console.log('Disconnect API - removed from currentUser connections');
    }

    // Remove currentUser's email from friend's connections if it exists
    const friendHadConnection = friend.connections.includes(currentUser.email);
    if (friendHadConnection) {
      friend.connections = friend.connections.filter((email: string) => email !== currentUser.email);
      console.log('Disconnect API - removed from friend connections');
    }

    // If no connections were removed from either side, return an error
    if (!currentUserHadConnection && !friendHadConnection) {
      console.log('Disconnect API - users were not connected');
      return NextResponse.json({ error: 'Users are not connected' }, { status: 400 });
    }

    await currentUser.save();
    await friend.save();

    // Log connection removal activity
    await logConnectionRemoved(
      userId,
      friend.clerkId,
      friend.name
    );

    return NextResponse.json({ message: 'Successfully disconnected' }, { status: 200 });
  } catch (error) {
    console.error('Error disconnecting user:', error);
    return NextResponse.json({ error: 'Failed to disconnect user' }, { status: 500 });
  }
}