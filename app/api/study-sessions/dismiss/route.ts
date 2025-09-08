import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { inviteId } = await req.json();
    if (!inviteId) return NextResponse.json({ message: 'inviteId required' }, { status: 400 });

    await connectToDatabase();

    const res = await User.updateOne(
      { clerkId: userId, 'studyInvites._id': new mongoose.Types.ObjectId(inviteId) },
      { $set: { 'studyInvites.$.active': false } }
    );

    if (res.modifiedCount === 0) return NextResponse.json({ message: 'Invite not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('dismiss invite error', e);
    return NextResponse.json({ message: 'Failed to dismiss invite' }, { status: 500 });
  }
}

