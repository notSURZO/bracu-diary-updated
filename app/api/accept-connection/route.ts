// app/api/accept-connection/route.ts
import { NextResponse } from 'next/server';
import User from '../../../lib/models/User';
import { connectToDatabase } from '../../../lib/mongodb';
import { logConnectionAccepted } from '../../../lib/utils/activityLogger';

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

    // Find current user and requester
    const currentUser = await User.findOne({ clerkId: userId });
    const requester = await User.findOne({ email: requesterEmail });

    if (!currentUser || !requester) {
      return NextResponse.json(
        { error: 'User or requester not found' },
        { status: 404 }
      );
    }

    // Initialize connections array if it doesn't exist
    if (!currentUser.connections) {
      currentUser.connections = [];
    }
    if (!requester.connections) {
      requester.connections = [];
    }

    // Check if already connected
    if (currentUser.connections.includes(requesterEmail)) {
      return NextResponse.json(
        { message: 'Already connected' },
        { status: 200 }
      );
    }

    // Add mutual connections
    currentUser.connections.push(requesterEmail);
    requester.connections.push(currentUser.email);

    // Remove the connection request
    currentUser.connectionRequests = currentUser.connectionRequests.filter(
      (email: string) => email !== requesterEmail
    );

    await Promise.all([currentUser.save(), requester.save()]);

    // Log activity for the person who accepted the connection
    await logConnectionAccepted(
      currentUser.clerkId,
      requester.name || requester.email,
      requester.email
    );

    return NextResponse.json(
      { message: 'Connection accepted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in accept-connection endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}