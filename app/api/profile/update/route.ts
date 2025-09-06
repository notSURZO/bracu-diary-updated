import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import _ from 'lodash';
import { logActivity, ACTIVITY_TYPES, RESOURCE_TYPES } from '@/lib/utils/activityLogger';

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const body = await req.json();
  
  // All fields, including optional ones, should be included in the update
  const { clerkId, email, ...updateData } = body;

  if (!clerkId && !email) {
    return NextResponse.json({ message: 'Clerk ID or email is required' }, { status: 400 });
  }

  try {
    const user = await User.findOne(clerkId ? { clerkId } : { email });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Lodash merge will handle all new fields
    const updatedUser = _.merge(user, updateData);
    
    if (clerkId && !user.clerkId) {
        updatedUser.clerkId = clerkId;
    }

    await updatedUser.save();

    // Log profile update activity
    await logActivity(
      updatedUser.clerkId,
      ACTIVITY_TYPES.PROFILE_UPDATED,
      {
        title: 'Updated profile',
        description: 'Modified profile information',
        metadata: { 
          updatedFields: Object.keys(updateData),
          hasProfilePicture: !!updateData.picture_url,
          hasBio: !!updateData.bio
        }
      },
      RESOURCE_TYPES.USER,
      updatedUser.clerkId
    );
    
    return NextResponse.json({ success: true, user: updatedUser.toObject() });
  } catch (error) {
    console.error('Profile update error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to update profile', error: message }, { status: 500 });
  }
}