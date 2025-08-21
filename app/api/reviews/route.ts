// app/api/reviews/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import mongoose from 'mongoose';

// GET all reviews for a specific course
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ message: 'Invalid Course ID' }, { status: 400 });
    }

    const reviews = await Review.find({ courseId }).sort({ createdAt: -1 });

    return NextResponse.json(reviews, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST a new review for a course
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { courseId, userEmail, rating, reviewText } = await request.json();

    if (!courseId || !userEmail || !rating || !reviewText || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 });
    }

    // Check if the user has already reviewed this course
    const existingReview = await Review.findOne({ courseId, userEmail });
    if (existingReview) {
      return NextResponse.json({ message: 'User has already reviewed this course' }, { status: 409 });
    }

    const newReview = new Review({
      courseId,
      userEmail,
      rating,
      reviewText,
    });

    await newReview.save();
    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to create review' }, { status: 500 });
  }
}