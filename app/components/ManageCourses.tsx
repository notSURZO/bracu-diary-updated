"use client";
import { useEffect, useState } from "react";
import { useUser } from '@clerk/nextjs';
import Sidebar from "./Sidebar";

// --- Interface Definitions to match the updated schema ---
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
  lab?: ClassDetails; // Lab is now optional
}

interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
  link: string;
  examDay?: string;
  sections: Section[];
}

// Interface for the flattened data we'll display in the Available Courses list
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

// Interface for the data we'll show in the details modal
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
  
  const [allCoursesCache, setAllCoursesCache] = useState<Course[]>([]);

  const fetchAndSyncCourses = async () => {
    setLoading(true);
    try {
      const allCoursesRes = await fetch("/api/courses");
      const allCourses = await allCoursesRes.json();
      setAllCoursesCache(allCourses);

      const enrolledRes = await fetch(`/api/user-courses?email=${encodeURIComponent(userEmail)}`);
      const enrolledData = await enrolledRes.json();
      const enrolled = Array.isArray(enrolledData.enrolledCourses) ? enrolledData.enrolledCourses : [];
      setSelected(enrolled);

      const enrolledCourseCodes = enrolled
        .filter((course: DisplayCourse) => !course.courseCode.endsWith('L'))
        .map((course: DisplayCourse) => course.courseCode);

      const availableCourses = allCourses.flatMap((c: Course) => 
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
      ).filter((dc: DisplayCourse) => !enrolledCourseCodes.includes(dc.courseCode));
      
      setCourses(availableCourses);
    } catch (error) {
      console.error("Failed to fetch and sync courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !userEmail) return;
    fetchAndSyncCourses();
  }, [isLoaded, userEmail]);

  const handleSelect = (course: DisplayCourse) => {
    const fullCourse = allCoursesCache.find(c => c.courseCode === course.courseCode);
    const fullSection = fullCourse?.sections.find(s => s.section === course.section);

    if (fullSection) {
      const newSelected: DisplayCourse[] = [{
        _id: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        section: fullSection.section,
        faculty: fullSection.theory.faculty,
        details: fullSection.theory.details,
        day: fullSection.theory.day,
        startTime: fullSection.theory.startTime,
        endTime: fullSection.theory.endTime,
        examDay: fullCourse?.examDay,
        hasLab: !!fullSection.lab,
        link: fullCourse?.link || '',
      }];

      if (fullSection.lab) {
        newSelected.push({
          _id: course._id + '-lab',
          courseCode: course.courseCode + 'L',
          courseName: course.courseName + ' Lab',
          section: fullSection.section,
          faculty: fullSection.lab.faculty,
          details: fullSection.lab.details,
          day: fullSection.lab.day,
          startTime: fullSection.lab.startTime,
          endTime: fullSection.lab.endTime,
          examDay: fullCourse?.examDay,
          hasLab: false,
          link: fullCourse?.link || '',
        });
      }

      setSelected(prevSelected => [...prevSelected, ...newSelected]);
      setCourses(prevCourses => prevCourses.filter(c => c.courseCode !== course.courseCode));
    }
  };

  const handleRemove = (course: DisplayCourse) => {
    const newSelected = selected.filter(c => 
      c.courseCode !== course.courseCode && 
      c.courseCode !== `${course.courseCode}L`
    );
    setSelected(newSelected);
    
    const fullCourse = allCoursesCache.find(c => c.courseCode === course.courseCode);
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
      setCourses(prev => [...prev, ...sectionsToAddBack].sort((a,b) => a.courseCode.localeCompare(b.courseCode) || a.section.localeCompare(b.section)));
    }
  };

  const handleSave = async () => {
    if (!userEmail) return;
    
    const res = await fetch(`/api/user-courses?email=${encodeURIComponent(userEmail)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, selectedCourses: selected }),
    });

    if (!res.ok) {
      await fetch("/api/user-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, selectedCourses: selected }),
      });
    }

    await fetchAndSyncCourses();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };
  
  const filteredCourses = courses.filter((c: DisplayCourse) =>
    (c.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.courseName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    c.section.toLowerCase().includes(sectionSearchTerm.toLowerCase())
  );
  
  const visibleSelected = selected.filter((course: DisplayCourse) => !course.courseCode.endsWith('L'));

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 text-gray-800 font-sans">
      

      {/* Details Modal */}
      {isModalOpen && modalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl border-4 border-blue-400">
            <h3 className="text-2xl font-bold text-blue-700 mb-4">{modalCourse.courseCode} - {modalCourse.courseName}</h3>
            <p className="text-lg font-semibold text-gray-700 mb-4">Section: {modalCourse.section}</p>
            
            <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
              <h4 className="text-xl font-bold text-blue-600 mb-2">Theory</h4>
              <p><strong>Faculty:</strong> {modalCourse.theory.faculty}</p>
              <p><strong>Details:</strong> {modalCourse.theory.details}</p>
              <p><strong>Days:</strong> {modalCourse.theory.day.join(', ')}</p>
              <p><strong>Time:</strong> {modalCourse.theory.startTime} - {modalCourse.theory.endTime}</p>
            </div>
            
            {modalCourse.lab && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="text-xl font-bold text-blue-600 mb-2">Lab</h4>
                <p><strong>Faculty:</strong> {modalCourse.lab.faculty}</p>
                <p><strong>Details:</strong> {modalCourse.lab.details}</p>
                <p><strong>Days:</strong> {modalCourse.lab.day.join(', ')}</p>
                <p><strong>Time:</strong> {modalCourse.lab.startTime} - {modalCourse.lab.endTime}</p>
              </div>
            )}
            
            <div className="text-center mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition duration-300 shadow"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row justify-center p-6 md:p-12 gap-8">
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <div className="w-full">
            <h2 className="font-bold text-blue-800 text-2xl mb-4 border-b-2 border-blue-300 pb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Available Courses
            </h2>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="🔍 Search course code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-1/2 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white shadow-sm"
              />
              <input
                type="text"
                placeholder="🔢 Filter by section..."
                value={sectionSearchTerm}
                onChange={(e) => setSectionSearchTerm(e.target.value)}
                className="w-1/2 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white shadow-sm"
              />
            </div>
            
            <div className="bg-white p-4 rounded-xl w-full max-h-[60vh] overflow-y-auto shadow-md space-y-4 border border-gray-200">
              {loading ? (
                 <div className="flex items-center justify-center p-8">
                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                 <span className="ml-4 text-blue-500 font-semibold">Loading courses...</span>
               </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center text-gray-400 font-semibold py-6 rounded-lg">
                  No courses available
                </div>
              ) : (
                filteredCourses.map(course => (
                  <div key={course._id} className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50 rounded-lg px-4 py-3 font-medium shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-blue-700">{course.courseCode}</span>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Sec: {course.section}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{course.courseName}</span>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold mt-2">
                        <span className="text-gray-600 bg-gray-200 px-2 py-0.5 rounded">Faculty: {course.faculty}</span>
                        <span className="text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                          Days: {Array.isArray(course.day) ? course.day.join(', ') : course.day}
                        </span>
                        <span className="text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                          Time: {course.startTime} - {course.endTime}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                      <button
                        className="p-2 bg-blue-500 rounded-full text-white shadow-md hover:bg-blue-600 transition-all duration-300"
                        onClick={() => handleViewDetails(course.courseCode, course.section)}
                        title="View Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      </button>
                      <button
                        className="p-2 bg-green-500 rounded-full text-white shadow-md hover:bg-green-600 transition-all duration-300"
                        onClick={() => handleSelect(course)}
                        title="Add to Enrolled"
                      >
                        <span className="inline-block align-middle text-lg">➕</span>
                      </button>
                      <a 
                        href={course.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-500 rounded-full text-white shadow-md hover:bg-blue-600 transition-all duration-300"
                        title="View Course Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                           <path d="M19 12h-2c0-2.76-2.24-5-5-5s-5 2.24-5 5H5c0-4.42 3.58-8 8-8s8 3.58 8 8zM5 14h2c0 2.76 2.24 5 5 5s5-2.24 5-5h2c0 4.42-3.58 8-8 8s-8-3.58-8-8z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <div className="w-full">
            <h2 className="font-bold text-blue-800 text-2xl mb-4 border-b-2 border-blue-300 pb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Enrolled Courses
            </h2>
            {visibleSelected.length === 0 ? (
              <div className="text-center text-gray-400 font-semibold py-6 rounded-lg bg-white shadow-sm border border-gray-200">
                No courses enrolled yet
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl w-full max-h-[60vh] overflow-y-auto shadow-md space-y-4 border border-gray-200">
                {visibleSelected.map(course => (
                  <div key={course._id} className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50 rounded-lg px-4 py-3 font-medium shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-blue-700">{course.courseCode}</span>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Sec: {course.section}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{course.courseName}</span>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold mt-2">
                        <span className="text-gray-600 bg-gray-200 px-2 py-0.5 rounded">Faculty: {course.faculty}</span>
                        <span className="text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                          Days: {Array.isArray(course.day) ? course.day.join(', ') : course.day}
                        </span>
                        <span className="text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                          Time: {course.startTime} - {course.endTime}
                        </span>
                        <span className="text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                          Exam: {course.examDay}
                        </span>
                      </div>
                    </div>
                    <button
                      className="px-3 py-1 bg-red-500 rounded-md text-white font-semibold hover:bg-red-600 transition-all duration-300 shadow-sm flex items-center gap-1"
                      onClick={() => handleRemove(course)}
                    >
                      <span className="inline-block align-middle">🗑️</span>Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="w-full flex justify-center mt-6 md:mt-10">
            <button
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all duration-300 text-lg tracking-wide"
              onClick={handleSave}
            >
              <span className="inline-block align-middle mr-2">💾</span>Save My Courses
            </button>
          </div>

          {success && (
            <div className="mt-6 px-6 py-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center font-semibold shadow animate-pulse">
              Courses saved successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}