import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User, { IUser } from '../../../lib/models/User';
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

    // Initialize arrays if they don't exist
    if (!targetUser.connectionRequests) {
      targetUser.connectionRequests = [];
    }
    if (!targetUser.connections) {
      targetUser.connections = [];
    }

    // Check if already connected
    if (targetUser.connections.includes(currentUser.email)) {
      return NextResponse.json(
        { message: 'Already connected with this user' },
        { status: 409 }
      );
    }

    // Check if connection request already exists
    if (targetUser.connectionRequests.includes(currentUser.email)) {
      return NextResponse.json(
        { message: 'Connect request already sent' },
        { status: 409 }
      );
    }

    // Add connection request
    targetUser.connectionRequests.push(currentUser.email);
    await targetUser.save();

    return NextResponse.json(
      { message: 'Connect request sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in connect endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}