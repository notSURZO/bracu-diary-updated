import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';
import Course from '@/lib/models/Course';
import mongoose from 'mongoose';
import { logReviewVoted } from '@/lib/utils/activityLogger';

const validateRequest = (userEmail: string, voteType: string, reviewId: string) => {
  return userEmail && voteType && (voteType === 'agree' || voteType === 'disagree') && mongoose.Types.ObjectId.isValid(reviewId);
};

const handleVoteLogic = (voteType: string, userEmail: string, agreesSet: Set<string>, disagreesSet: Set<string>) => {
  if (voteType === 'agree') {
    if (agreesSet.has(userEmail)) {
      agreesSet.delete(userEmail); // Undo agree
    } else {
      agreesSet.add(userEmail);
      disagreesSet.delete(userEmail); // Ensure user is not in disagrees
    }
  } else if (voteType === 'disagree') {
    if (disagreesSet.has(userEmail)) {
      disagreesSet.delete(userEmail); // Undo disagree
    } else {
      disagreesSet.add(userEmail);
      agreesSet.delete(userEmail); // Ensure user is not in agrees
    }
  }
};

const logVoteActivity = async (userEmail: string, review: any, voteType: string, reviewId: string) => {
  try {
    const user = await User.findOne({ email: userEmail });
    const course = await Course.findById(review.courseId);
    if (user && course) {
      await logReviewVoted(
        user.clerkId,
        course.courseCode,
        voteType,
        reviewId,
        review.reviewText
      );
    }
  } catch (logError) {
    console.error('Failed to log review vote activity:', logError);
  }
};

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  try {
    await connectToDatabase();
    const { reviewId } = await params;
    const { userEmail, voteType } = await request.json();

    if (!validateRequest(userEmail, voteType, reviewId)) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    }

    const agreesSet = new Set(review.agrees);
    const disagreesSet = new Set(review.disagrees);

    handleVoteLogic(voteType, userEmail, agreesSet, disagreesSet);

    review.agrees = Array.from(agreesSet);
    review.disagrees = Array.from(disagreesSet);
    
    await review.save();

    await logVoteActivity(userEmail, review, voteType, reviewId);

    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    console.error('Error in review vote API:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({ message: 'Failed to vote on review' }, { status: 500 });
  }
}