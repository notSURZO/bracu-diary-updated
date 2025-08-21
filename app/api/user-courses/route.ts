import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Course from "@/lib/models/Course";

export async function POST(req: Request) {
  await connectToDatabase();
  const { email, selectedCourses } = await req.json();
  await User.findOneAndUpdate(
    { email },
    { $set: { enrolledCourses: selectedCourses } },
    { new: true }
  );
  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  await connectToDatabase();
  const { email, selectedCourses } = await req.json();
  await User.findOneAndUpdate(
    { email },
    { $set: { enrolledCourses: selectedCourses } },
    { new: true }
  );
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  
  if (!email) {
    return NextResponse.json({ enrolledCourses: [] });
  }
  
  const user = await User.findOne({ email });
  
  if (!user || !user.enrolledCourses || user.enrolledCourses.length === 0) {
    return NextResponse.json({ enrolledCourses: [] });
  }
  
  // If enrolledCourses contains full objects (from ManageCourses), return them directly
  if (user.enrolledCourses.length > 0 && typeof user.enrolledCourses[0] === 'object') {
    return NextResponse.json({ enrolledCourses: user.enrolledCourses });
  }
  
  // If enrolledCourses contains only IDs, fetch full course details
  const enrolledCourseIds = user.enrolledCourses;
  const enrolledCourses = [];
  
  for (const courseId of enrolledCourseIds) {
    if (courseId.includes('-lab')) {
      // Handle lab courses
      const baseCourseId = courseId.replace('-lab', '');
      const baseCourse = await Course.findById(baseCourseId);
      if (baseCourse) {
        const section = baseCourse.sections.find((s: any) => s.section === courseId.replace('-lab', ''));
        if (section && section.lab) {
          enrolledCourses.push({
            _id: courseId,
            courseCode: baseCourse.courseCode + 'L',
            courseName: baseCourse.courseName + ' Lab',
            section: section.section,
            faculty: section.lab.faculty || 'TBA',
            details: section.lab.details,
            day: section.lab.day,
            startTime: section.lab.startTime,
            endTime: section.lab.endTime,
            examDay: baseCourse.examDay,
            hasLab: false,
            link: baseCourse.link
          });
        }
      }
    } else {
      // Handle theory courses
      const course = await Course.findById(courseId);
      if (course) {
        const section = course.sections[0];
        enrolledCourses.push({
          _id: course._id.toString(),
          courseCode: course.courseCode,
          courseName: course.courseName,
          section: section.section,
          faculty: section.theory.faculty,
          details: section.theory.details,
          day: section.theory.day,
          startTime: section.theory.startTime,
          endTime: section.theory.endTime,
          examDay: course.examDay,
          hasLab: !!section.lab,
          link: course.link
        });
      }
    }
  }
  
  return NextResponse.json({ enrolledCourses });
}
