import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import User from '@/lib/models/User';
import { auth } from '@clerk/nextjs/server';
import { logDeadlineCreated } from '@/lib/utils/activityLogger';

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
      category,
      title,
      details,
      submissionLink,
      lastDate
    } = body;

    if (!courseId || !originalCourseId || !section || !type || !category || !title || !details || !lastDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate that lastDate is in the future
    const deadlineDate = new Date(lastDate);
    const currentDate = new Date();
    if (deadlineDate <= currentDate) {
      return NextResponse.json({ error: 'Deadline date must be in the future' }, { status: 400 });
    }

    // Fetch user details from MongoDB using clerkId
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch course details
    const course = await Course.findById(originalCourseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Verify section exists
    const sectionData = course.sections.find((s: any) => s.section === section);
    if (!sectionData) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Create deadline object
    const deadline = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 11)}-${userId.substr(0, 8)}`,
      title,
      details: details || '',
      submissionLink: submissionLink || '',
      lastDate: deadlineDate,
      createdBy: userId,
      createdByName: user.name,
      createdByStudentId: user.student_ID,
      createdAt: new Date(),
      type,
      category,
      agrees: [],
      disagrees: []
    };

    // Add deadline to course schema
    if (type === 'theory') {
      if (!sectionData.theory.deadlines) {
        sectionData.theory.deadlines = [];
      }
      sectionData.theory.deadlines.push(deadline);
    } else if (type === 'lab') {
      if (!sectionData.lab) {
        return NextResponse.json({ error: 'Lab section not available for this course' }, { status: 400 });
      }
      if (!sectionData.lab.deadlines) {
        sectionData.lab.deadlines = [];
      }
      sectionData.lab.deadlines.push(deadline);
    } else {
      return NextResponse.json({ error: 'Invalid deadline type' }, { status: 400 });
    }

    await course.save();

    // Log activity for the creator
    await logDeadlineCreated(
      userId,
      title,
      course.courseCode,
      section,
      deadline.id
    );

    // Find all users enrolled in this course section
    const users = await User.find({
      'enrolledCourses': {
        $elemMatch: {
          originalCourseId: originalCourseId,
          section: section
        }
      }
    });

    // Add deadline to each user's deadlines array
    const userDeadline = {
      id: deadline.id,
      title: deadline.title,
      details: deadline.details,
      submissionLink: deadline.submissionLink,
      lastDate: deadline.lastDate,
      courseId,
      originalCourseId,
      courseCode: course.courseCode,
      courseName: course.courseName,
      section,
      type,
      category,
      createdBy: deadline.createdBy,
      createdByName: deadline.createdByName,
      createdByStudentId: deadline.createdByStudentId,
      createdAt: deadline.createdAt,
      completed: false
    };

    for (const enrolledUser of users) {
      if (!enrolledUser.deadlines) {
        enrolledUser.deadlines = [];
      }
      // Check if deadline already exists to prevent duplicates
      const existingDeadline = enrolledUser.deadlines.find((d: any) => d.id === userDeadline.id);
      if (!existingDeadline) {
        enrolledUser.deadlines.push(userDeadline);
        await enrolledUser.save();
      }
    }

    return NextResponse.json({ success: true, deadline }, { status: 201 });
  } catch (error) {
    console.error('Error posting deadline:', error);
    return NextResponse.json({ error: 'Failed to post deadline' }, { status: 500 });
  }
}