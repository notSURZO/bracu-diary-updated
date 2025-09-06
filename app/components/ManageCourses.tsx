"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import debounce from 'lodash/debounce';
import { toast } from 'react-toastify';
import { useUser } from '@clerk/nextjs';
import { FaEye, FaPlus, FaExternalLinkAlt, FaTrash, FaSearch, FaFilter, FaSave } from 'react-icons/fa';

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
  _id: string; // The client-side unique ID
  originalCourseId: string; // The original MongoDB ObjectId
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
  
  // Using toast for success/error feedback instead of local banner
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
      const allCoursesRes = await fetch("/api/courses-surzo");
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
          originalCourseId: c._id, // Add originalCourseId
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
        originalCourseId: fullCourse?._id || '', // Include the original ID
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
          originalCourseId: fullCourse?._id || '', // Include the original ID for the lab
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
        originalCourseId: fullCourse._id, // Add originalCourseId
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
    try {
      const res = await fetch(`/api/user-courses?email=${encodeURIComponent(userEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, selectedCourses: selected }),
      });

      if (!res.ok) {
        const postRes = await fetch("/api/user-courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, selectedCourses: selected }),
        });
        if (!postRes.ok) throw new Error('Failed to create user courses');
      }

      await fetchAndSyncCourses();
      toast.success('Courses saved successfully!');
    } catch (err) {
      console.error('Failed to save courses:', err);
      toast.error('Failed to save courses. Please try again.');
    }
  };

  // Debounce the save action to prevent rapid duplicate clicks
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const debouncedSave = useMemo(
    () => debounce(() => handleSaveRef.current(), 1000, { leading: true, trailing: false }),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);
  
  const filteredCourses = courses.filter((c: DisplayCourse) =>
    (c.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.courseName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    c.section.toLowerCase().includes(sectionSearchTerm.toLowerCase())
  );
  
  const visibleSelected = selected.filter((course: DisplayCourse) => !course.courseCode.endsWith('L'));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 font-sans w-full p-4 md:p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-brac-navy mb-2">Course Management</h1>
        <p className="text-brac-blue">Manage your enrolled courses for the semester</p>
      </div>

      {/* Details Modal */}
      {isModalOpen && modalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 md:p-8 max-w-lg w-full shadow-xl border border-gray-200">
            <h3 className="text-xl font-bold text-brac-navy mb-4">{modalCourse.courseCode} - {modalCourse.courseName}</h3>
            <p className="text-md font-semibold text-brac-blue mb-5">Section: {modalCourse.section}</p>
            
            <div className="bg-brac-blue-light rounded-lg p-4 mb-4 border border-brac-blue">
              <h4 className="text-lg font-bold text-brac-navy mb-2">Theory</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Faculty:</span> {modalCourse.theory.faculty}</p>
                <p><span className="font-medium">Details:</span> {modalCourse.theory.details}</p>
                <p><span className="font-medium">Days:</span> {modalCourse.theory.day.join(', ')}</p>
                <p><span className="font-medium">Time:</span> {modalCourse.theory.startTime} - {modalCourse.theory.endTime}</p>
              </div>
            </div>
            
            {modalCourse.lab && (
              <div className="bg-brac-gold-light rounded-lg p-4 border border-brac-gold">
                <h4 className="text-lg font-bold text-brac-navy mb-2">Lab</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Faculty:</span> {modalCourse.lab.faculty}</p>
                  <p><span className="font-medium">Details:</span> {modalCourse.lab.details}</p>
                  <p><span className="font-medium">Days:</span> {modalCourse.lab.day.join(', ')}</p>
                  <p><span className="font-medium">Time:</span> {modalCourse.lab.startTime} - {modalCourse.lab.endTime}</p>
                </div>
              </div>
            )}
            
            <div className="text-center mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-brac-blue text-white rounded-md font-medium hover:bg-brac-blue-dark transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Available Courses Column */}
        <div className="flex flex-col gap-4 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h2 className="font-bold text-brac-navy text-xl pb-2 border-b border-gray-200 flex items-center gap-2">
            <FaSearch className="text-brac-blue" />
            Available Courses
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search course code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brac-blue focus:border-brac-blue"
              />
            </div>
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaFilter className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Filter by section..."
                value={sectionSearchTerm}
                onChange={(e) => setSectionSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brac-blue focus:border-brac-blue"
              />
            </div>
          </div>
          
          <div className="w-full flex-grow max-h-[60vh] overflow-y-auto space-y-3">
            {loading ? (
              <div className="flex items-center justify-center p-8 h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brac-blue"></div>
                <span className="ml-3 text-brac-navy">Loading Courses...</span>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center text-gray-500 font-medium py-8 rounded-lg bg-gray-50">
                No courses available or match your search.
              </div>
            ) : (
              filteredCourses.map(course => (
                <div key={course._id} className="flex flex-col p-4 bg-gray-50 rounded-md border border-gray-200 hover:border-brac-blue transition-colors">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-brac-navy">{course.courseCode}</span>
                      <span className="text-xs font-semibold text-brac-blue bg-brac-blue-light px-2 py-0.5 rounded-full">Sec: {course.section}</span>
                    </div>
                    <span className="text-sm text-brac-navy/80 mb-2">{course.courseName}</span>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">Faculty: {course.faculty}</span>
                      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {Array.isArray(course.day) ? course.day.join(', ') : course.day}
                      </span>
                      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {course.startTime} - {course.endTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      className="p-2 bg-brac-blue-light text-brac-blue rounded-md hover:bg-brac-blue hover:text-white transition-colors"
                      onClick={() => handleViewDetails(course.courseCode, course.section)}
                      title="View Details"
                    >
                      <FaEye className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 bg-brac-gold-light text-brac-navy rounded-md hover:bg-brac-gold hover:text-white transition-colors"
                      onClick={() => handleSelect(course)}
                      title="Add to Enrolled"
                    >
                      <FaPlus className="h-4 w-4" />
                    </button>
                    <a 
                      href={course.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                      title="View Course on Official Site"
                    >
                      <FaExternalLinkAlt className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Enrolled Courses Column */}
        <div className="flex flex-col gap-4 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h2 className="font-bold text-brac-navy text-xl pb-2 border-b border-gray-200 flex items-center gap-2">
            My Enrolled Courses
          </h2>
          
          <div className="w-full flex-grow max-h-[60vh] overflow-y-auto space-y-3">
            {visibleSelected.length === 0 ? (
              <div className="text-center text-gray-500 font-medium py-8 rounded-lg bg-gray-50">
                Your enrolled courses will appear here.
              </div>
            ) : (
              visibleSelected.map(course => (
                <div key={course._id} className="flex flex-col p-4 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-brac-navy">{course.courseCode}</span>
                      <span className="text-xs font-semibold text-brac-blue bg-brac-blue-light px-2 py-0.5 rounded-full">Sec: {course.section}</span>
                    </div>
                    <span className="text-sm text-brac-navy/80 mb-2">{course.courseName}</span>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">Faculty: {course.faculty}</span>
                      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {Array.isArray(course.day) ? course.day.join(', ') : course.day}
                      </span>
                      <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {course.startTime} - {course.endTime}
                      </span>
                      {course.examDay && <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        Exam: {course.examDay}
                      </span>}
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <button
                      className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                      onClick={() => handleRemove(course)}
                      title="Remove Course"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="w-full flex justify-center mt-4 pt-4 border-t border-gray-200">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-brac-blue text-white rounded-md font-medium hover:bg-brac-blue-dark transition-colors disabled:opacity-50"
              onClick={() => debouncedSave()}
              disabled={!userEmail || selected.length === 0}
            >
              <FaSave className="h-4 w-4" />
              Save My Courses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}