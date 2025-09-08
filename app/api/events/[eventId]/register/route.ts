import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Event from '@/lib/models/Event';
import EventRegistration from '@/lib/models/EventRegistration';
import { logEventRegistration } from '@/lib/utils/activityLogger';

// POST - Register current user for the event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { eventId } = await params;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    // Prevent registration for past events
    const eventDate = new Date(event.date);
    if (event.time) {
      const [hh, mm] = String(event.time).split(':');
      if (!isNaN(parseInt(hh))) {
        eventDate.setHours(parseInt(hh), parseInt(mm || '0'), 0, 0);
      }
    }
    const now = new Date();
    if (eventDate.getTime() < now.getTime()) {
      return NextResponse.json({ message: 'Event already completed. Registration is closed.' }, { status: 400 });
    }

    // Create registration if not exists
    try {
      const registration = await EventRegistration.create({
        event: event._id,
        user: user._id,
        status: 'registered',
      });

      // Log activity
      await logEventRegistration(
        userId,
        event.title,
        event._id.toString()
      );

      return NextResponse.json({
        success: true,
        message: 'Registration completed',
        registrationId: registration._id,
      });
    } catch (e: any) {
      if (e?.code === 11000) {
        // Duplicate key
        return NextResponse.json({ success: true, message: 'Already registered' });
      }
      throw e;
    }
  } catch (error) {
    console.error('Event registration error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to register for event', error: message }, { status: 500 });
  }
}

// DELETE - Cancel current user's registration for the event
export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
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
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    // Block cancellation for past events
    const eventDate = new Date(event.date);
    if (event.time) {
      const [hh, mm] = String(event.time).split(':');
      if (!isNaN(parseInt(hh))) {
        eventDate.setHours(parseInt(hh), parseInt(mm || '0'), 0, 0);
      }
    }
    const now = new Date();
    if (eventDate.getTime() < now.getTime()) {
      return NextResponse.json({ message: 'Event already completed. Cancellation is not allowed.' }, { status: 400 });
    }

    await EventRegistration.deleteOne({ event: event._id, user: user._id });
    return NextResponse.json({ success: true, message: 'Registration cancelled' });
  } catch (error) {
    console.error('Cancel registration error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to cancel registration', error: message }, { status: 500 });
  }
}
