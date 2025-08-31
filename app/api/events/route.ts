import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import Club from '@/lib/models/Club';

// GET - Fetch all events with club information
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Get current date for filtering future events
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    // Fetch events with club information, sorted by date
    const events = await Event.find({ 
      date: { $gte: currentDate } // Only future events
    })
    .populate('adminClub', 'name') // Include club name
    .sort({ date: 1, time: 1 }) // Sort by date and time
    .limit(limit)
    .skip(skip)
    .lean(); // Convert to plain objects for better performance
    
    // Get total count for pagination
    const totalEvents = await Event.countDocuments({ 
      date: { $gte: currentDate } 
    });
    
    // Format events for frontend
    const formattedEvents = events.map(event => ({
      _id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      clubName: event.adminClub?.name || 'Unknown Club',
      createdAt: event.createdAt
    }));
    
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
