import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '../../../lib/models/User';
import { connectToDatabase } from '../../../lib/mongodb';
import { auth } from '@clerk/nextjs/server';

async function ensureDbConnected() {
  await connectToDatabase();
}

export async function POST(request: Request) {
  try {
    await ensureDbConnected();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId } = body;

    // Validate required fields
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Missing targetUserId' },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid targetUserId format' },
        { status: 400 }
      );
    }

    // Find target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // Check if connection request exists
    if (!targetUser.connectionRequests?.includes(currentUser.email)) {
      return NextResponse.json(
        { message: 'No connection request found to cancel' },
        { status: 409 }
      );
    }

    // Remove connection request
    targetUser.connectionRequests = targetUser.connectionRequests.filter(
      (email: string) => email !== currentUser.email
    );
    await targetUser.save();

    return NextResponse.json(
      { message: 'Connection request canceled successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in cancel-connect endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
