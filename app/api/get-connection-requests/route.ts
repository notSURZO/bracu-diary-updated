// app/api/get-connection-requests/route.ts
import { NextResponse } from 'next/server';
import User from '../../../lib/models/User';
import { connectToDatabase } from '../../../lib/mongodb';

async function ensureDbConnected() {
  await connectToDatabase();
}

export async function POST(request: Request) {
  try {
    await ensureDbConnected();
    const body = await request.json();
    const { userId } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Find the current user by clerkId
    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch user details for each email in connectionRequests
    const connectionRequests = await User.find({
      email: { $in: currentUser.connectionRequests || [] },
    }).select('name username email student_ID picture_url');

    return NextResponse.json(
      { connectionRequests },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in get-connection-requests endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}