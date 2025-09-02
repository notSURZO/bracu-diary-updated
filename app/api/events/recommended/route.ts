import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Event from '@/lib/models/Event';
import Club from '@/lib/models/Club';
import { getPublicObjectUrl } from '@/lib/storage/supabase';

// GET - Recommended upcoming events based on user interests
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findOne({ clerkId: userId }).lean();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Use UTC start-of-today so events scheduled "today" aren't dropped by timezone offsets
    const now = new Date();
    const utcStartOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const interests = (user.interests || []).map((x: any) => String(x || '').trim()).filter(Boolean);

    // If no interests, return empty to let client fall back to all events
    if (!interests.length) {
      return NextResponse.json({ success: true, events: [], pagination: { currentPage: 1, totalPages: 1, totalEvents: 0, hasNextPage: false, hasPrevPage: false } });
    }

    // Ensure Club model is registered (avoid tree-shaking)
    const _ensureClub = Club.modelName;

    // Build case-insensitive matchers for tags
    const patterns = interests.map((i: string) => new RegExp(`^${i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

    const all = await Event.find({
      date: { $gte: utcStartOfToday },
      tags: { $in: patterns },
    })
      .populate('adminClub', 'name')
      .sort({ date: 1, time: 1 })
      .lean();
    
    // Apply precise upcoming filter using date + time
    const upcoming = all.filter((event: any) => {
      const d = new Date(event.date);
      if (event.time) {
        const [hStr = '0', mStr = '0'] = String(event.time).split(':');
        const h = parseInt(hStr);
        const m = parseInt(mStr);
        if (!Number.isNaN(h)) d.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
      }
      return d.getTime() >= Date.now();
    });

    const totalEvents = upcoming.length;
    const pageItems = upcoming.slice(skip, skip + limit);

    const formattedEvents = pageItems.map((event: any) => {
      const img = event.imageUrl || (event.imageBucket && event.imagePath ? getPublicObjectUrl(event.imageBucket, event.imagePath) : '');
      return {
        _id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        clubName: event.adminClub?.name || 'Unknown Club',
        tags: event.tags || [],
        imageUrl: img,
        createdAt: event.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      events: formattedEvents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalEvents / limit),
        totalEvents,
        hasNextPage: page * limit < totalEvents,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching recommended events:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch recommended events', error: message }, { status: 500 });
  }
}
