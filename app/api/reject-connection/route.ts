// app/api/reject-connection/route.ts
import { NextResponse } from 'next/server';
import User from '../../../lib/models/User';
import { connectToDatabase } from '../../../lib/mongodb';
import { logConnectionRejected } from '@/lib/utils/activityLogger';

async function ensureDbConnected() {
  await connectToDatabase();
}

export async function POST(request: Request) {
  try {
    await ensureDbConnected();
    const body = await request.json();
    const { userId, requesterEmail } = body;

    // Validate required fields
    if (!userId || !requesterEmail) {
      return NextResponse.json(
        { error: 'Missing userId or requesterEmail' },
        { status: 400 }
      );
    }

    // Find current user
    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find requester user for logging
    const requesterUser = await User.findOne({ email: requesterEmail });

    // Remove the connection request
    currentUser.connectionRequests = currentUser.connectionRequests.filter(
      (email: string) => email !== requesterEmail
    );

    await currentUser.save();

    // Log connection rejection activity
    if (requesterUser) {
      await logConnectionRejected(
        userId,
        requesterUser.clerkId,
        requesterUser.name
      );
    }

    return NextResponse.json(
      { message: 'Connection request rejected successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in reject-connection endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}