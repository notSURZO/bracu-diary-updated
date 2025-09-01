import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import mongoose from 'mongoose';

export async function POST(request: Request, { params }: { params: { reviewId: string } }) {
  try {
    await connectToDatabase();
    const { reviewId } = await params;
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

    review.agrees = Array.from(agreesSet);
    review.disagrees = Array.from(disagreesSet);
    
    await review.save();

    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to vote on review' }, { status: 500 });
  }
}