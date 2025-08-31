import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Get user directly from database using Clerk ID
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }



    return NextResponse.json({
      success: true,
      isAdmin: user.isAdmin || false,
      adminClub: user.adminClub,
      user: {
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        adminClub: user.adminClub
      }
    });

  } catch (error) {
    console.error('Error checking admin status:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to check admin status', error: message }, { status: 500 });
  }
}
