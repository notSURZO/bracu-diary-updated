import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import User from '@/lib/models/User';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const section = searchParams.get('section');
    const type = searchParams.get('type'); // 'theory', 'lab', or 'all'

    if (!courseId || !section) {
      return NextResponse.json({ error: 'Missing courseId or section' }, { status: 400 });
    }

    // For deadlines, we should use the originalCourseId (stored in user's deadline object)
    // rather than trying to parse the modified courseId
    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the user's deadline to get the originalCourseId
    const userDeadline = currentUser.deadlines?.find((d: any) => 
      d.courseId === courseId && d.section === section
    );

    const originalCourseId = userDeadline?.originalCourseId || courseId;

    const course = await Course.findById(originalCourseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const sectionData = course.sections.find((s: any) => s.section === section);
    if (!sectionData) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    let deadlines = [];
    
    // Get deadlines based on type filter
    if (type === 'theory' && sectionData.theory?.deadlines) {
      deadlines = sectionData.theory.deadlines.filter((d: any) => new Date(d.lastDate) >= new Date());
    } else if (type === 'lab' && sectionData.lab?.deadlines) {
      deadlines = sectionData.lab.deadlines.filter((d: any) => new Date(d.lastDate) >= new Date());
    } else {
      // Get all deadlines
      const theoryDeadlines = sectionData.theory?.deadlines?.filter((d: any) => new Date(d.lastDate) >= new Date()) || [];
      const labDeadlines = sectionData.lab?.deadlines?.filter((d: any) => new Date(d.lastDate) >= new Date()) || [];
      deadlines = [...theoryDeadlines, ...labDeadlines];
    }

    // Sort by deadline date
    deadlines.sort((a: any, b: any) => new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime());

    return NextResponse.json({ deadlines }, { status: 200 });
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    return NextResponse.json({ error: 'Failed to fetch deadlines' }, { status: 500 });
  }
}
