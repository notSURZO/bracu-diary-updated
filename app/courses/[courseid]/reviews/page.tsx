"use client";
import { useEffect, useState, useCallback } from "react";
import { useUser } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
// Import new icons for the filter buttons
import { FaTrash, FaThumbsUp, FaThumbsDown, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import debounce from 'lodash/debounce';


interface IReview {
  _id: string;
  courseId: string;
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

const ReviewForm = ({ courseId, onReviewPosted }: { courseId: string, onReviewPosted: () => void }) => {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !reviewText) {
      toast.error("Please provide both a rating and a review.");
      return;
    }
    if (!userEmail) {
      toast.error("You must be logged in to post a review.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting your review...");

    try {
      const response = await fetch(`/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          userEmail,
          rating,
          reviewText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to post review.");
      }

      toast.update(toastId, { render: "Review submitted successfully!", type: "success", isLoading: false, autoClose: 5000 });
      setRating(0);
      setReviewText("");
      onReviewPosted();
    } catch (err: any) {
      toast.update(toastId, { render: err.message, type: "error", isLoading: false, autoClose: 5000 });
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


const ReviewItem = ({ review, userEmail, onVote, onDelete }: { review: IReview, userEmail: string, onVote: (reviewId: string, voteType: 'agree' | 'disagree') => void, onDelete: (reviewId: string) => void }) => {
  const [reviewer, setReviewer] = useState<UserProfile | null>(null);
  const isOwner = userEmail === review.userEmail;

  useEffect(() => {
    const fetchReviewer = async () => {
      try {
        const res = await fetch(`/api/profile/user?email=${review.userEmail}`);
        if(res.ok) {
            const data = await res.json();
            setReviewer(data.user);
        }
      } catch (error) {
        console.error("Failed to fetch reviewer details", error);
      }
    };
    fetchReviewer();
  }, [review.userEmail]);

  const handleVote = (voteType: 'agree' | 'disagree') => {
    if (!userEmail) {
      toast.warn("Please log in to vote.");
      return;
    }
    onVote(review._id, voteType);
  };

  const handleDeleteClick = () => {
    if (window.confirm("Are you sure you want to delete your review?")) {
        onDelete(review._id);
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 relative">
       {isOwner && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Delete review"
        >
          <FaTrash size={18} />
        </button>
      )}
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
      <p className="text-gray-700 leading-relaxed break-words">{review.reviewText}</p>
      <div className="mt-4 flex items-center gap-4 text-sm font-semibold">
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
  );
};


export default function CourseReviewsPage() {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";
  const params = useParams();
  const courseId = params.courseid as string;
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [courseDetails, setCourseDetails] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  // Define the sort options with icons
  const sortOptions = [
    { key: 'newest', label: 'Newest', icon: <FaSortAmountDown /> },
    { key: 'oldest', label: 'Oldest', icon: <FaSortAmountUp /> },
    { key: 'mostAgreed', label: 'Most Agreed', icon: <FaThumbsUp /> },
    { key: 'mostDisagreed', label: 'Most Disagreed', icon: <FaThumbsDown /> }
  ];

  const fetchCourseAndReviews = useCallback(async (currentSortBy: string) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const courseRes = await fetch(`/api/courses/${courseId}`);
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourseDetails(courseData);
      }

      const reviewsRes = await fetch(`/api/reviews?courseId=${courseId}&sortBy=${currentSortBy}`);
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData);
      }
    } catch (error) {
      console.error("Failed to fetch reviews or course details:", error);
      toast.error("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const debouncedFetch = useCallback(debounce(fetchCourseAndReviews, 300), [fetchCourseAndReviews]);

  useEffect(() => {
    debouncedFetch(sortBy);
  }, [sortBy, debouncedFetch]);

  const handleVote = async (reviewId: string, voteType: 'agree' | 'disagree') => {
    if (!userEmail) {
      toast.warn("Please log in to vote.");
      return;
    }

    const originalReviews = [...reviews];
    const updatedReviews = reviews.map(review => {
        if (review._id === reviewId) {
            const newAgrees = new Set(review.agrees);
            const newDisagrees = new Set(review.disagrees);

            if (voteType === 'agree') {
                if (newAgrees.has(userEmail)) newAgrees.delete(userEmail);
                else {
                    newAgrees.add(userEmail);
                    newDisagrees.delete(userEmail);
                }
            } else {
                if (newDisagrees.has(userEmail)) newDisagrees.delete(userEmail);
                else {
                    newDisagrees.add(userEmail);
                    newAgrees.delete(userEmail);
                }
            }
            return { ...review, agrees: Array.from(newAgrees), disagrees: Array.from(newDisagrees) };
        }
        return review;
    });
    setReviews(updatedReviews);

    try {
      const response = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, voteType }),
      });
      if (!response.ok) throw new Error("Vote failed to save.");
    } catch (error) {
      console.error("Failed to submit vote", error);
      toast.error("Your vote could not be saved. Please try again.");
      setReviews(originalReviews); // Revert on failure
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!userEmail) {
      toast.error("You must be logged in to delete a review.");
      return;
    }

    const toastId = toast.loading("Deleting your review...");

    try {
        const response = await fetch(`/api/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail }), // Send userEmail for verification
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to delete review.");
        }

        toast.update(toastId, { render: "Review deleted!", type: "success", isLoading: false, autoClose: 5000 });
        setReviews(prevReviews => prevReviews.filter(review => review._id !== reviewId));

    } catch (error: any) {
        console.error("Failed to delete review", error);
        toast.update(toastId, { render: error.message, type: "error", isLoading: false, autoClose: 5000 });
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 text-gray-800 font-sans">
      <Sidebar />
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
      <main className="flex-1 p-6 md:p-12">
        {/* === UI UPDATE STARTS HERE === */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6 border-b-4 border-blue-300 pb-3">
            <h1 className="font-bold text-blue-800 text-3xl md:text-4xl">
              {courseDetails ? `${courseDetails.courseCode} - ${courseDetails.courseName}` : 'Course Reviews'}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSortBy(option.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full border transition-all duration-200 ${
                    sortBy === option.key
                      ? 'bg-blue-600 text-white border-blue-600 shadow'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
        </div>
        {/* === UI UPDATE ENDS HERE === */}
        
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-blue-500 font-semibold">Loading reviews...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {reviews.length > 0 ? (
              reviews.map(review => (
                <ReviewItem key={review._id} review={review} userEmail={userEmail} onVote={handleVote} onDelete={handleDelete} />
              ))
            ) : (
              <p className="text-center text-gray-500 col-span-2">No reviews for this course yet.</p>
            )}
          </div>
        )}

        {courseDetails && (
          <ReviewForm courseId={courseId} onReviewPosted={() => fetchCourseAndReviews(sortBy)} />
        )}
      </main>
    </div>
  );
}