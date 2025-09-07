import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import Course from '@/lib/models/Course';
import User from '@/lib/models/User';
import mongoose from 'mongoose';
import { logReviewPosted } from '@/lib/utils/activityLogger';

// GET all reviews for a specific course
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const sortBy = searchParams.get('sortBy') || 'newest'; // Default to newest

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json({ message: 'Invalid Course ID' }, { status: 400 });
    }

    let sortOptions: any = { createdAt: -1 }; // Default: newest

    switch (sortBy) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'mostAgreed':
        // The aggregation pipeline is more suitable for sorting by array length
        break;
      case 'mostDisagreed':
        // The aggregation pipeline is more suitable for sorting by array length
        break;
    }

    if (sortBy === 'mostAgreed' || sortBy === 'mostDisagreed') {
        const reviews = await Review.aggregate([
            { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
            {
                $addFields: {
                    agreesCount: { $size: "$agrees" },
                    disagreesCount: { $size: "$disagrees" }
                }
            },
            { $sort: sortBy === 'mostAgreed' ? { agreesCount: -1 } : { disagreesCount: -1 } }
        ]);
        return NextResponse.json(reviews, { status: 200 });
    } else {
        const reviews = await Review.find({ courseId }).sort(sortOptions);
        return NextResponse.json(reviews, { status: 200 });
    }
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

    // Get course information for activity logging
    const course = await Course.findById(courseId);
    if (course) {
      // Find user by email to get clerkId
      const user = await User.findOne({ email: userEmail });
      if (user) {
        await logReviewPosted(
          user.clerkId,
          course.courseCode,
          rating,
          reviewText,
          newReview._id.toString()
        );
      }
    }

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to create review' }, { status: 500 });
  }
}