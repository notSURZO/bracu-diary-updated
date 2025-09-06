"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { FaStar, FaSortAmountUp, FaSortAmountDown, FaUsers, FaSearch, FaGraduationCap } from "react-icons/fa";

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
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-brac-navy font-sans">
      <Sidebar />
      <main className="flex-1 w-full p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <FaGraduationCap className="text-brac-blue text-2xl" />
              <h1 className="text-2xl font-bold text-brac-navy">Course Catalog</h1>
            </div>
            <p className="text-brac-blue">Browse and review courses offered at BRAC University</p>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search courses by code or name..."
                  className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brac-blue focus:border-brac-blue"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-brac-navy self-center">Sort by:</span>
                <button
                  className={`px-3 py-2 text-sm rounded-md font-medium flex items-center gap-1 ${filter === "highest" ? "bg-brac-blue text-white" : "bg-gray-100 text-brac-navy hover:bg-gray-200"}`}
                  onClick={() => setFilter(filter === "highest" ? "" : "highest")}
                  title="Highest Rated"
                >
                  <FaSortAmountUp /> <span>Highest Rated</span>
                </button>
                <button
                  className={`px-3 py-2 text-sm rounded-md font-medium flex items-center gap-1 ${filter === "lowest" ? "bg-brac-blue text-white" : "bg-gray-100 text-brac-navy hover:bg-gray-200"}`}
                  onClick={() => setFilter(filter === "lowest" ? "" : "lowest")}
                  title="Lowest Rated"
                >
                  <FaSortAmountDown /> <span>Lowest Rated</span>
                </button>
                <button
                  className={`px-3 py-2 text-sm rounded-md font-medium flex items-center gap-1 ${filter === "most" ? "bg-brac-blue text-white" : "bg-gray-100 text-brac-navy hover:bg-gray-200"}`}
                  onClick={() => setFilter(filter === "most" ? "" : "most")}
                  title="Most Reviewed"
                >
                  <FaUsers /> <span>Most Reviews</span>
                </button>
                <button
                  className={`px-3 py-2 text-sm rounded-md font-medium flex items-center gap-1 ${filter === "least" ? "bg-brac-blue text-white" : "bg-gray-100 text-brac-navy hover:bg-gray-200"}`}
                  onClick={() => setFilter(filter === "least" ? "" : "least")}
                  title="Least Reviewed"
                >
                  <FaUsers /> <span>Least Reviews</span>
                </button>
              </div>
            </div>
          </div>

          {/* Courses List */}
          {loading ? (
            <div className="flex justify-center items-center p-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brac-blue"></div>
              <span className="ml-3 text-brac-navy">Loading courses...</span>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <p className="text-brac-navy font-medium">No courses found.</p>
              {search && <p className="text-brac-blue mt-2">Try adjusting your search terms</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourses.map(course => (
                <div key={course._id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex flex-col h-full">
                    <h3 className="font-bold text-lg text-brac-navy mb-2">{course.courseCode}</h3>
                    <p className="text-brac-navy/80 mb-4 flex-grow">{course.courseName}</p>
                    
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-1 text-brac-gold font-medium">
                        <FaStar /> 
                        <span>{course.averageRating?.toFixed(1) || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-brac-blue font-medium">
                        <FaUsers /> 
                        <span>{course.reviewCount || 0} reviews</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => router.push(`/courses/${course._id}/reviews`)}
                      className="w-full py-2 bg-brac-blue text-white rounded-md font-medium hover:bg-brac-blue-dark transition-colors"
                    >
                      View Reviews
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}