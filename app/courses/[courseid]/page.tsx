// app/courses/[courseid]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";

// Interface Definitions for course data
interface ClassDetails {
  faculty: string;
  details: string;
  day: string[];
  startTime: string;
  endTime: string;
}

interface Section {
  section: string;
  theory: ClassDetails;
  lab?: ClassDetails;
}

interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
  link: string;
  examDay?: string;
  sections: Section[];
}

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseid as string; // This is the course ObjectId
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourseDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/courses-dewan/${courseId}`);
        
        if (!res.ok) {
          throw new Error("Course not found or an error occurred.");
        }
        
        const data = await res.json();
        setCourse(data);
      } catch (error) {
        console.error("Failed to fetch course details:", error);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 rounded-2xl shadow-lg">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-blue-500 font-semibold">Loading course details...</span>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 text-center text-gray-500 font-semibold p-12 bg-gray-50 rounded-2xl shadow-lg">
        Course not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 text-gray-800 font-sans">
      <Sidebar />
      <main className="flex-1 p-6 md:p-12">
        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
          <h1 className="font-bold text-blue-800 text-3xl md:text-4xl mb-2">
            {course.courseCode}: {course.courseName}
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            <span className="font-semibold">Exam Day:</span> {course.examDay || "Not specified"}
          </p>

          <button
            onClick={() => router.push(`/courses/${course._id}/reviews`)}
            className="mb-8 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all duration-300"
          >
            View Reviews
          </button>

          <h2 className="font-bold text-blue-700 text-2xl mb-4 border-b-2 border-blue-300 pb-2">
            Available Sections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {course.sections.map((section, index) => (
              <div key={index} className="bg-blue-50 p-6 rounded-2xl shadow-inner border border-blue-200">
                <h3 className="font-bold text-xl text-blue-800 mb-2">Section: {section.section}</h3>
                
                {/* Theory Details */}
                <div className="mb-4">
                  <p className="font-semibold text-blue-600">Theory Class</p>
                  <p><strong>Faculty:</strong> {section.theory.faculty}</p>
                  <p><strong>Room:</strong> {section.theory.details}</p>
                  <p><strong>Days:</strong> {section.theory.day.join(', ')}</p>
                  <p><strong>Time:</strong> {section.theory.startTime} - {section.theory.endTime}</p>
                </div>

                {/* Lab Details (if available) */}
                {section.lab && (
                  <div>
                    <p className="font-semibold text-blue-600">Lab Class</p>
                    <p><strong>Faculty:</strong> {section.lab.faculty}</p>
                    <p><strong>Room:</strong> {section.lab.details}</p>
                    <p><strong>Days:</strong> {section.lab.day.join(', ')}</p>
                    <p><strong>Time:</strong> {section.lab.startTime} - {section.lab.endTime}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}