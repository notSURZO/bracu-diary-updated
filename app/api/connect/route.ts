// app/api/connect/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '../../../lib/models/User';
import { connectToDatabase } from '../../../lib/mongodb';

async function ensureDbConnected() {
  await connectToDatabase();
}

export async function POST(request: Request) {
  try {
    await ensureDbConnected();
    const body = await request.json();
    const { targetUserId, currentUserEmail } = body;

    // Validate required fields
    if (!targetUserId || !currentUserEmail) {
      return NextResponse.json(
        { error: 'Missing targetUserId or currentUserEmail' },
        { status: 400 }
      );
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

    // Initialize connectionRequests array if it doesn't exist
    if (!targetUser.connectionRequests) {
      targetUser.connectionRequests = [];
    }

    // Check if connection request already exists
    if (targetUser.connectionRequests.includes(currentUserEmail)) {
      return NextResponse.json(
        { message: 'Connect request already sent' },
        { status: 200 }
      );
    }

    // Add connection request
    targetUser.connectionRequests.push(currentUserEmail);
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