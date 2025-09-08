import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const user = await User.findOne({ clerkId: userId }).lean();
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const invites = (user.studyInvites || [])
      .filter((i: any) => i && i.active)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return NextResponse.json({ success: true, invites });
  } catch (e) {
    console.error('get invites error', e);
    return NextResponse.json({ message: 'Failed to fetch invites' }, { status: 500 });
  }
}

