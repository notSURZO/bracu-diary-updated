// app/courses/[courseid]/reviews/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useUser } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';

// Define interfaces for review and user data
interface IReview {
  _id: string;
  courseId: string; // Updated to courseId
  userEmail: string;
  rating: number;
  reviewText: string;
  agrees: string[];
  disagrees: string[];
  createdAt: string;
}

interface UserProfile {
  name: string;
  picture_url: string;
}

interface Course {
  courseCode: string;
  courseName: string;
}

// A simple component to display the star rating
const StarRating = ({ rating }: { rating: number }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <svg
        key={i}
        className={`w-5 h-5 ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.396 4.298a1 1 0 00.95.69h4.537c.969 0 1.371 1.24.588 1.81l-3.665 2.662a1 1 0 00-.364 1.118l1.396 4.298c.3.921-.755 1.688-1.54 1.118l-3.665-2.662a1 1 0 00-1.176 0l-3.665 2.662c-.785.57-1.84-.197-1.54-1.118l1.396-4.298a1 1 0 00-.364-1.118L2.06 9.725c-.783-.57-.38-1.81.588-1.81h4.537a1 1 0 00.95-.69l1.396-4.298z" />
      </svg>
    );
  }
  return <div className="flex">{stars}</div>;
};

// Component for the review form
const ReviewForm = ({ courseId, onReviewPosted }: { courseId: string, onReviewPosted: () => void }) => {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !reviewText) {
      setError("Please provide both a rating and a review.");
      return;
    }
    if (!userEmail) {
      setError("You must be logged in to post a review.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId, // Use courseId
          userEmail,
          rating,
          reviewText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to post review.");
      }

      setSuccess("Review submitted successfully!");
      setRating(0);
      setReviewText("");
      onReviewPosted(); // Refresh reviews list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-inner border border-gray-200">
      <h3 className="text-xl font-bold text-blue-700 mb-4">Write a Review</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-1">Rating</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`cursor-pointer text-3xl transition-colors duration-200 ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="reviewText" className="block text-gray-700 font-semibold mb-1">Your Review</label>
          <textarea
            id="reviewText"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            rows={4}
            placeholder="Share your thoughts on this course..."
            maxLength={500}
          />
        </div>
        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        {success && <p className="text-green-500 text-sm font-medium">{success}</p>}
        <button
          type="submit"
          className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
          disabled={isSubmitting || !rating || !reviewText || !userEmail}
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
};

const ReviewItem = ({ review, userEmail, onVote }: { review: IReview, userEmail: string, onVote: (reviewId: string, voteType: 'agree' | 'disagree') => void }) => {
  const [reviewer, setReviewer] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchReviewer = async () => {
      try {
        const res = await fetch(`/api/profile/user?email=${review.userEmail}`);
        const data = await res.json();
        setReviewer(data.user);
      } catch (error) {
        console.error("Failed to fetch reviewer details", error);
      }
    };
    fetchReviewer();
  }, [review.userEmail]);

  const handleVote = (voteType: 'agree' | 'disagree') => {
    if (!userEmail) {
      alert("Please log in to vote.");
      return;
    }
    onVote(review._id, voteType);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
      <div className="flex items-center gap-4 mb-4">
        <img
          src={reviewer?.picture_url || '/default-avatar.png'}
          alt={reviewer?.name || "User"}
          className="w-12 h-12 rounded-full border-2 border-blue-400 object-cover"
        />
        <div>
          <p className="font-bold text-gray-800">{reviewer?.name || "Anonymous User"}</p>
          <p className="text-sm text-gray-500">
            {new Date(review.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="mb-4">
        <StarRating rating={review.rating} />
      </div>
      <p className="text-gray-700 leading-relaxed">{review.reviewText}</p>
      <div className="mt-4 flex items-center gap-4 text-sm font-semibold">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVote('agree')}
            className={`px-4 py-1 rounded-full transition-colors ${
              review.agrees.includes(userEmail)
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-green-100'
            }`}
          >
            Agree ({review.agrees.length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVote('disagree')}
            className={`px-4 py-1 rounded-full transition-colors ${
              review.disagrees.includes(userEmail)
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-red-100'
            }`}
          >
            Disagree ({review.disagrees.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CourseReviewsPage() {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";
  const params = useParams();
  const courseId = params.courseid as string; // This is the course ObjectId
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [courseDetails, setCourseDetails] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCourseAndReviews = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      // Fetch course details to get the courseCode and name for the heading
      const courseRes = await fetch(`/api/courses/${courseId}`);
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourseDetails(courseData);
      }

      // Fetch reviews for the course using courseId
      const reviewsRes = await fetch(`/api/reviews?courseId=${courseId}`);
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData);
      }
    } catch (error) {
      console.error("Failed to fetch reviews or course details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (reviewId: string, voteType: 'agree' | 'disagree') => {
    if (!userEmail) {
      alert("Please log in to vote.");
      return;
    }

    try {
      await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, voteType }),
      });
      fetchCourseAndReviews(); // Re-fetch reviews to update vote counts
    } catch (error) {
      console.error("Failed to submit vote", error);
    }
  };

  useEffect(() => {
    fetchCourseAndReviews();
  }, [courseId]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 text-gray-800 font-sans">
      <Sidebar />
      <main className="flex-1 p-6 md:p-12">
        <h1 className="font-bold text-blue-800 text-3xl md:text-4xl mb-6 border-b-4 border-blue-300 pb-3">
          Reviews for {courseDetails ? `${courseDetails.courseCode} - ${courseDetails.courseName}` : 'Course Reviews'}
        </h1>
        
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-blue-500 font-semibold">Loading reviews...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {reviews.length > 0 ? (
              reviews.map(review => (
                <ReviewItem key={review._id} review={review} userEmail={userEmail} onVote={handleVote} />
              ))
            ) : (
              <p className="text-center text-gray-500 col-span-2">No reviews for this course yet.</p>
            )}
          </div>
        )}

        {/* This check ensures the review form is only shown if course details are available */}
        {courseDetails && (
          <ReviewForm courseId={courseId} onReviewPosted={fetchCourseAndReviews} />
        )}
      </main>
    </div>
  );
}