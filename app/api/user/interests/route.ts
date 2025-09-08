import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { logInterestsUpdated } from '@/lib/utils/activityLogger';

// POST - Update current user's interests
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { interests } = await req.json();
    if (!Array.isArray(interests)) {
      return NextResponse.json({ message: 'Invalid interests payload' }, { status: 400 });
    }

    await connectToDatabase();
    // Normalize: trim, lowercase, unique
    const normalized = Array.from(
      new Set(
        interests
          .map((i: any) => String(i || '').trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: { interests: normalized } },
      { new: true }
    ).lean();

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Log interests update activity
    await logInterestsUpdated(userId, normalized);

    return NextResponse.json({ success: true, interests: user.interests || [] });
  } catch (error) {
    console.error('Update interests error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to update interests', error: message }, { status: 500 });
  }
}

// GET - Fetch current user's interests
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId }).lean();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, interests: user.interests || [] });
  } catch (error) {
    console.error('Fetch interests error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch interests', error: message }, { status: 500 });
  }
}
