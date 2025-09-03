"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { FaStar, FaSortAmountUp, FaSortAmountDown, FaUsers } from "react-icons/fa";

type Course = {
  _id: string;
  courseCode: string;
  courseName: string;
  averageRating?: number;
  reviewCount?: number;
};

export default function CoursesListPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("highest"); // Default sort highest rated
  const router = useRouter();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/courses-surzo");
        const data = await res.json();
        // For each course, fetch its reviews summary
        const coursesWithStats = await Promise.all(
          data.map(async (course: Course) => {
            try {
              const statsRes = await fetch(`/api/courses-raiyan/${course._id}`);
              if (!statsRes.ok) return { ...course, averageRating: 0, reviewCount: 0 };
              const stats = await statsRes.json();
              return {
                ...course,
                averageRating: stats.averageRating ?? 0,
                reviewCount: stats.reviewCount ?? 0,
              };
            } catch {
              return { ...course, averageRating: 0, reviewCount: 0 };
            }
          })
        );
        setCourses(coursesWithStats);
      } catch (error) {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  // Filter courses by search
  let filteredCourses = courses.filter(course =>
    course.courseCode.toLowerCase().includes(search.toLowerCase()) ||
    course.courseName.toLowerCase().includes(search.toLowerCase())
  );

  // Sorting/filtering
  if (filter === "highest") {
    filteredCourses = [...filteredCourses].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
  } else if (filter === "lowest") {
    filteredCourses = [...filteredCourses].sort((a, b) => (a.averageRating ?? 0) - (b.averageRating ?? 0));
  } else if (filter === "most") {
    filteredCourses = [...filteredCourses].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  } else if (filter === "least") {
    filteredCourses = [...filteredCourses].sort((a, b) => (a.reviewCount ?? 0) - (b.reviewCount ?? 0));
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 text-gray-800 font-sans">
      <Sidebar />
      <main className="flex-1 w-full">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl border border-gray-100">
          <h1 className="font-bold text-blue-800 text-2xl sm:text-3xl md:text-4xl mb-4 sm:mb-6 flex items-center gap-2">
            <FaStar className="text-yellow-400" /> Select a Course for Review
          </h1>
          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses by code or name..."
              className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <div className="flex flex-nowrap gap-2 items-center px-1">
                <button
                  className={`px-3 py-2 sm:px-3 sm:py-2 text-sm sm:text-base rounded-lg font-bold shadow-md border flex items-center gap-1 ${filter === "highest" ? "bg-indigo-600 text-white" : "bg-gray-100 text-blue-800"}`}
                  onClick={() => setFilter(filter === "highest" ? "" : "highest")}
                  title="Highest Rated"
                >
                  <FaSortAmountUp /> <span className="hidden sm:inline">Highest Rated</span><span className="sm:hidden">Top</span>
                </button>
                <button
                  className={`px-3 py-2 sm:px-3 sm:py-2 text-sm sm:text-base rounded-lg font-bold shadow-md border flex items-center gap-1 ${filter === "lowest" ? "bg-indigo-600 text-white" : "bg-gray-100 text-blue-800"}`}
                  onClick={() => setFilter(filter === "lowest" ? "" : "lowest")}
                  title="Lowest Rated"
                >
                  <FaSortAmountDown /> <span className="hidden sm:inline">Lowest Rated</span><span className="sm:hidden">Low</span>
                </button>
                <button
                  className={`px-3 py-2 sm:px-3 sm:py-2 text-sm sm:text-base rounded-lg font-bold shadow-md border flex items-center gap-1 ${filter === "most" ? "bg-indigo-600 text-white" : "bg-gray-100 text-blue-800"}`}
                  onClick={() => setFilter(filter === "most" ? "" : "most")}
                  title="Most Reviewed"
                >
                  <FaUsers /> <span className="hidden sm:inline">Most Reviewed</span><span className="sm:hidden">Most</span>
                </button>
                <button
                  className={`px-3 py-2 sm:px-3 sm:py-2 text-sm sm:text-base rounded-lg font-bold shadow-md border flex items-center gap-1 ${filter === "least" ? "bg-indigo-600 text-white" : "bg-gray-100 text-blue-800"}`}
                  onClick={() => setFilter(filter === "least" ? "" : "least")}
                  title="Least Reviewed"
                >
                  <FaUsers /> <span className="hidden sm:inline">Least Reviewed</span><span className="sm:hidden">Least</span>
                </button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-blue-500 font-semibold">Loading courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-gray-500 font-semibold">No courses found.</div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourses.map(course => (
                <li key={course._id} className="bg-blue-50 p-4 sm:p-6 rounded-2xl shadow-inner border border-blue-200 flex flex-col">
                  <span className="font-bold text-lg sm:text-xl text-blue-800 mb-2">{course.courseCode}: {course.courseName}</span>
                  <div className="flex items-center gap-3 sm:gap-4 mb-2 text-sm sm:text-base">
                    <span className="flex items-center gap-1 text-yellow-600 font-semibold">
                      <FaStar /> {course.averageRating?.toFixed(2) ?? "N/A"}
                    </span>
                    <span className="flex items-center gap-1 text-blue-700 font-semibold">
                      <FaUsers /> {course.reviewCount ?? 0} reviews
                    </span>
                  </div>
                  <button
                    onClick={() => router.push(`/courses/${course._id}/reviews`)}
                    className="mt-3 sm:mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all duration-300"
                  >
                    View Reviews
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
