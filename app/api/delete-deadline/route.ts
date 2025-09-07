import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import User from '@/lib/models/User';
import { auth } from '@clerk/nextjs/server';
import { logDeadlineDeleted } from '@/lib/utils/activityLogger';

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const deadlineId = searchParams.get('deadlineId');
    const courseId = searchParams.get('courseId');
    const section = searchParams.get('section');
    const type = searchParams.get('type');

    if (!deadlineId || !courseId || !section || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Find the section
    const sectionData = course.sections.find((s: any) => s.section === section);
    if (!sectionData) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    // Determine the deadline array based on type
    let deadlineArray;
    if (type === 'theory') {
      deadlineArray = sectionData.theory?.deadlines || [];
    } else if (type === 'lab') {
      deadlineArray = sectionData.lab?.deadlines || [];
    } else {
      return NextResponse.json({ error: 'Invalid deadline type' }, { status: 400 });
    }

    // Find the deadline and verify ownership
    const deadlineIndex = deadlineArray.findIndex((d: any) =>
      (d.id === deadlineId || d._id?.toString() === deadlineId) && d.createdBy === userId
    );

    if (deadlineIndex === -1) {
      return NextResponse.json({ error: 'Deadline not found or you are not authorized to delete it' }, { status: 404 });
    }

    const deadline = deadlineArray[deadlineIndex];

    // Check if the deadline was posted more than 24 hours ago
    const timeSinceCreation = new Date().getTime() - new Date(deadline.createdAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (timeSinceCreation > twentyFourHours) {
      return NextResponse.json({ error: 'You can only delete deadlines within 24 hours of posting' }, { status: 400 });
    }

    // Log activity before deletion
    await logDeadlineDeleted(
      userId,
      deadline.title,
      course.courseCode,
      deadlineId
    );

    // Remove the deadline from the course's array
    deadlineArray.splice(deadlineIndex, 1);

    // Update the course document
    if (type === 'theory') {
      sectionData.theory.deadlines = deadlineArray;
    } else {
      sectionData.lab.deadlines = deadlineArray;
    }

    await course.save();

    // Find all users enrolled in this course section
    const users = await User.find({
      'enrolledCourses': {
        $elemMatch: {
          originalCourseId: courseId,
          section: section
        }
      }
    });

    // Remove the deadline from each user's deadlines array
    for (const user of users) {
      user.deadlines = (user.deadlines || []).filter((d: any) =>
        d.id !== deadlineId && d._id?.toString() !== deadlineId
      );

      // Also remove marks associated with this deadline
      if (user.marks) {
        user.marks.forEach((courseMark: any) => {
          if (courseMark.courseId.toString() === courseId) {
            ['quiz', 'assignment', 'mid', 'final'].forEach(type => {
              courseMark[type] = courseMark[type].filter((mark: any) =>
                mark.deadlineId !== deadlineId && mark.deadlineId !== deadline._id?.toString()
              );
            });
          }
        });
      }

      await user.save();
    }

    return NextResponse.json({ message: 'Deadline deleted successfully from course and user records' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting deadline:', error);
    return NextResponse.json({ error: 'Failed to delete deadline' }, { status: 500 });
  }
}