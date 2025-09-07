import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    await connectToDatabase();
    const { studentId } = params;

    // Find user by student ID
    const userDoc = await User.findOne({ student_ID: studentId });

    // If user not found, return 404
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ username: userDoc.username });
  } catch (error) {
    console.error('Error fetching username by student ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
