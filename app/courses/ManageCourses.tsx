"use client";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState([]);
  const [userEmail, setUserEmail] = useState(""); // Set this from auth
  const [searchTerm, setSearchTerm] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/courses")
      .then(res => res.json())
      .then(data => setCourses(data));
    // TODO: Set userEmail from auth context
  }, []);

  const handleSelect = (course) => {
    setSelected([...selected, course]);
    setCourses(courses.filter(c => c._id !== course._id));
  };

  const handleRemove = (course) => {
    setCourses([...courses, course]);
    setSelected(selected.filter(c => c._id !== course._id));
  };

  const handleSave = async () => {
    await fetch("/api/user-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, selectedCourses: selected }),
    });
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
      <div className="flex-1 flex flex-col items-center py-12 px-2 md:px-12">
        <div className="flex flex-col md:flex-row gap-12 w-full max-w-4xl justify-center">
          {/* Available Courses */}
          <div className="w-full md:w-1/2">
            <h2 className="font-semibold mb-2 text-indigo-700 text-xl flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full"></span>
              Available Courses
            </h2>
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full mb-4 px-4 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-black bg-white shadow"
            />
            <ul className="bg-white/90 p-4 rounded-xl w-full max-h-80 overflow-y-auto shadow space-y-3">
              {filteredCourses.length === 0 ? (
                <li className="text-center text-indigo-400 font-semibold py-2 rounded-lg bg-gradient-to-r from-indigo-100 to-fuchsia-100">
                  No courses available
                </li>
              ) : (
                filteredCourses.map(course => (
                  <li key={course._id} className="flex justify-between items-center bg-gradient-to-r from-indigo-50 to-fuchsia-50 rounded-lg px-4 py-2 font-medium shadow-sm hover:shadow-md transition">
                    <span className="truncate">{course.name} ({course.section})</span>
                    <button
                      className="ml-2 px-4 py-1 bg-green-500 rounded-md text-white font-bold hover:bg-green-600 transition"
                      onClick={() => handleSelect(course)}
                    >Add</button>
                  </li>
                ))
              )}
            </ul>
          </div>
          {/* Selected Courses */}
          <div className="w-full md:w-1/2">
            <h2 className="font-semibold mb-2 text-fuchsia-700 text-xl flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-fuchsia-400 rounded-full"></span>
              Selected Courses
            </h2>
            <ul className="bg-white/90 p-4 rounded-xl w-full max-h-80 overflow-y-auto shadow space-y-3">
              {selected.length === 0 ? (
                <li className="text-center text-fuchsia-400 font-semibold py-2 rounded-lg bg-gradient-to-r from-fuchsia-100 to-indigo-100">
                  No courses selected
                </li>
              ) : (
                selected.map(course => (
                  <li key={course._id} className="flex justify-between items-center bg-gradient-to-r from-fuchsia-50 to-indigo-50 rounded-lg px-4 py-2 font-medium shadow-sm hover:shadow-md transition">
                    <span className="truncate">{course.name} ({course.section})</span>
                    <button
                      className="ml-2 px-4 py-1 bg-red-500 rounded-md text-white font-bold hover:bg-red-600 transition"
                      onClick={() => handleRemove(course)}
                    >Remove</button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        {/* Centered Save Button under cards */}
        <div className="w-full flex justify-center mt-10">
          <button
            className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg font-bold shadow-lg hover:scale-105 transition"
            onClick={handleSave}
          >
            Save My Courses
          </button>
        </div>
        {/* Success message */}
        {success && (
          <div className="mt-6 px-6 py-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center font-semibold shadow">
            Courses saved successfully
          </div>
        )}
      </div>
    </div>
  );
}