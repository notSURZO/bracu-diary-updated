import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import Event from '@/lib/models/Event';
import User from '@/lib/models/User';

// GET - Fetch a specific event by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Await params before using
    const { eventId } = await params;
    console.log('Fetching event with ID:', eventId);
    await connectToDatabase();
    
    // Check if Event model is working
    const eventCount = await Event.countDocuments();
    console.log('Total events in database:', eventCount);
    
    // Try to find the event without population first
    let event = await Event.findById(eventId).lean();
    console.log('Event found:', event ? 'Yes' : 'No');
    
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }
    
    // Try to populate adminClub separately to avoid population errors
    let clubName = 'Unknown Club';
    if ((event as any).adminClub) {
      try {
        const Club = (await import('@/lib/models/Club')).default;
        const club = await Club.findById((event as any).adminClub).select('name').lean();
        clubName = (club as any)?.name || 'Unknown Club';
      } catch (populateError) {
        console.error('Error populating club:', populateError);
        clubName = 'Unknown Club';
      }
    }
    
    // Format event for frontend
    const eventData = event as any;
    const formattedEvent = {
      _id: eventData._id.toString(),
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      time: eventData.time,
      location: eventData.location,
      clubName: clubName,
      tags: eventData.tags || [],
      imageUrl: eventData.imageUrl || '',
      imagePath: eventData.imagePath || '',
      imageBucket: eventData.imageBucket || '',
      createdAt: eventData.createdAt,
      updatedAt: eventData.updatedAt
    };
    
    return NextResponse.json({ 
      success: true, 
      event: formattedEvent 
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      eventId: params.eventId
    });
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      message: 'Failed to fetch event', 
      error: message,
      eventId: params.eventId 
    }, { status: 500 });
  }
}

// PUT - Update a specific event (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Await params before using
    const { eventId } = await params;

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
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    // Check if the event belongs to the admin's club
    if (event.adminClub.toString() !== user.adminClub.toString()) {
      return NextResponse.json({ message: 'Access denied. You can only edit events from your club.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, date, time, location, tags, imageUrl, imagePath, imageBucket } = body;

    // Validate required fields
    if (!title || !description || !date || !time || !location) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Validate date is not in the past
    const eventDate = new Date(date);
    const now = new Date();
    if (eventDate < now) {
      return NextResponse.json({ message: 'Event date cannot be in the past' }, { status: 400 });
    }

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      params.eventId,
      {
        title: title.trim(),
        description: description.trim(),
        date: new Date(date),
        time: time.trim(),
        location: location.trim(),
        tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [],
        imageUrl: imageUrl || '',
        imagePath: imagePath || '',
        imageBucket: imageBucket || '',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('adminClub', 'name');

    if (!updatedEvent) {
      return NextResponse.json({ message: 'Failed to update event' }, { status: 500 });
    }

    // Format updated event for frontend
    const updatedEventData = updatedEvent;
    const formattedEvent = {
      _id: updatedEventData._id.toString(),
      title: updatedEventData.title,
      description: updatedEventData.description,
      date: updatedEventData.date,
      time: updatedEventData.time,
      location: updatedEventData.location,
      clubName: updatedEventData.adminClub?.name || 'Unknown Club',
      tags: updatedEventData.tags || [],
      imageUrl: updatedEventData.imageUrl || '',
      imagePath: updatedEventData.imagePath || '',
      imageBucket: updatedEventData.imageBucket || '',
      createdAt: updatedEventData.createdAt,
      updatedAt: updatedEventData.updatedAt
    };

    return NextResponse.json({ 
      success: true, 
      message: 'Event updated successfully',
      event: formattedEvent 
    });

  } catch (error) {
    console.error('Error updating event:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to update event', error: message }, { status: 500 });
  }
}

// DELETE - Delete a specific event (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Await params before using
    const { eventId } = await params;

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
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    // Check if the event belongs to the admin's club
    if (event.adminClub.toString() !== user.adminClub.toString()) {
      return NextResponse.json({ message: 'Access denied. You can only delete events from your club.' }, { status: 403 });
    }

    // Store image info before deleting the event
    const imagePath = event.imagePath;
    const imageBucket = event.imageBucket;

    // Delete the event from database
    await Event.findByIdAndDelete(params.eventId);

    // Clean up the image from Supabase storage if it exists
    if (imagePath && imageBucket) {
      try {
        const { getSupabaseAdmin } = await import('@/lib/storage/supabase');
        const supabase = getSupabaseAdmin();
        const { error: deleteError } = await supabase.storage
          .from(imageBucket)
          .remove([imagePath]);
        
        if (deleteError) {
          console.error('Failed to delete image from storage:', deleteError);
          // Don't fail the request if image deletion fails
        } else {
          console.log('Successfully deleted image from storage:', imagePath);
        }
      } catch (imageError) {
        console.error('Error cleaning up image:', imageError);
        // Don't fail the request if image cleanup fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Event deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to delete event', error: message }, { status: 500 });
  }
}
