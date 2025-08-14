"use client";
import { useEffect, useState } from "react";
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
  const days = ["SUN", "MON", "TUE", "WED", "THU", "SAT"]; // Removed Friday
  const grouped: { [key: string]: { [time: string]: DisplayCourse[] } } = {};
  
  // Initialize grouped object with empty objects for each day
  days.forEach(day => {
    grouped[day] = {};
  });

  courses.forEach(course => {
    // Ensure course.day is an array before iterating
    if (Array.isArray(course.day)) {
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
    }
  });

  return grouped;
};

// Helper function to get unique time slots
const getUniqueTimeSlots = (courses: DisplayCourse[]) => {
  const timeSlots = new Set<string>();
  courses.forEach(course => {
    timeSlots.add(`${course.startTime} - ${course.endTime}`);
  });
  
  // Sort the time slots chronologically, handling AM/PM correctly
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
  
  useEffect(() => {
    if (!isLoaded || !userEmail) return;

    const fetchEnrolledCourses = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/user-courses?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        // Ensure data.enrolledCourses is always an array
        if (Array.isArray(data.enrolledCourses)) {
          setEnrolledCourses(data.enrolledCourses);
        } else {
          setEnrolledCourses([]);
        }
      } catch (error) {
        console.error("Failed to fetch enrolled courses:", error);
        setEnrolledCourses([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEnrolledCourses();
  }, [isLoaded, userEmail]);
  
  // Use a fallback to an empty array and add a null check inside the filter
  const safeEnrolledCourses = enrolledCourses || [];
  const classSchedule = safeEnrolledCourses.filter(c => c && c.courseCode && !c.courseCode.endsWith('L'));
  const labSchedule = safeEnrolledCourses.filter(c => c && c.courseCode && c.courseCode.endsWith('L'));
  const examSchedule = safeEnrolledCourses.filter(c => c && c.courseCode && c.examDay && !c.courseCode.endsWith('L'));
  
  // Combine theory and lab courses for the class schedule table
  const allClasses = [...classSchedule, ...labSchedule];

  const groupedClasses = groupClassesByDayAndTime(allClasses);
  const uniqueTimeSlots = getUniqueTimeSlots(allClasses);
  
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
        You haven't enrolled in any courses yet. Go to the Manage Courses page to add some!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 pr-64">
      {/* Class Schedule Section */}
      <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100">
        <h2 className="font-bold text-blue-800 text-2xl md:text-3xl mb-4 pb-2 border-b-2 border-blue-300 flex items-center">
          <span className="inline-block mr-3 text-blue-500 text-3xl">📅</span>Class Schedule
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs md:text-sm font-bold uppercase tracking-wider">
                  Time
                </th>
                {daysOrder.map(day => (
                  <th key={day} scope="col" className="px-6 py-4 text-left text-xs md:text-sm font-bold uppercase tracking-wider">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {uniqueTimeSlots.map(timeSlot => (
                <tr key={timeSlot} className="hover:bg-blue-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm md:text-base font-semibold text-gray-800 bg-gray-50">
                    {timeSlot}
                  </td>
                  {daysOrder.map(day => (
                    <td key={day} className="px-4 py-4 text-sm text-gray-700">
                      {groupedClasses[day] && groupedClasses[day][timeSlot] ? (
                        groupedClasses[day][timeSlot].map((course, index) => (
                          <div key={index} className="bg-blue-100/70 p-3 rounded-lg shadow-sm mb-2 last:mb-0 border border-blue-200">
                            <p className="font-bold text-blue-800 text-sm md:text-base">{course.courseCode} - {course.section.padStart(2, '0')}</p>
                            <p className="text-xs md:text-sm text-blue-600 mt-1">{course.faculty}</p>
                            <p className="text-xs md:text-sm text-blue-600 mt-1"><span className="font-semibold">Room:</span> {course.details}</p>
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

      {/* Exam Schedule Section */}
      <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-100">
        <h2 className="font-bold text-blue-800 text-2xl md:text-3xl mb-4 pb-2 border-b-2 border-blue-300 flex items-center">
          <span className="inline-block mr-3 text-blue-500 text-3xl">📝</span>Exam Schedule
        </h2>
        {examSchedule.length === 0 ? (
          <p className="text-gray-500 font-medium p-4">No exams scheduled for your enrolled courses.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examSchedule.map(course => (
              <div key={course._id} className="relative bg-white rounded-2xl shadow-xl overflow-hidden group transition-transform transform hover:-translate-y-1 hover:shadow-2xl duration-300 ease-in-out cursor-pointer border border-gray-200">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative p-6">
                  <div className="flex items-center mb-3">
                    <span className="text-3xl text-blue-600 group-hover:text-white transition-colors duration-300 mr-3">🎓</span>
                    <p className="text-xl font-bold text-blue-800 group-hover:text-white transition-colors duration-300 leading-tight">{course.courseCode}</p>
                  </div>
                  <p className="text-sm text-gray-600 group-hover:text-blue-100 transition-colors duration-300 mt-2">{course.courseName}</p>
                  <p className="text-sm font-medium text-blue-600 group-hover:text-white transition-colors duration-300 mt-4">
                    <span className="font-bold">Exam Day:</span> {course.examDay}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}