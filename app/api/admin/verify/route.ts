import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth, currentUser } from '@clerk/nextjs/server';
import User from '@/lib/models/User';
import Club from '@/lib/models/Club';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { secretKey } = await req.json();

    if (!secretKey) {
      return NextResponse.json({ message: 'Secret key is required' }, { status: 400 });
    }

    // Get user's email directly from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser || !clerkUser.emailAddresses || clerkUser.emailAddresses.length === 0) {
      return NextResponse.json({ message: 'User email not found' }, { status: 404 });
    }

    const userEmail = clerkUser.emailAddresses[0].emailAddress;

    // Get user from our database
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Look up the club with the provided secret key
    const club = await Club.findOne({ secretKey });
    if (!club) {
      return NextResponse.json({ message: 'Invalid secret key' }, { status: 400 });
    }

    // Check if the adminEmail matches the user's email from Clerk
    if (club.adminEmail.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json({ 
        message: 'Email does not match club admin email',
        userEmail: userEmail,
        clubEmail: club.adminEmail
      }, { status: 403 });
    }

    // Update user's admin status using findOneAndUpdate to avoid validation issues
    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      { 
        isAdmin: true, 
        adminClub: club._id 
      },
      { new: true, runValidators: false }
    );

    if (!updatedUser) {
      console.error('Failed to update user admin status');
      return NextResponse.json({ 
        message: 'Failed to update user admin status'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin verification successful',
      clubName: club.name,
      clubId: club._id.toString()
    });

  } catch (error) {
    console.error('Admin verification error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to verify admin status', error: message }, { status: 500 });
  }
}
