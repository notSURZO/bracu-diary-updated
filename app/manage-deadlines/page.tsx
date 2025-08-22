'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
  sections: Array<{
    section: string;
    theory: any;
    lab?: any;
  }>;
}

export default function ManageDeadlinesRoot() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user?.emailAddresses?.[0]?.emailAddress) {
      fetchUserCourses();
    }
  }, [user]);

  const fetchUserCourses = async () => {
    try {
      const response = await fetch(`/api/user-courses?email=${user?.emailAddresses?.[0]?.emailAddress}`);
      const data = await response.json();
      
      if (data.enrolledCourses && data.enrolledCourses.length > 0) {
        const validCourses = data.enrolledCourses.filter((course: any) => 
          !course.courseCode.endsWith('L')
        );
        setCourses(validCourses);
        
        // Redirect to the first course instead of setting it locally
        if (validCourses.length > 0) {
          router.push(`/manage-deadlines/${validCourses[0]._id}`);
        }
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching user courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No enrolled courses</h3>
          <p className="mt-1 text-sm text-gray-500">
            You need to enroll in courses to manage deadlines.
          </p>
          <button 
            onClick={() => router.push('/enroll')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Enroll in Courses
          </button>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477 4.5 1.253"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Redirecting to course</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please wait while we redirect you to your course deadlines...
          </p>
        </div>
      )}
    </div>
  );
}
