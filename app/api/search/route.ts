import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../../lib/mongodb';
import User, { IUser } from '../../../lib/models/User';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    
    const users = await User
      .find({ name: { $regex: query, $options: 'i' } })
      .limit(10)
      .select('name username email student_ID picture_url')
      .lean<{
        _id: mongoose.Types.ObjectId;
        name: string;
        username: string;
        email: string;
        student_ID: string;
        picture_url: string;
      }[]>();

    const results = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      student_ID: user.student_ID,
      picture_url: user.picture_url,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}