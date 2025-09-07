import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import mongoose from 'mongoose';

export async function DELETE(request: Request, { params }: { params: { reviewId: string } }) {
  try {
    await connectToDatabase();
    const { reviewId } = await params;
    const { userEmail } = await request.json(); // Get userEmail for verification

    if (!userEmail || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    }

    // ensure the user requesting deletion is the author of the review
    if (review.userEmail !== userEmail) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await Review.findByIdAndDelete(reviewId);

    return NextResponse.json({ message: 'Review deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete review:', error);
    return NextResponse.json({ message: 'Failed to delete review' }, { status: 500 });
  }
}