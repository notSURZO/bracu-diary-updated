"use client";
import { useEffect, useState } from "react";
import { useUser } from '@clerk/nextjs';

interface Course {
  _id: string;
  name: string;
  faculty: string;
  section: string;
  time: string;
  examDay: string;
}
import Sidebar from "./Sidebar";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course[]>([]);
  const { user, isLoaded } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";
  const [searchTerm, setSearchTerm] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper to sync UI with backend
  const fetchAndSyncCourses = async () => {
    setLoading(true);
    try {
      // Fetch all available courses
      const allCoursesRes = await fetch("/api/courses");
      const allCourses = await allCoursesRes.json();
      // Fetch user's enrolled courses
      const enrolledRes = await fetch(`/api/user-courses?email=${encodeURIComponent(userEmail)}`);
      const enrolledData = await enrolledRes.json();
      const enrolled = Array.isArray(enrolledData.enrolledCourses) ? enrolledData.enrolledCourses : [];
      setSelected(enrolled);
      // Hide all sections of a course if any section is enrolled
      setCourses(allCourses.filter((c: Course) => !enrolled.some((sc: Course) => sc.name === c.name)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !userEmail) return;
    fetchAndSyncCourses();
  }, [isLoaded, userEmail]);

  const handleSelect = (course: Course) => {
    // Prevent enrolling another section of the same course
    if (selected.some((c) => c.name === course.name)) return;
    setSelected([...selected, course]);
    // Hide all sections of this course from available
    setCourses(courses.filter(c => c.name !== course.name));
  };

  const handleRemove = (course: Course) => {
    // Remove from selected
    const newSelected = selected.filter(c => c._id !== course._id);
    setSelected(newSelected);
    // After removal, show all sections of this course in available if not enrolled in any section
    fetch("/api/courses")
      .then(res => res.json())
      .then((allCourses: Course[]) => {
        // Only add back sections if not enrolled in any section of this course
        if (!newSelected.some((c: Course) => c.name === course.name)) {
          setCourses((prev: Course[]) => [
            ...prev,
            ...allCourses.filter((c: Course) => c.name === course.name && !prev.some((pc: Course) => pc._id === c._id))
          ]);
        }
      });
  };

  const handleSave = async () => {
    if (!userEmail) return;
    // Try to update, fallback to create
    const res = await fetch(`/api/user-courses?email=${encodeURIComponent(userEmail)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, selectedCourses: selected }),
    });
    if (!res.ok) {
      // fallback to POST if PUT fails (for first time save)
      await fetch("/api/user-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, selectedCourses: selected }),
      });
    }
    // After saving, sync UI with backend
    await fetchAndSyncCourses();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.section.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 via-violet-100 to-fuchsia-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-2">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 items-center">
          {/* Main Content always rendered for instant responsiveness */}
          <div className={loading ? "pointer-events-none blur-sm select-none relative" : "relative"}>
            {/* Overlay while loading */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-indigo-200 flex flex-col items-center">
                  <span className="text-indigo-500 font-bold text-lg">Loading courses...</span>
                </div>
              </div>
            )}
            {/* Available Courses */}
            <div className="w-full">
              <h2 className="font-extrabold mb-2 text-indigo-800 text-2xl flex items-center gap-2 tracking-tight">
                <span className="inline-block w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></span>
                <span className="drop-shadow">Available Courses</span>
              </h2>
              <input
                type="text"
                placeholder="🔍 Search by course or section..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full mb-4 px-4 py-2 rounded-xl border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-black bg-white shadow-lg"
              />
              <ul className="bg-gradient-to-br from-indigo-200 via-fuchsia-100 to-pink-100 p-4 rounded-2xl w-full max-h-72 overflow-y-auto shadow-xl space-y-4 border border-indigo-100">
                {filteredCourses.length === 0 ? (
                  <li className="text-center text-indigo-400 font-semibold py-2 rounded-lg bg-gradient-to-r from-indigo-100 to-fuchsia-100">
                    No courses available
                  </li>
                ) : (
                  filteredCourses.map(course => (
                    <li key={course._id} className="relative flex items-center gap-4 bg-gradient-to-br from-white via-indigo-50 to-fuchsia-50 rounded-2xl px-6 py-4 font-medium shadow-lg hover:shadow-2xl transition group border border-indigo-100">
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-extrabold text-indigo-700 group-hover:text-fuchsia-700 transition drop-shadow">{course.name}</span>
                          <span className="text-xs font-bold text-white bg-indigo-400 px-2 py-0.5 rounded-full ml-1 shadow">Sec: {course.section}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Faculty: {course.faculty}</span>
                          <span className="text-fuchsia-600 bg-fuchsia-100 px-2 py-0.5 rounded">Time: {course.time}</span>
                          <span className="text-pink-600 bg-pink-100 px-2 py-0.5 rounded">Exam: {course.examDay}</span>
                        </div>
                      </div>
                      <button
                        className="ml-2 px-6 py-2 bg-gradient-to-r from-green-400 to-green-600 rounded-xl text-white font-extrabold text-base shadow-lg hover:scale-110 hover:from-green-500 hover:to-green-700 transition flex items-center gap-2 border-2 border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleSelect(course)}
                        disabled={selected.some(c => c.name === course.name)}
                      >
                        <span className="inline-block align-middle text-lg">➕</span> Add
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
            {/* Enrolled Courses Table */}
            <div className="w-full mt-6">
              <h2 className="font-extrabold mb-2 text-fuchsia-800 text-2xl flex items-center gap-2 tracking-tight">
                <span className="inline-block w-3 h-3 bg-fuchsia-500 rounded-full animate-pulse"></span>
                <span className="drop-shadow">Enrolled Courses</span>
              </h2>
              {selected.length === 0 ? (
                <div className="text-center text-fuchsia-400 font-semibold py-6 rounded-lg bg-gradient-to-r from-fuchsia-100 to-indigo-100 shadow">
                  No courses enrolled yet
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl shadow-2xl border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-100 via-indigo-100 to-pink-100">
                  <table className="min-w-full divide-y divide-fuchsia-200">
                    <thead className="bg-gradient-to-r from-fuchsia-200 via-indigo-100 to-pink-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-extrabold text-fuchsia-700 uppercase tracking-wider">Course</th>
                        <th className="px-4 py-2 text-left text-xs font-extrabold text-fuchsia-700 uppercase tracking-wider">Faculty</th>
                        <th className="px-4 py-2 text-left text-xs font-extrabold text-fuchsia-700 uppercase tracking-wider">Section</th>
                        <th className="px-4 py-2 text-left text-xs font-extrabold text-fuchsia-700 uppercase tracking-wider">Time</th>
                        <th className="px-4 py-2 text-left text-xs font-extrabold text-fuchsia-700 uppercase tracking-wider">Exam</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-gradient-to-br from-white via-fuchsia-50 to-indigo-50 divide-y divide-fuchsia-100">
                      {selected.map(course => (
                        <tr key={course._id} className="hover:bg-fuchsia-100/60 transition">
                          <td className="px-4 py-2 font-bold text-indigo-700">{course.name}</td>
                          <td className="px-4 py-2 text-indigo-600 font-semibold">{course.faculty}</td>
                          <td className="px-4 py-2 text-indigo-600 font-semibold">{course.section}</td>
                          <td className="px-4 py-2 text-indigo-600 font-semibold">{course.time}</td>
                          <td className="px-4 py-2 text-indigo-600 font-semibold">{course.examDay}</td>
                          <td className="px-4 py-2">
                            <button
                              className="px-3 py-1 bg-gradient-to-r from-red-400 to-red-600 rounded-md text-white font-bold hover:scale-110 hover:from-red-500 hover:to-red-700 transition shadow flex items-center gap-1"
                              onClick={() => handleRemove(course)}
                            >
                              <span className="inline-block align-middle">🗑️</span>Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {/* Centered Save Button under cards */}
            <div className="w-full flex justify-center mt-10">
              <button
                className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg font-extrabold shadow-lg hover:scale-105 transition text-lg tracking-wide"
                onClick={handleSave}
              >
                <span className="inline-block align-middle mr-2">💾</span>Save My Courses
              </button>
            </div>
            {/* Success message */}
            {success && (
              <div className="mt-6 px-6 py-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center font-semibold shadow animate-bounce">
                Courses saved successfully!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}