import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { friendEmail } = await req.json();
    if (!friendEmail) {
      return NextResponse.json({ error: 'Friend email is required' }, { status: 400 });
    }

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const friend = await User.findOne({ email: friendEmail });
    if (!friend) {
      return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
    }

    // Remove friendEmail from currentUser's connections if it exists
    if (currentUser.connections.includes(friendEmail)) {
      currentUser.connections = currentUser.connections.filter((email: string) => email !== friendEmail);
    }

    // Remove currentUser's email from friend's connections if it exists
    if (friend.connections.includes(currentUser.email)) {
      friend.connections = friend.connections.filter((email: string) => email !== currentUser.email);
    }

    // If no connections were removed from either side, return an error
    if (!currentUser.isModified() && !friend.isModified()) {
      return NextResponse.json({ error: 'Users are not connected' }, { status: 400 });
    }

    await currentUser.save();
    await friend.save();

    return NextResponse.json({ message: 'Successfully disconnected' }, { status: 200 });
  } catch (error) {
    console.error('Error disconnecting user:', error);
    return NextResponse.json({ error: 'Failed to disconnect user' }, { status: 500 });
  }
}