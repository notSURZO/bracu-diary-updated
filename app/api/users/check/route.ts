import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongodb';
import User from '../../../../lib/models/User';

export async function POST(request: Request) {
  try {
    const { username, email, studentId } = await request.json();

    console.log('Checking user data:', { username, email, studentId });

    if (!username || !email || !studentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate input formats
    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!/^\d+$/.test(studentId)) {
      return NextResponse.json({ error: 'Student ID must contain only numbers' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      console.log('Username already exists:', username);
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      console.log('Email already exists:', email);
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Check if student ID already exists
    const existingStudentId = await User.findOne({ student_ID: studentId.trim() });
    if (existingStudentId) {
      console.log('Student ID already exists:', studentId);
      return NextResponse.json({ error: 'Student ID already exists' }, { status: 400 });
    }

    console.log('All checks passed');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error checking user data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 