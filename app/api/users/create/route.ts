import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import User from '../../../../lib/models/User';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { clerkId, name, username, email, student_ID, picture_url } = await request.json();

    console.log('Creating user with data:', { clerkId, name, username, email, student_ID });

    if (!clerkId || !name || !username || !email || !student_ID) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate data formats
    if (name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }

    if (username.trim().length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!/^\d+$/.test(student_ID.trim())) {
      return NextResponse.json({ error: 'Student ID must contain only numbers' }, { status: 400 });
    }

    // Fetch user's profile image from Clerk
    let userImageUrl = picture_url || '';
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      userImageUrl = clerkUser.imageUrl || '';
      console.log('Fetched user image from Clerk:', userImageUrl);
    } catch (clerkError) {
      console.log('Could not fetch user image from Clerk, using default:', clerkError);
    }

    await connectToDatabase();

    // Check if user already exists (shouldn't happen, but safety check)
    const existingUser = await User.findOne({ clerkId });
    if (existingUser) {
      console.log('User already exists with clerkId:', clerkId);
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Double-check uniqueness constraints
    const [existingUsername, existingEmail, existingStudentId] = await Promise.all([
      User.findOne({ username: username.trim() }),
      User.findOne({ email: email.trim().toLowerCase() }),
      User.findOne({ student_ID: student_ID.trim() })
    ]);

    if (existingUsername) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    if (existingEmail) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    if (existingStudentId) {
      return NextResponse.json({ error: 'Student ID already exists' }, { status: 400 });
    }

    // Create new user
    const newUser = new User({
      clerkId: clerkId.trim(),
      name: name.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      student_ID: student_ID.trim(),
      picture_url: userImageUrl,
    });

    console.log('Saving user to MongoDB...');
    await newUser.save();
    console.log('User saved successfully with ID:', newUser._id);

    return NextResponse.json({ 
      success: true, 
      user: {
        id: newUser._id,
        clerkId: newUser.clerkId,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        student_ID: newUser.student_ID,
        picture_url: newUser.picture_url,
        createdAt: newUser.createdAt
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      let errorMessage = `${field} already exists`;
      
      if (field === 'student_ID') {
        errorMessage = 'Student ID already exists';
      } else if (field === 'username') {
        errorMessage = 'Username already exists';
      } else if (field === 'email') {
        errorMessage = 'Email already exists';
      } else if (field === 'clerkId') {
        errorMessage = 'Account already exists';
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: validationErrors.join(', ') }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 