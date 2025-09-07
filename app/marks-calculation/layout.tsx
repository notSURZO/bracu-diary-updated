'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface Course {
  _id: string;
  courseCode: string;
  originalCourseId?: string;
}

export default function MarksCalculationLayout({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const courseIdFromPath = pathname.split('/')[2];

  useEffect(() => {
    const fetchUserCourses = async () => {
      if (!user) return;
      try {
        // This API should return the courses the user is enrolled in
        const response = await fetch(`/api/user-courses?email=${user.emailAddresses[0].emailAddress}`);
        const data = await response.json();
        const mainCourses = data.enrolledCourses?.filter((c: any) => !c.courseCode.endsWith('L')) || [];
        setCourses(mainCourses);
        if (!courseIdFromPath && mainCourses.length > 0) {
          router.replace(`/marks-calculation/${mainCourses[0].originalCourseId || mainCourses[0]._id}`);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserCourses();
  }, [user, courseIdFromPath, router]);

  if (loading) {
    return <div className="text-center p-10">Loading Your Courses...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Marks Calculation</h1>
      
      {courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">You are not enrolled in any courses.</p>
        </div>
      ) : (
        <>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Courses">
              {courses.map((course) => (
                <Link
                  key={course._id}
                  href={`/marks-calculation/${course.originalCourseId || course._id}`}
                  className={`shrink-0 py-4 px-3 border-b-2 font-medium text-sm ${
                    courseIdFromPath === (course.originalCourseId || course._id)
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {course.courseCode}
                </Link>
              ))}
            </nav>
          </div>
          <main className="mt-6">{children}</main>
        </>
      )}
    </div>
  );
}