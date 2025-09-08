import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

function randomSlug() {
  return 'study-' + Math.random().toString(36).slice(2, 8);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const host = await User.findOne({ clerkId: userId });
    if (!host) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const body = await req.json().catch(() => ({} as any));
    const roomSlug: string = (body?.roomSlug as string) || randomSlug();
    const targetEmails: string[] = Array.isArray(body?.invitees) && body.invitees.length
      ? body.invitees
      : (host.connections || []);

    // Push invites to each connection
    if (targetEmails.length) {
      await User.updateMany(
        { email: { $in: targetEmails } },
        {
          $push: {
            studyInvites: {
              roomSlug: roomSlug,
              hostName: host.name || 'A friend',
              hostEmail: host.email,
              createdAt: new Date(),
              active: true,
            },
          },
        }
      );
    }

    const meetUrl = `https://meet.jit.si/BRACU-DIARY-${encodeURIComponent(roomSlug)}#config.prejoinPageEnabled=true`;
    return NextResponse.json({ success: true, roomSlug, meetUrl, invitedCount: targetEmails.length });
  } catch (e) {
    console.error('start study session error', e);
    return NextResponse.json({ message: 'Failed to start session' }, { status: 500 });
  }
}

