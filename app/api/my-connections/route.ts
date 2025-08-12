import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '../../../lib/mongodb';
import User from '../../../lib/models/User';
import type { NextRequest } from 'next/server'; // Import NextRequest

export async function GET(request: NextRequest) { // Use NextRequest instead of Request
  try {
    await connectToDatabase();
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const friends = await User.find({
      email: { $in: currentUser.connections },
    }).select('id name username email picture_url');

    const formattedFriends = friends.map((friend: any) => ({
      id: friend._id.toString(),
      name: friend.name,
      username: friend.username,
      email: friend.email,
      picture_url: friend.picture_url,
    }));

    return NextResponse.json(formattedFriends);
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}