"use client";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useUser } from '@clerk/nextjs';

// --- Interface Definitions for course data ---
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

// Interface for the flattened data we'll display
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

// Helper function to normalize day names (e.g., "TUESDAY" -> "TUE")
const normalizeDay = (day: string) => {
  return day.substring(0, 3).toUpperCase();
}

// Helper function to group courses by day and time
const groupClassesByDayAndTime = (courses: DisplayCourse[]) => {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "SAT"];
  const grouped: { [key: string]: { [time: string]: DisplayCourse[] } } = {};
  
  days.forEach(day => {
    grouped[day] = {};
  });

  courses.forEach(course => {
    course.day.forEach(day => {
      const normalizedDay = normalizeDay(day);
      if (grouped[normalizedDay]) {
        const timeSlot = `${course.startTime} - ${course.endTime}`;
        if (!grouped[normalizedDay][timeSlot]) {
          grouped[normalizedDay][timeSlot] = [];
        }
        grouped[normalizedDay][timeSlot].push(course);
      }
    });
  });

  return grouped;
};

// Helper function to get unique time slots
const getUniqueTimeSlots = (courses: DisplayCourse[]) => {
  const timeSlots = new Set<string>();
  courses.forEach(course => {
    timeSlots.add(`${course.startTime} - ${course.endTime}`);
  });
  
  const sortedTimeSlots = Array.from(timeSlots).sort((a, b) => {
    const parseTime = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      }
      if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      return hours * 60 + minutes;
    };
    const timeA = parseTime(a.split(' - ')[0]);
    const timeB = parseTime(b.split(' - ')[0]);
    return timeA - timeB;
  });
  return sortedTimeSlots;
};

export default function Schedule() {
  const [enrolledCourses, setEnrolledCourses] = useState<DisplayCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isLoaded } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";

  // --- PDF Download Handler ---
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(22);
    const headerText = "SCHEDULE OF SUMMER 2025";
    const headerX = pageWidth / 2;
    doc.text(headerText, headerX, 18, { align: "center" });

    let currentY = 28;

    // Theory Classes Table
    const theoryRows = enrolledCourses
      .filter(c => !c.courseCode.endsWith('L'))
      .map(course => [
        course.courseCode,
        course.courseName,
        course.section,
        course.faculty,
        course.details,
        course.day.join(", "),
        `${course.startTime} - ${course.endTime}`
      ]);
    if (theoryRows.length > 0) {
      doc.setFontSize(16);
      doc.text("Theory Class Schedule", 14, currentY);
      currentY += 6;
      autoTable(doc, {
        startY: currentY,
        head: [["Course Code", "Course Name", "Section", "Faculty", "Room", "Day(s)", "Time"]],
        body: theoryRows,
        theme: 'grid',
        headStyles: { fillColor: [0, 33, 71] }, // BRAC Navy
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
      });
      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    // Lab Classes Table
    const labRows = enrolledCourses
      .filter(c => c.courseCode.endsWith('L'))
      .map(course => [
        course.courseCode,
        course.courseName,
        course.section,
        course.faculty,
        course.details,
        course.day.join(", "),
        `${course.startTime} - ${course.endTime}`
      ]);
    if (labRows.length > 0) {
      doc.setFontSize(16);
      doc.text("Lab Class Schedule", 14, currentY);
      currentY += 6;
      autoTable(doc, {
        startY: currentY,
        head: [["Course Code", "Course Name", "Section", "Faculty", "Room", "Day(s)", "Time"]],
        body: labRows,
        theme: 'grid',
        headStyles: { fillColor: [0, 33, 71] }, // BRAC Navy
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
      });
      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    // Exam Schedule Table
    const examRows = enrolledCourses
      .filter(c => c.examDay && !c.courseCode.endsWith('L'))
      .map(course => [
        course.courseCode,
        course.courseName,
        course.examDay || ""
      ]);
    if (examRows.length > 0) {
      doc.setFontSize(16);
      doc.text("Exam Schedule", 14, currentY);
      currentY += 6;
      autoTable(doc, {
        startY: currentY,
        head: [["Course Code", "Course Name", "Exam Day"]],
        body: examRows,
        theme: 'grid',
        headStyles: { fillColor: [0, 33, 71] }, // BRAC Navy
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
      });
    }

    doc.save("Schedule_Summer_2025.pdf");
  };
  
  useEffect(() => {
    if (!isLoaded || !userEmail) return;

    const fetchEnrolledCourses = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/user-courses?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        if (Array.isArray(data.enrolledCourses)) {
          setEnrolledCourses(data.enrolledCourses);
        }
      } catch (error) {
        console.error("Failed to fetch enrolled courses:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEnrolledCourses();
  }, [isLoaded, userEmail]);
  
  const classSchedule = enrolledCourses.filter(c => !c.courseCode.endsWith('L'));
  const labSchedule = enrolledCourses.filter(c => c.courseCode.endsWith('L'));
  const examSchedule = enrolledCourses.filter(c => c.examDay && !c.courseCode.endsWith('L'));
  
  const daysOrder = ["SUN", "MON", "TUE", "WED", "THU", "SAT"];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brac-gold"></div>
          <span className="ml-4 text-brac-navy font-medium">Loading your schedule...</span>
        </div>
        <p className="mt-4 text-sm text-gray-500">Please wait while we retrieve your course information</p>
      </div>
    );
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="flex-1 text-center p-12 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="mx-auto w-16 h-16 mb-4 bg-brac-blue/10 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brac-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-brac-navy mb-2">No Courses Enrolled</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          You haven't enrolled in any courses yet. Visit the Manage Courses page to add courses to your schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brac-navy">Academic Schedule</h1>
            <p className="text-brac-blue mt-1">Summer 2025 Semester</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center justify-center px-5 py-2.5 bg-brac-gold hover:bg-brac-gold-dark text-brac-navy font-medium rounded-md transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Theory Class Schedule Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-brac-navy px-6 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Theory Class Schedule
          </h2>
        </div>
        <div className="p-2 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-brac-navy">Time</th>
                  {daysOrder.map(day => (
                    <th key={day} className="px-4 py-3 text-center font-medium text-brac-navy min-w-[120px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {getUniqueTimeSlots(classSchedule).map(timeSlot => (
                  <tr key={timeSlot} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-brac-blue whitespace-nowrap bg-gray-50">
                      {timeSlot}
                    </td>
                    {daysOrder.map(day => (
                      <td key={day} className="px-4 py-3 text-center align-top">
                        {groupClassesByDayAndTime(classSchedule)[day] && groupClassesByDayAndTime(classSchedule)[day][timeSlot] ? (
                          groupClassesByDayAndTime(classSchedule)[day][timeSlot].map((course, index) => (
                            <div key={index} className="bg-brac-blue/5 p-3 rounded border border-brac-blue/10 mb-2 last:mb-0">
                              <p className="font-semibold text-brac-navy text-sm">{course.courseCode} - {course.section.padStart(2, '0')}</p>
                              <p className="text-xs text-brac-blue mt-1">{course.courseName}</p>
                              <p className="text-xs text-gray-600 mt-1">{course.faculty}</p>
                              <p className="text-xs text-gray-600 mt-1"><span className="font-medium">Room:</span> {course.details}</p>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Lab Class Schedule Section */}
      {labSchedule.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-brac-navy px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Lab Class Schedule
            </h2>
          </div>
          <div className="p-2 sm:p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-brac-navy">Time</th>
                    {daysOrder.map(day => (
                      <th key={day} className="px-4 py-3 text-center font-medium text-brac-navy min-w-[120px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getUniqueTimeSlots(labSchedule).map(timeSlot => (
                    <tr key={timeSlot} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-brac-blue whitespace-nowrap bg-gray-50">
                        {timeSlot}
                      </td>
                      {daysOrder.map(day => (
                        <td key={day} className="px-4 py-3 text-center align-top">
                          {groupClassesByDayAndTime(labSchedule)[day] && groupClassesByDayAndTime(labSchedule)[day][timeSlot] ? (
                            groupClassesByDayAndTime(labSchedule)[day][timeSlot].map((course, index) => (
                              <div key={index} className="bg-brac-blue/5 p-3 rounded border border-brac-blue/10 mb-2 last:mb-0">
                                <p className="font-semibold text-brac-navy text-sm">{course.courseCode} - {course.section.padStart(2, '0')}</p>
                                <p className="text-xs text-brac-blue mt-1">{course.courseName}</p>
                                <p className="text-xs text-gray-600 mt-1">{course.faculty}</p>
                                <p className="text-xs text-gray-600 mt-1"><span className="font-medium">Room:</span> {course.details}</p>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Exam Schedule Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-brac-navy px-6 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exam Schedule
          </h2>
        </div>
        <div className="p-6">
          {examSchedule.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-600">No exams scheduled for your enrolled courses.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-brac-navy">Course Code</th>
                    <th className="px-4 py-3 text-left font-medium text-brac-navy">Course Name</th>
                    <th className="px-4 py-3 text-left font-medium text-brac-navy">Exam Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {examSchedule.map(course => (
                    <tr key={course._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-brac-blue">{course.courseCode}</td>
                      <td className="px-4 py-3">{course.courseName}</td>
                      <td className="px-4 py-3 font-medium text-brac-navy">{course.examDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs text-gray-500 mt-4 pb-8">
        <p>BRAC University Academic Schedule — Summer 2025</p>
      </div>
    </div>
  );
}