import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import Review from '@/lib/models/Review';
import mongoose from 'mongoose';

export async function GET(request: Request, context: { params: { courseid: string } }) {
  try {
    // Await the params to correctly access the dynamic route parameter
    const { courseid: courseId } = await (context as any).params;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ message: 'Invalid Course ID' }, { status: 400 });
    }

    await connectToDatabase();
    const course = await Course.findById(courseId);

    if (!course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // Fetch reviews for this course
    const reviews = await Review.find({ courseId: courseId });
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) : 0;

    // Return course info with stats
    return NextResponse.json({
      ...course.toObject(),
      averageRating,
      reviewCount,
    }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to fetch course details' }, { status: 500 });
  }
}