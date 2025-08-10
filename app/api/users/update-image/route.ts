import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import User from '../../../../lib/models/User';

export async function PUT() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Find the user in MongoDB
    const dbUser = await User.findOne({ clerkId: user.id });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the profile image URL
    dbUser.picture_url = user.imageUrl || '';
    await dbUser.save();

    console.log('Updated user image in MongoDB:', user.imageUrl);

    return NextResponse.json({ 
      success: true, 
      picture_url: dbUser.picture_url 
    });
  } catch (error) {
    console.error('Error updating user image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 