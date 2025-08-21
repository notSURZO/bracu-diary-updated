// app/courses/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";

interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
}

export default function CoursesListPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/courses");
        const data = await res.json();
        setCourses(data);
      } catch (error) {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Filter courses by search
  const filteredCourses = courses.filter(course =>
    course.courseCode.toLowerCase().includes(search.toLowerCase()) ||
    course.courseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 text-gray-800 font-sans">
      <Sidebar />
      <main className="flex-1 p-6 md:p-12">
        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
          <h1 className="font-bold text-blue-800 text-3xl md:text-4xl mb-6">Select a Course</h1>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search courses by code or name..."
            className="mb-6 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {loading ? (
            <div className="text-blue-500 font-semibold">Loading courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-gray-500 font-semibold">No courses found.</div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourses.map(course => (
                <li key={course._id} className="bg-blue-50 p-6 rounded-2xl shadow-inner border border-blue-200 flex flex-col">
                  <span className="font-bold text-xl text-blue-800 mb-2">{course.courseCode}: {course.courseName}</span>
                  <button
                    onClick={() => router.push(`/courses/${course._id}/reviews`)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all duration-300"
                  >
                    View Reviews
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
