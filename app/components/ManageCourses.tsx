"use client";

import { useEffect, useState } from "react";
import { useUser } from '@clerk/nextjs';
import { FaEye, FaPlus, FaExternalLinkAlt, FaTrash } from 'react-icons/fa';

// --- Interface Definitions ---
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

interface DisplayCourse {
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

interface ModalCourseData {
  courseCode: string;
  courseName: string;
  section: string;
  theory: ClassDetails;
  lab?: ClassDetails;
  examDay?: string;
}

export default function ManageCourses() {
  const [courses, setCourses] = useState<DisplayCourse[]>([]);
  const [selected, setSelected] = useState<DisplayCourse[]>([]);
  const { user, isLoaded } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [sectionSearchTerm, setSectionSearchTerm] = useState("");

  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCourse, setModalCourse] = useState<ModalCourseData | null>(null);

  const [allCoursesCache, setAllCoursesCache] = useState<Course[]>([]);

  const handleViewDetails = (courseCode: string, section: string) => {
    const fullCourse = allCoursesCache.find(c => c.courseCode === courseCode);
    if (!fullCourse) return;
    const fullSection = fullCourse.sections.find(s => s.section === section);
    if (!fullSection) return;

    setModalCourse({
      courseCode: fullCourse.courseCode,
      courseName: fullCourse.courseName,
      section: fullSection.section,
      theory: fullSection.theory,
      lab: fullSection.lab,
      examDay: fullCourse.examDay,
    });
    setIsModalOpen(true);
  };

  const fetchAndSyncCourses = async () => {
    setLoading(true);
    try {
      const allCoursesRes = await fetch("/api/courses-raiyan");
      const allCoursesData = await allCoursesRes.json();
      setAllCoursesCache(allCoursesData);

      if (userEmail) {
        const enrolledRes = await fetch(`/api/user-courses?email=${encodeURIComponent(userEmail)}`);
        const enrolledData = await enrolledRes.json();
        const enrolled = Array.isArray(enrolledData.enrolledCourses) ? enrolledData.enrolledCourses : [];
        setSelected(enrolled);

        const enrolledCourseCodes = new Set(
          enrolled
            .filter((course: DisplayCourse) => !course.courseCode.endsWith('L'))
            .map((course: DisplayCourse) => course.courseCode)
        );

        const availableCourses = allCoursesData.flatMap((c: Course) =>
          c.sections.map((s: Section) => ({
            _id: c._id + s.section,
            courseCode: c.courseCode,
            courseName: c.courseName,
            section: s.section,
            faculty: s.theory.faculty,
            details: s.theory.details,
            day: s.theory.day,
            startTime: s.theory.startTime,
            endTime: s.theory.endTime,
            examDay: c.examDay,
            hasLab: !!s.lab,
            link: c.link
          }))
        ).filter((dc: DisplayCourse) => !enrolledCourseCodes.has(dc.courseCode));

        setCourses(availableCourses);
      } else {
        const allDisplayCourses = allCoursesData.flatMap((c: Course) =>
          c.sections.map((s: Section) => ({
            _id: c._id + s.section,
            courseCode: c.courseCode,
            courseName: c.courseName,
            section: s.section,
            faculty: s.theory.faculty,
            details: s.theory.details,
            day: s.theory.day,
            startTime: s.theory.startTime,
            endTime: s.theory.endTime,
            examDay: c.examDay,
            hasLab: !!s.lab,
            link: c.link
          }))
        );
        setCourses(allDisplayCourses);
      }
    } catch (error) {
      console.error("Failed to fetch and sync courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    fetchAndSyncCourses();
  }, [isLoaded, userEmail]);

  const handleSelect = (course: DisplayCourse) => {
    const fullCourse = allCoursesCache.find(c => c.courseCode === course.courseCode);
    if (!fullCourse) return;
    const fullSection = fullCourse.sections.find(s => s.section === course.section);

    if (fullSection) {
      const newSelectedItems: DisplayCourse[] = [];

      newSelectedItems.push({
        ...course,
        _id: course._id,
        link: fullCourse.link || ''
      });

      if (fullSection.lab) {
        newSelectedItems.push({
          _id: course._id + '-lab',
          courseCode: course.courseCode + 'L',
          courseName: course.courseName + ' Lab',
          section: fullSection.section,
          faculty: fullSection.lab.faculty,
          details: fullSection.lab.details,
          day: fullSection.lab.day,
          startTime: fullSection.lab.startTime,
          endTime: fullSection.lab.endTime,
          examDay: fullCourse.examDay,
          hasLab: false,
          link: fullCourse.link || '',
        });
      }

      setSelected(prevSelected => [...prevSelected, ...newSelectedItems]);
      setCourses(prevCourses => prevCourses.filter(c => c.courseCode !== course.courseCode));
    }
  };

  const handleRemove = (courseToRemove: DisplayCourse) => {
    const newSelected = selected.filter(c =>
      c.courseCode !== courseToRemove.courseCode &&
      c.courseCode !== `${courseToRemove.courseCode}L`
    );
    setSelected(newSelected);

    const fullCourse = allCoursesCache.find(c => c.courseCode === courseToRemove.courseCode);
    if (fullCourse) {
      const sectionsToAddBack = fullCourse.sections.map(s => ({
        _id: fullCourse._id + s.section,
        courseCode: fullCourse.courseCode,
        courseName: fullCourse.courseName,
        section: s.section,
        faculty: s.theory.faculty,
        details: s.theory.details,
        day: s.theory.day,
        startTime: s.theory.startTime,
        endTime: s.theory.endTime,
        examDay: fullCourse.examDay,
        hasLab: !!s.lab,
        link: fullCourse.link,
      }));
      setCourses(prev => [...prev, ...sectionsToAddBack].sort((a, b) => a.courseCode.localeCompare(b.courseCode) || a.section.localeCompare(b.section)));
    }
  };

  const handleSave = async () => {
    if (!userEmail) return;

    const res = await fetch(`/api/user-courses?email=${encodeURIComponent(userEmail)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, selectedCourses: selected }),
    });

    if (res.status === 404) {
      await fetch("/api/user-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, selectedCourses: selected }),
      });
    }

    await fetchAndSyncCourses();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  const filteredCourses = courses.filter((c: DisplayCourse) =>
    (c.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    c.section.toLowerCase().includes(sectionSearchTerm.toLowerCase())
  );

  const visibleSelected = selected.filter((course: DisplayCourse) => !course.courseCode.endsWith('L'));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 font-sans w-full">

      {/* Details Modal */}
      {isModalOpen && modalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border-2 border-blue-500 transform transition-all scale-100">
            <h3 className="text-2xl font-bold text-blue-800 mb-4">{modalCourse.courseCode} - {modalCourse.courseName}</h3>
            <p className="text-lg font-semibold text-gray-700 mb-5">Section: {modalCourse.section}</p>
            
            <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
              <h4 className="text-xl font-bold text-blue-600 mb-2">Theory</h4>
              <p><strong>Faculty:</strong> {modalCourse.theory.faculty}</p>
              <p><strong>Details:</strong> {modalCourse.theory.details}</p>
              <p><strong>Days:</strong> {modalCourse.theory.day.join(', ')}</p>
              <p><strong>Time:</strong> {modalCourse.theory.startTime} - {modalCourse.theory.endTime}</p>
            </div>
            
            {modalCourse.lab && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="text-xl font-bold text-green-600 mb-2">Lab</h4>
                <p><strong>Faculty:</strong> {modalCourse.lab.faculty}</p>
                <p><strong>Details:</strong> {modalCourse.lab.details}</p>
                <p><strong>Days:</strong> {modalCourse.lab.day.join(', ')}</p>
                <p><strong>Time:</strong> {modalCourse.lab.startTime} - {modalCourse.lab.endTime}</p>
              </div>
            )}
            
            <div className="text-center mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-300 shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-10 w-full">
        
        {/* Available Courses Column */}
        <div className="flex flex-col gap-6">
          <h2 className="font-bold text-blue-800 text-3xl border-b-4 border-blue-300 pb-3 flex items-center gap-3">
            Available Courses
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="🔍 Search course code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white shadow-sm"
            />
            <input
              type="text"
              placeholder="🔢 Filter by section..."
              value={sectionSearchTerm}
              onChange={(e) => setSectionSearchTerm(e.target.value)}
              className="flex-grow px-4 py-2.5 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white shadow-sm"
            />
          </div>
          
          <div className="bg-white p-4 rounded-xl w-full flex-grow max-h-[70vh] overflow-y-auto shadow-lg space-y-4 border border-gray-200">
            {loading ? (
               <div className="flex items-center justify-center p-8 h-full">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                 <span className="ml-4 text-blue-600 font-semibold text-lg">Loading Courses...</span>
               </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center text-gray-500 font-semibold py-10 rounded-lg h-full flex items-center justify-center">
                No courses available or match your search.
              </div>
            ) : (
              filteredCourses.map(course => (
                <div key={course._id} className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50 rounded-lg p-4 font-medium shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 border-2 border-transparent">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-blue-700">{course.courseCode}</span>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Sec: {course.section}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">{course.courseName}</span>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold mt-2">
                      <span className="text-gray-700 bg-gray-200 px-2 py-1 rounded">Faculty: {course.faculty}</span>
                      <span className="text-gray-700 bg-gray-200 px-2 py-1 rounded">
                        Days: {Array.isArray(course.day) ? course.day.join(', ') : course.day}
                      </span>
                      <span className="text-gray-700 bg-gray-200 px-2 py-1 rounded">
                        Time: {course.startTime} - {course.endTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 self-center md:self-auto mt-4 md:mt-0">
                    <button
                      className="p-3 bg-blue-100 text-blue-600 rounded-full shadow-md hover:bg-blue-200 transition-all duration-300"
                      onClick={() => handleViewDetails(course.courseCode, course.section)}
                      title="View Details"
                    >
                      <FaEye className="h-5 w-5" />
                    </button>
                    <button
                      className="p-3 bg-green-100 text-green-600 rounded-full shadow-md hover:bg-green-200 transition-all duration-300"
                      onClick={() => handleSelect(course)}
                      title="Add to Enrolled"
                    >
                      <FaPlus className="h-5 w-5" />
                    </button>
                    <a 
                      href={course.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-gray-100 text-gray-600 rounded-full shadow-md hover:bg-gray-200 transition-all duration-300"
                      title="View Course on Official Site"
                    >
                      <FaExternalLinkAlt className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Enrolled Courses Column */}
        <div className="flex flex-col gap-6">
            <h2 className="font-bold text-blue-800 text-3xl border-b-4 border-blue-300 pb-3 flex items-center gap-3">
              My Enrolled Courses
            </h2>
          
            <div className="bg-white p-4 rounded-xl w-full flex-grow max-h-[70vh] overflow-y-auto shadow-lg space-y-4 border border-gray-200">
            {visibleSelected.length === 0 ? (
              <div className="text-center text-gray-500 font-semibold py-10 rounded-lg h-full flex items-center justify-center">
                Your enrolled courses will appear here.
              </div>
            ) : (
                visibleSelected.map(course => (
                  <div key={course._id} className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50 rounded-lg p-4 font-medium shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 border-2 border-transparent">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-blue-700">{course.courseCode}</span>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Sec: {course.section}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{course.courseName}</span>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold mt-2">
                        <span className="text-gray-700 bg-gray-200 px-2 py-1 rounded">Faculty: {course.faculty}</span>
                        <span className="text-gray-700 bg-gray-200 px-2 py-1 rounded">
                          Days: {Array.isArray(course.day) ? course.day.join(', ') : course.day}
                        </span>
                        <span className="text-gray-700 bg-gray-200 px-2 py-1 rounded">
                          Time: {course.startTime} - {course.endTime}
                        </span>
                        {/* THIS IS THE CHANGED LINE */}
                        {course.examDay && <span className="text-gray-700 bg-gray-200 px-2 py-1 rounded">
                          Exam: {course.examDay}
                        </span>}
                      </div>
                    </div>
                    <button
                      className="p-3 bg-red-100 text-red-600 rounded-full shadow-md hover:bg-red-200 transition-all duration-300"
                      onClick={() => handleRemove(course)}
                      title="Remove Course"
                    >
                      <FaTrash className="h-5 w-5" />
                    </button>
                  </div>
                ))
            )}
            </div>
          
            <div className="w-full flex justify-center mt-auto pt-6">
              <button
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all duration-300 text-lg tracking-wide w-full sm:w-auto"
                onClick={handleSave}
                disabled={!userEmail}
              >
                💾 Save My Courses
              </button>
            </div>

            {success && (
              <div className="mt-4 px-6 py-3 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-lg text-center font-semibold shadow-md">
                Courses saved successfully!
              </div>
            )}
        </div>

      </div>
    </div>
  );
}