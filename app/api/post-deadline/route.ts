// post-deadline/route.tsx
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import User from '@/lib/models/User';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const body = await req.json();
    const { 
      courseId, 
      originalCourseId, 
      section, 
      type, 
      title, 
      details,
      submissionLink, 
      lastDate
    } = body;

    if (!courseId || !originalCourseId || !section || !type || !title || !details || !lastDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch user details from MongoDB using clerkId
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const course = await Course.findById(originalCourseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const sectionData = course.sections.find((s: any) => s.section === section);
    if (!sectionData) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const deadline = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${userId.substring(0, 8)}`,
      title,
      details: details || '',
      submissionLink: submissionLink || '',
      lastDate: new Date(lastDate),
      createdBy: userId,
      createdByName: user.name,
      createdByStudentId: user.student_ID,
      createdAt: new Date(),
      type,
      agrees: [],
      disagrees: []
    };

    if (type === 'theory') {
      if (!sectionData.theory.deadlines) {
        sectionData.theory.deadlines = [];
      }
      sectionData.theory.deadlines.push(deadline);
    } else if (type === 'lab') {
      if (!sectionData.lab.deadlines) {
        sectionData.lab.deadlines = [];
      }
      sectionData.lab.deadlines.push(deadline);
    }

    await course.save();

    // Add to user's deadlines
    if (!user.deadlines) {
      user.deadlines = [];
    }
    
    const userDeadline = {
      ...deadline,
      courseId,
      originalCourseId,
      courseCode: course.courseCode,
      courseName: course.courseName,
      section,
      type
    };
    
    user.deadlines.push(userDeadline);
    await user.save();

    return NextResponse.json({ success: true, deadline }, { status: 201 });
  } catch (error) {
    console.error('Error posting deadline:', error);
    return NextResponse.json({ error: 'Failed to post deadline' }, { status: 500 });
  }
}
