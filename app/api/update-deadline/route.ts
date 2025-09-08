import { NextResponse } from 'next/server';
import User from '@/lib/models/User';
import { connectToDatabase } from '@/lib/mongodb';
import { logDeadlineCompleted } from '@/lib/utils/activityLogger';

export async function PATCH(req: Request) {
  try {
    await connectToDatabase();

    const { deadlineId, userId, completed } = await req.json();

    if (!deadlineId || !userId || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deadline = user.deadlines.find((d: any) => d.id === deadlineId);
    if (!deadline) {
      return NextResponse.json({ error: 'Deadline not found in user data' }, { status: 404 });
    }

    // Log activity if deadline is being marked as completed
    if (completed && !deadline.completed) {
      await logDeadlineCompleted(
        userId,
        deadline.title,
        deadline.courseCode,
        deadlineId
      );
    }

    deadline.completed = completed;
    await user.save();

    return NextResponse.json({ message: 'Deadline completion status updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating deadline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}