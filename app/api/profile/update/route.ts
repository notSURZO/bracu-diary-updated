import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const body = await req.json();
  console.log('Profile update request body:', body);
  const { clerkId, name, username, email, student_ID, phone, bio, address, department } = body;

  if (!clerkId && !email) {
    return NextResponse.json({ error: 'Missing clerkId and email' }, { status: 400 });
  }

  try {
    let user = null;
    if (clerkId) {
      user = await User.findOne({ clerkId });
    }
    // Fallback: try finding by email if not found by clerkId
    if (!user && email) {
      user = await User.findOne({ email });
      // If found by email but missing clerkId, set it
      if (user && !user.clerkId && clerkId) {
        user.clerkId = clerkId;
      }
    }
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }


    // Update all fields robustly, ensuring new fields are added
    user.set({
      ...(name !== undefined && { name }),
      ...(username !== undefined && { username }),
      ...(email !== undefined && { email }),
      ...(student_ID !== undefined && { student_ID }),
      ...(phone !== undefined && { phone }),
      ...(bio !== undefined && { bio }),
      ...(address !== undefined && { address }),
      ...(department !== undefined && { department }),
    });

    await user.save();
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Profile update error:', error);
    let message = 'Unknown error';
    if (error instanceof Error) message = error.message;
    // If it's a Mongo error, show the code and keyValue
    if (typeof error === 'object' && error && 'code' in error && 'keyValue' in error) {
      message += ` (Mongo error code: ${(error as any).code}, key: ${JSON.stringify((error as any).keyValue)})`;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
