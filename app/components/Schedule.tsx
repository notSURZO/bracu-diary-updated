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
        headStyles: { fillColor: [41, 98, 255] },
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
        headStyles: { fillColor: [41, 98, 255] },
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
        headStyles: { fillColor: [123, 31, 162] },
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
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 rounded-2xl shadow-lg">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-blue-500 font-semibold">Loading your schedule...</span>
      </div>
    );
  }

  if (enrolledCourses.length === 0) {
    return (
      <div className="flex-1 text-center text-gray-500 font-semibold p-12 bg-gray-50 rounded-2xl shadow-lg">
        You haven&#39;t enrolled in any courses yet. Go to the Manage Courses page to add some!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10 md:gap-12">
      <h3 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-blue-900 text-center tracking-tight mt-4 sm:mt-8 md:mt-12">
        SUMMER 2025
      </h3>
      <div className="flex justify-center mt-2 sm:mt-4 mb-2">
        <button
          onClick={handleDownloadPDF}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors duration-200"
        >
          Schedule Download
        </button>
      </div>
      <div id="schedule-container" className="flex flex-col gap-8 sm:gap-10">
        {/* Theory Class Schedule Section */}
        <div className="bg-white p-3 sm:p-6 lg:p-8 rounded-none sm:rounded-3xl shadow-2xl border-t sm:border border-gray-100">
          <h3 className="font-bold text-blue-800 text-2xl md:text-2xl mb-6 pb-4 border-b-2 border-blue-300 flex items-center">
            <span className="inline-block mr-4 text-blue-500 text-4xl"></span>Theory Class Schedule
          </h3>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200 text-sm md:text-base">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th scope="col" className="px-4 md:px-6 py-4 text-left text-sm md:text-base font-bold uppercase tracking-wider">
                    Time
                  </th>
                  {daysOrder.map(day => (
                    <th key={day} scope="col" className="px-4 md:px-6 py-4 text-left text-sm md:text-base font-bold uppercase tracking-wider">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {getUniqueTimeSlots(classSchedule).map(timeSlot => (
                  <tr key={timeSlot} className="hover:bg-blue-50 transition-colors duration-200">
                    <td className="px-2 md:px-6 py-3 whitespace-nowrap text-sm md:text-lg font-semibold text-gray-800 bg-gray-50">
                      {timeSlot}
                    </td>
                    {daysOrder.map(day => (
                      <td key={day} className="px-2 md:px-6 py-3 text-xs sm:text-sm text-gray-700 align-top">
                        {groupClassesByDayAndTime(classSchedule)[day] && groupClassesByDayAndTime(classSchedule)[day][timeSlot] ? (
                          groupClassesByDayAndTime(classSchedule)[day][timeSlot].map((course, index) => (
                            <div key={index} className="bg-blue-100/70 p-2 sm:p-3 rounded-lg shadow-sm mb-2 last:mb-0 border border-blue-200">
                              <p className="font-bold text-blue-800 text-xs sm:text-sm md:text-base">{course.courseCode} - {course.section.padStart(2, '0')}</p>
                              <p className="text-[10px] sm:text-xs md:text-sm text-blue-600 mt-1">{course.faculty}</p>
                              <p className="text-[10px] sm:text-xs md:text-sm text-blue-600 mt-1"><span className="font-semibold">Room:</span> {course.details}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-center text-xs">--</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lab Class Schedule Section */}
        {labSchedule.length > 0 && (
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-none sm:rounded-3xl shadow-2xl border-t sm:border border-gray-100">
            <h2 className="font-bold text-blue-800 text-3xl md:text-2xl mb-6 pb-4 border-b-2 border-blue-300 flex items-center">
              <span className="inline-block mr-4 text-blue-500 text-4xl"></span>Lab Class Schedule
            </h2>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200 text-sm md:text-base">
                <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <tr>
                    <th scope="col" className="px-4 md:px-6 py-4 text-left text-sm md:text-base font-bold uppercase tracking-wider">
                      Time
                    </th>
                    {daysOrder.map(day => (
                      <th key={day} scope="col" className="px-4 md:px-6 py-4 text-left text-sm md:text-base font-bold uppercase tracking-wider">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {getUniqueTimeSlots(labSchedule).map(timeSlot => (
                    <tr key={timeSlot} className="hover:bg-blue-50 transition-colors duration-200">
                      <td className="px-2 md:px-6 py-3 whitespace-nowrap text-sm md:text-lg font-semibold text-gray-800 bg-gray-50">
                        {timeSlot}
                      </td>
                      {daysOrder.map(day => (
                        <td key={day} className="px-2 md:px-6 py-3 text-xs sm:text-sm text-gray-700 align-top">
                          {groupClassesByDayAndTime(labSchedule)[day] && groupClassesByDayAndTime(labSchedule)[day][timeSlot] ? (
                            groupClassesByDayAndTime(labSchedule)[day][timeSlot].map((course, index) => (
                              <div key={index} className="bg-blue-100/70 p-2 sm:p-3 rounded-lg shadow-sm mb-2 last:mb-0 border border-blue-200">
                                <p className="font-bold text-blue-800 text-xs sm:text-sm md:text-base">{course.courseCode} - {course.section.padStart(2, '0')}</p>
                                <p className="text-[10px] sm:text-xs md:text-sm text-blue-600 mt-1">{course.faculty}</p>
                                <p className="text-[10px] sm:text-xs md:text-sm text-blue-600 mt-1"><span className="font-semibold">Room:</span> {course.details}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-400 text-center text-xs">--</div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Exam Schedule Section - Simplified and changed UI */}
        <div className="bg-white p-3 sm:p-6 lg:p-8 rounded-none sm:rounded-3xl shadow-2xl border-t sm:border border-gray-100 mb-8 md:mb-12 lg:mb-16">
          <h2 className="font-bold text-purple-800 text-3xl md:text-2xl mb-6 pb-4 border-b-2 border-purple-300 flex items-center">
            <span className="inline-block mr-4 text-purple-500 text-4xl"></span> Exam Schedule
          </h2>
          {examSchedule.length === 0 ? (
            <p className="text-gray-500 font-medium p-4 text-base md:text-lg">No exams scheduled for your enrolled courses.</p>
          ) : (
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200 text-sm md:text-base">
                <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  <tr>
                    <th scope="col" className="px-4 md:px-6 py-4 text-left text-sm md:text-base font-bold uppercase tracking-wider">
                      Course Code
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-4 text-left text-sm md:text-base font-bold uppercase tracking-wider">
                      Course Name
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-4 text-left text-sm md:text-base font-bold uppercase tracking-wider">
                      Exam Day
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {examSchedule.map(course => (
                    <tr key={course._id} className="hover:bg-purple-50 transition-colors duration-200">
                      <td className="px-2 md:px-6 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-800">
                        {course.courseCode}
                      </td>
                      <td className="px-2 md:px-6 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-800">
                        {course.courseName}
                      </td>
                      <td className="px-2 md:px-6 py-3 whitespace-nowrap text-xs sm:text-sm font-semibold text-purple-600">
                        {course.examDay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
