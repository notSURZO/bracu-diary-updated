import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deadlines = currentUser.deadlines
      ?.filter((d: any) => new Date(d.lastDate) >= new Date())
      .map((d: any) => ({
        id: d.id,
        title: d.title,
        details: d.details,
        submissionLink: d.submissionLink,
        lastDate: d.lastDate instanceof Date ? d.lastDate.toISOString() : d.lastDate,
        courseId: d.courseId,
        courseCode: d.courseCode,
        courseName: d.courseName,
        section: d.section,
        type: d.type,
        createdBy: d.createdBy,
        createdByName: d.createdByName,
        createdByStudentId: d.createdByStudentId,
        createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
        completed: d.completed
      }))
      .sort((a: any, b: any) => {
        if (a.completed === b.completed) {
          return new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime();
        }
        return a.completed ? 1 : -1;
      }) || [];

    return NextResponse.json({ deadlines }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user deadlines:', error);
    return NextResponse.json({ error: 'Failed to fetch deadlines' }, { status: 500 });
  }
}