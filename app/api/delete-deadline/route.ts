// delete-deadline/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import { auth } from '@clerk/nextjs/server';

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

    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const sectionData = course.sections.find((s: any) => s.section === section);
    if (!sectionData) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    let deadlineArray;
    if (type === 'theory') {
      deadlineArray = sectionData.theory?.deadlines || [];
    } else if (type === 'lab') {
      deadlineArray = sectionData.lab?.deadlines || [];
    } else {
      return NextResponse.json({ error: 'Invalid deadline type' }, { status: 400 });
    }

    // Find the deadline and check if the user created it
    const deadlineIndex = deadlineArray.findIndex((d: any) => 
      (d.id === deadlineId || d._id?.toString() === deadlineId) && d.createdBy === userId
    );

    if (deadlineIndex === -1) {
      return NextResponse.json({ error: 'Deadline not found or you are not authorized to delete it' }, { status: 404 });
    }

    // Remove the deadline from the array
    deadlineArray.splice(deadlineIndex, 1);

    // Update the course document
    if (type === 'theory') {
      sectionData.theory.deadlines = deadlineArray;
    } else {
      sectionData.lab.deadlines = deadlineArray;
    }

    await course.save();

    return NextResponse.json({ message: 'Deadline deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting deadline:', error);
    return NextResponse.json({ error: 'Failed to delete deadline' }, { status: 500 });
  }
}
