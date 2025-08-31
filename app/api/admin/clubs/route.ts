import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import Club from '@/lib/models/Club';
import User from '@/lib/models/User';

// GET - Fetch all clubs (for admin management)
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Check if user is a super admin (you can add this logic later)
    // For now, allow access to view clubs
    
    const clubs = await Club.find({}).select('-secretKey'); // Don't expose secret keys in GET
    
    return NextResponse.json({ 
      success: true, 
      clubs 
    });

  } catch (error) {
    console.error('Error fetching clubs:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to fetch clubs', error: message }, { status: 500 });
  }
}

// POST - Create a new club (for admin management)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Check if user is a super admin (you can add this logic later)
    // For now, allow creation of clubs
    
    const { name, adminEmail, secretKey } = await req.json();

    // Validate required fields
    if (!name || !adminEmail || !secretKey) {
      return NextResponse.json({ message: 'Name, admin email, and secret key are required' }, { status: 400 });
    }

    // Check if club with this name or admin email already exists
    const existingClub = await Club.findOne({
      $or: [
        { name: name.trim() },
        { adminEmail: adminEmail.toLowerCase().trim() },
        { secretKey: secretKey.trim() }
      ]
    });

    if (existingClub) {
      return NextResponse.json({ message: 'Club with this name, admin email, or secret key already exists' }, { status: 400 });
    }

    // Create new club
    const newClub = new Club({
      name: name.trim(),
      adminEmail: adminEmail.toLowerCase().trim(),
      secretKey: secretKey.trim()
    });

    await newClub.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Club created successfully',
      club: {
        _id: newClub._id,
        name: newClub.name,
        adminEmail: newClub.adminEmail,
        createdAt: newClub.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating club:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to create club', error: message }, { status: 500 });
  }
}
