import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../../lib/mongodb';
import User, { IUser } from '../../../lib/models/User';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const excludeEmail = searchParams.get('excludeEmail')?.trim().toLowerCase(); // Normalize to lowercase

  console.log('Search query:', query, 'Exclude email:', excludeEmail); // Debug: Log query params

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const filter: any = {
      $or: [
        { name: { $regex: '^' + query, $options: 'i' } }, // Prefix match for name
        { username: { $regex: '^' + query, $options: 'i' } }, // Prefix match for username
      ],
    };

    if (excludeEmail) {
      filter.email = { $ne: excludeEmail }; // Exclude by email
      console.log('Excluding user with email:', excludeEmail); // Debug: Confirm exclusion email
    }

    console.log('MongoDB filter:', JSON.stringify(filter, null, 2)); // Debug: Log the filter

    const users = await User.find(filter)
      .limit(10)
      .select('name username email student_ID picture_url _id')
      .lean<{
        _id: mongoose.Types.ObjectId;
        name: string;
        username: string;
        email: string;
        student_ID: string;
        picture_url: string;
      }[]>();

    // Normalize emails in results for debugging
    const normalizedUsers = users.map((user) => ({
      ...user,
      email: user.email.toLowerCase(),
    }));

    console.log('Found users:', normalizedUsers); // Debug: Log normalized results

    // Check if excludeEmail appears in results
    if (excludeEmail && normalizedUsers.some((user) => user.email === excludeEmail)) {
      console.warn('Warning: excludeEmail found in results:', excludeEmail);
    }

    const results = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email, // Return original email for display
      student_ID: user.student_ID,
      picture_url: user.picture_url,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}