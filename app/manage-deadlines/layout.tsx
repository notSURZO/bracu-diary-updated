'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
  section: string;
  faculty: string;
  details: string;
  day: string[];
  startTime: string;
  endTime: string;
  examDay?: string;
  hasLab: boolean;
  link: string;
}

export default function ManageDeadlinesLayout({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user?.emailAddresses?.[0]?.emailAddress) {
      fetchUserCourses();
    }
  }, [user]);

  useEffect(() => {
    const pathParts = pathname.split('/');
    const courseIdFromPath = pathParts[pathParts.length - 1];
    if (courseIdFromPath && courseIdFromPath !== 'manage-deadlines') {
      setSelectedCourse(courseIdFromPath);
    }
  }, [pathname]);

  const fetchUserCourses = async () => {
    try {
      const response = await fetch(`/api/user-courses?email=${user?.emailAddresses?.[0]?.emailAddress}`);
      const data = await response.json();
      
      if (data.enrolledCourses && data.enrolledCourses.length > 0) {
        const validCourses = data.enrolledCourses.filter((course: Course) => 
          !course.courseCode.endsWith('L')
        );
        setCourses(validCourses);
        
        if (!selectedCourse && validCourses.length > 0) {
          handleCourseSelect(validCourses[0]._id);
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

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourse(courseId);
    // No longer redirecting to course-specific page
    // The root page now handles all course content
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Deadlines</h1>
        
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No enrolled courses found.</p>
            <button 
              onClick={() => router.push('/enroll')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Enroll in Courses
            </button>
          </div>
        ) : (
          <>
            {/* The course navigation is now wrapped in a div with overflow-x-auto */}
            <div className="border-b border-gray-200 overflow-x-auto">
              <nav className="-mb-px flex space-x-8" aria-label="Courses">
                {courses.map((course) => (
                  <button
                    key={course._id}
                    onClick={() => handleCourseSelect(course._id)}
                    className={`whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm ${
                      selectedCourse === course._id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {course.courseCode} - {course.courseName}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* The main content now has a top margin for padding */}
            <main className="mt-6">
              {children}
            </main>
          </>
        )}
      </div>
    </div>
  );
}