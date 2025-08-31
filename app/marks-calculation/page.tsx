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

export default function MarksCalculationRoot() {
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
          router.push(`/marks-calculation/${validCourses[0]._id}`);
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
            You need to enroll in courses to calculate marks.
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Redirecting to course</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please wait while we redirect you to your course marks calculation...
          </p>
        </div>
      )}
    </div>
  );
}
