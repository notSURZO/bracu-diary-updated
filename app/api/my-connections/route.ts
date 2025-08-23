import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '../../../lib/mongodb';
import mongoose from 'mongoose';
import User from '../../../lib/models/User';
import CourseResourceDirectory from '../../../lib/models/CourseResourceDirectory';
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

    type FriendData = {
      _id: mongoose.Types.ObjectId;
      name: string;
      username: string;
      email: string;
      picture_url: string;
      clerkId: string;
    };

    const friendDocs = await User.find({
      email: { $in: currentUser.connections },
    })
      .select('_id name username email picture_url clerkId')
      .lean();

    const friends: FriendData[] = friendDocs.map((doc: any) => ({
      _id: doc._id,
      name: doc.name,
      username: doc.username,
      email: doc.email,
      picture_url: doc.picture_url,
      clerkId: doc.clerkId,
    }));

    const friendClerkIds = friends.map(f => f.clerkId);

    const resourceCounts = await CourseResourceDirectory.aggregate([
      {
        $match: {
          ownerUserId: { $in: friendClerkIds },
          visibility: 'connections',
        },
      },
      {
        $group: {
          _id: '$ownerUserId',
          count: { $sum: 1 },
        },
      },
    ]);

    const countsMap = resourceCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    const formattedFriends = friends.map((friend) => ({
      clerkId: friend.clerkId,
      id: friend._id.toString(),
      name: friend.name,
      username: friend.username,
      email: friend.email,
      picture_url: friend.picture_url,
      sharedResourceCount: countsMap[friend.clerkId] || 0,
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