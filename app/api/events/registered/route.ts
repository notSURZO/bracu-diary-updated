import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import EventRegistration from '@/lib/models/EventRegistration';
import Club from '@/lib/models/Club';
import { getPublicObjectUrl } from '@/lib/storage/supabase';

// GET - List current user's registered events (upcoming first)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Ensure Club model is registered before population
    const _ensureClub = Club.modelName;

    const regs = await EventRegistration.find({ user: user._id, status: 'registered' })
      .populate({ path: 'event', select: 'title description date time location adminClub tags imageUrl imagePath imageBucket createdAt', populate: { path: 'adminClub', select: 'name' } })
      .lean();

    // Filter out stale registrations where the referenced event no longer exists
    const validRegs = regs.filter((r: any) => r.event);

    const now = new Date();
    const events = validRegs
      .map((r: any) => {
        const img = r.event?.imageUrl || (r.event?.imageBucket && r.event?.imagePath ? getPublicObjectUrl(r.event.imageBucket, r.event.imagePath) : '');
        // Compute if event is past using date + time
        const d = new Date(r.event?.date || 0);
        if (r.event?.time) {
          const [hh, mm] = String(r.event.time).split(':');
          if (!isNaN(parseInt(hh))) {
            d.setHours(parseInt(hh), parseInt(mm || '0'), 0, 0);
          }
        }
        const isPast = d.getTime() < Date.now();
        return {
          registrationId: r._id,
          eventId: r.event?._id,
          title: r.event?.title,
          description: r.event?.description,
          date: r.event?.date || new Date(0),
          time: r.event?.time || '',
          location: r.event?.location,
          clubName: r.event?.adminClub?.name || 'Unknown Club',
          tags: r.event?.tags || [],
          imageUrl: img,
          createdAt: r.createdAt,
          isPast,
        };
      })
      .sort((a, b) => new Date(a.date as any).getTime() - new Date(b.date as any).getTime());

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('Fetch registered events error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch registered events', error: message }, { status: 500 });
  }
}
