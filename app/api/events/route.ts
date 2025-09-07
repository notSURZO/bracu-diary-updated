import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import Club from '@/lib/models/Club';
import { getPublicObjectUrl } from '@/lib/storage/supabase';
    // Ensure Club model is registered (avoid tree-shaking)
    const _ensureClub = Club.modelName;
    
// GET - Fetch all events with club information
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const includePast = (searchParams.get('includePast') || searchParams.get('all')) === 'true';
    const skip = (page - 1) * limit;
    
    // Get UTC start-of-today for inclusive filtering of today's events
    const now = new Date();
    const utcStartOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // Fetch events with club information, sorted by date
    const baseFilter: Record<string, any> = includePast ? {} : { date: { $gte: utcStartOfToday } };

    let events: any[];
    let totalEvents: number;

    if (includePast) {
      // Simple paginated query
      events = await Event.find(baseFilter)
        .populate('adminClub', 'name')
        .sort({ date: 1, time: 1 })
        .limit(limit)
        .skip(skip)
        .lean();
      totalEvents = await Event.countDocuments(baseFilter);
    } else {
      // Fetch all today+ events, then apply precise datetime filter and paginate in-memory
      const all = await Event.find(baseFilter)
        .populate('adminClub', 'name')
        .sort({ date: 1, time: 1 })
        .lean();

      const filtered = all.filter((event: any) => {
        const d = new Date(event.date);
        if (event.time) {
          const [hStr = '0', mStr = '0'] = String(event.time).split(':');
          const h = parseInt(hStr);
          const m = parseInt(mStr);
          if (!Number.isNaN(h)) d.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
        }
        return d.getTime() >= Date.now();
      });

      totalEvents = filtered.length;
      events = filtered.slice(skip, skip + limit);
    }

    // Format events for frontend
    const formattedEvents = events.map(event => {
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
        createdAt: event.createdAt
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
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch events', error: message }, { status: 500 });
  }
}
