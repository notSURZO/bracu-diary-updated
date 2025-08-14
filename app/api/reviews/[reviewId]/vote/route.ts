// app/api/reviews/[reviewId]/vote/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import mongoose from 'mongoose';

export async function POST(request: Request, { params }: { params: { reviewId: string } }) {
  try {
    await connectToDatabase();
    const { reviewId } = params;
    const { userEmail, voteType } = await request.json();

    if (!userEmail || !voteType || (voteType !== 'agree' && voteType !== 'disagree') || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    }

    const agreesSet = new Set(review.agrees);
    const disagreesSet = new Set(review.disagrees);

    // Remove user's previous vote if any
    agreesSet.delete(userEmail);
    disagreesSet.delete(userEmail);

    // Add new vote
    if (voteType === 'agree') {
      agreesSet.add(userEmail);
    } else {
      disagreesSet.add(userEmail);
    }

    review.agrees = Array.from(agreesSet);
    review.disagrees = Array.from(disagreesSet);
    
    await review.save();

    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to vote on review' }, { status: 500 });
  }
}