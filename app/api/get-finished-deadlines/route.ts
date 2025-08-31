import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from "@/lib/mongodb";
import Course from '@/lib/models/Course';
import User from '@/lib/models/User';
import { isValidObjectId } from 'mongoose';

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
  }

  // Extract base courseId if it includes section information
  const baseCourseId = courseId.split('-')[0];
  if (!isValidObjectId(baseCourseId)) {
    console.error('Invalid courseId format:', courseId);
    return NextResponse.json({ error: 'Invalid Course ID format' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const course = await Course.findById(baseCourseId);
    if (!course) {
      console.error('Course not found for ID:', baseCourseId);
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const dbUser = await User.findOne({ clerkId: user.id });
    if (!dbUser) {
      console.error('User not found in DB for clerkId:', user.id);
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // Find the user's section from their enrolled courses
    const enrollment = dbUser.enrolledCourses?.find(
      (c: any) => c.originalCourseId === baseCourseId
    );

    if (!enrollment) {
      console.log('User not enrolled in course:', baseCourseId);
      return NextResponse.json({ deadlines: { theory: [], lab: [] } }, { status: 200 });
    }
    const userSection = enrollment.section;

    const sectionData = course.sections?.find((s: any) => s.section === userSection);
    if (!sectionData) {
      console.log('Section not found for course:', baseCourseId, 'section:', userSection);
      return NextResponse.json({ deadlines: { theory: [], lab: [] } }, { status: 200 });
    }

    const now = new Date();
    const userCompletedDeadlineIds = (dbUser.deadlines || [])
      .filter((d: any) => d.completed)
      .map((d: any) => d.id);

    // Safely access deadlines with fallback to empty arrays
    const theoryDeadlines = (sectionData.theory?.deadlines || []).filter(
      (d: any) => new Date(d.lastDate) < now || userCompletedDeadlineIds.includes(d.id)
    );

    const labDeadlines = (sectionData.lab?.deadlines || []).filter(
      (d: any) => new Date(d.lastDate) < now || userCompletedDeadlineIds.includes(d.id)
    );

    return NextResponse.json({ deadlines: { theory: theoryDeadlines, lab: labDeadlines } }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching finished deadlines:', {
      message: error.message,
      stack: error.stack,
      courseId,
      userId: user.id
    });
    return NextResponse.json({ error: 'Failed to fetch deadlines' }, { status: 500 });
  }
}
