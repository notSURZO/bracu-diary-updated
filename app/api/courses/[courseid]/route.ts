// app/api/courses/[courseid]/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import mongoose from 'mongoose';

export async function GET(request: Request, context: { params: { courseid: string } }) {
  try {
  // The context object contains the params
  const { params } = await context;
  const courseId = params.courseid;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ message: 'Invalid Course ID' }, { status: 400 });
    }

    await connectToDatabase();
    const course = await Course.findById(courseId);

    if (!course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json(course, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to fetch course details' }, { status: 500 });
  }
}