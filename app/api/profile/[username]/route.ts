import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    await connectToDatabase();
    const { username } = params;
    const { userId } = await auth();

    // Find user by username
    const userDoc = await User.findOne({ username });

    // If user not found, return 404
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profileData: any = {
      _id: userDoc._id.toString(),
      name: userDoc.name || "Unknown",
      username: userDoc.username || "Not set",
      email: userDoc.email || "Not set",
      student_ID: userDoc.student_ID || "",
      bio: userDoc.bio || "",
      address: userDoc.address || "",
      department: userDoc.department || "",
      phone: userDoc.phone || "",
      picture_url: userDoc.picture_url || "/logo.svg",
      dateOfBirth: userDoc.dateOfBirth ? new Date(userDoc.dateOfBirth).toISOString().split('T')[0] : '',
      bloodGroup: userDoc.bloodGroup || "",
      socialMedia: userDoc.socialMedia || {},
      education: userDoc.education || {},
      connections: userDoc.connections || [],
      theme_color: userDoc.theme_color || "blue",
    };

    // If authenticated, add connection status
    if (userId) {
      const currentUser = await User.findOne({ clerkId: userId });
      if (currentUser) {
        profileData.isConnected = currentUser.connections?.includes(userDoc.email) || false;
        profileData.hasSentRequest = userDoc.connectionRequests?.includes(currentUser.email) || false;
      }
    }

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
