import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import User from '@/lib/models/User';
import Event from '@/lib/models/Event';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Check for recently verified admin header
    const recentlyVerified = req.headers.get('x-recently-verified-admin');
    const adminClubId = req.headers.get('x-admin-club-id');
    
    let isAdmin = false;
    let clubId = null;
    
    if (recentlyVerified === 'true' && adminClubId) {
      // User was recently verified - bypass database check
      isAdmin = true;
      clubId = adminClubId;
    } else {
      // Get user's profile and check admin status from database
      const user = await User.findOne({ clerkId: userId });
      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
      
      if (!user.isAdmin || !user.adminClub) {
        return NextResponse.json({ message: 'Access denied. Admin privileges required.' }, { status: 403 });
      }
      
      isAdmin = true;
      clubId = user.adminClub;
    }

    const { title, description, date, time, location } = await req.json();

    // Validate required fields
    if (!title || !description || !date || !time || !location) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    // Create new event
    const newEvent = new Event({
      title: title.trim(),
      description: description.trim(),
      date: new Date(date),
      time: time.trim(),
      location: location.trim(),
      adminClub: clubId
    });

    await newEvent.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Event created successfully',
      event: newEvent
    });

  } catch (error) {
    console.error('Event creation error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to create event', error: message }, { status: 500 });
  }
}
