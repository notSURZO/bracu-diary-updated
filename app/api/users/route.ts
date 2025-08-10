import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '../../../lib/mongodb';
import User from '../../../lib/models/User';

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const dbUser = await User.findOne({ clerkId: user.id });
    
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await request.json();

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user already exists
    let dbUser = await User.findOne({ clerkId: user.id });
    
    if (dbUser) {
      // Update existing user
      dbUser.student_ID = studentId;
      dbUser.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      dbUser.email = user.emailAddresses[0]?.emailAddress || dbUser.email;
      dbUser.picture_url = user.imageUrl || dbUser.picture_url;
      dbUser.username = user.username || dbUser.username;
      await dbUser.save();
    } else {
      // Create new user
      dbUser = new User({
        clerkId: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        username: user.username || '',
        email: user.emailAddresses[0]?.emailAddress,
        student_ID: studentId,
        picture_url: user.imageUrl || '',
      });
      await dbUser.save();
    }

    return NextResponse.json(dbUser);
  } catch (error: any) {
    console.error('Error creating/updating user:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json({ 
        error: `${field === 'student_ID' ? 'Student ID' : field} already exists` 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 