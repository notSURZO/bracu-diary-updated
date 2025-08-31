import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import Event from '@/lib/models/Event';
import User from '@/lib/models/User';

// GET - Fetch events created by the authenticated admin
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get user's profile and check admin status
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check if user is an admin
    if (!user.isAdmin || !user.adminClub) {
      return NextResponse.json({ message: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Fetch events for this admin's club
    const events = await Event.find({ 
      adminClub: user.adminClub 
    })
    .sort({ date: 1, time: 1 }) // Sort by date and time
    .limit(limit)
    .skip(skip)
    .lean();
    
    // Get total count for pagination
    const totalEvents = await Event.countDocuments({ 
      adminClub: user.adminClub 
    });
    
    // Format events for frontend
    const formattedEvents = events.map(event => ({
      _id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
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
    console.error('Error fetching admin events:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch events', error: message }, { status: 500 });
  }
}
