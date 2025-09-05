import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import EventRegistration from '@/lib/models/EventRegistration';
import Event from '@/lib/models/Event';
import User from '@/lib/models/User';

// GET - Fetch registered users for a specific event (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
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

    // Find the event and verify ownership
    const event = await Event.findById(params.eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    // Check if the event belongs to the admin's club
    if (event.adminClub.toString() !== user.adminClub.toString()) {
      return NextResponse.json({ message: 'Access denied. You can only view registrations for events from your club.' }, { status: 403 });
    }

    // Fetch registrations with user details
    const registrations = await EventRegistration.find({ 
      event: params.eventId,
      status: 'registered' // Only show active registrations
    })
    .populate('user', 'name email student_ID picture_url')
    .sort({ createdAt: -1 }) // Most recent first
    .lean();

    // Format registrations for frontend
    const formattedRegistrations = registrations.map(reg => ({
      _id: reg._id,
      user: {
        _id: reg.user._id,
        name: reg.user.name,
        email: reg.user.email,
        student_ID: reg.user.student_ID,
        picture_url: reg.user.picture_url
      },
      registeredAt: reg.createdAt,
      status: reg.status
    }));

    return NextResponse.json({ 
      success: true, 
      registrations: formattedRegistrations,
      totalRegistrations: formattedRegistrations.length,
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location
      }
    });

  } catch (error) {
    console.error('Error fetching event registrations:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch registrations', error: message }, { status: 500 });
  }
}
