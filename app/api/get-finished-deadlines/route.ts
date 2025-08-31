import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from "@/lib/mongodb"; // UPDATED IMPORT
import Course from '@/lib/models/Course';
import User from '@/lib/models/User';

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

  await connectToDatabase(); // UPDATED DATABASE CONNECTION

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    const dbUser = await User.findOne({ clerkId: user.id });
    if (!dbUser) {
        return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }
    
    // Find the user's section from their enrolled courses
    const enrollment = dbUser.enrolledCourses.find(
      (c: any) => c.originalCourseId === courseId
    );
    
    if (!enrollment) {
      return NextResponse.json({ deadlines: { theory: [], lab: [] } });
    }
    const userSection = enrollment.section;

    const sectionData = course.sections.find((s: any) => s.section === userSection);
    if (!sectionData) {
        return NextResponse.json({ deadlines: { theory: [], lab: [] } });
    }

    const now = new Date();
    
    // Check if the deadline's due date has passed OR if the user marked it as complete
    const userCompletedDeadlineIds = (dbUser.deadlines || [])
        .filter((d: any) => d.completed)
        .map((d: any) => d.id);
    
    const theoryDeadlines = sectionData.theory.deadlines.filter((d: any) =>
        new Date(d.lastDate) < now || userCompletedDeadlineIds.includes(d.id)
    );

    const labDeadlines = sectionData.lab ? sectionData.lab.deadlines.filter((d: any) =>
        new Date(d.lastDate) < now || userCompletedDeadlineIds.includes(d.id)
    ) : [];

    return NextResponse.json({ deadlines: { theory: theoryDeadlines, lab: labDeadlines } });

  } catch (error) {
    console.error('Error fetching finished deadlines:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}