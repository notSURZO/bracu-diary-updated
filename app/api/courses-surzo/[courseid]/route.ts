import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import mongoose from 'mongoose';

export async function GET(request: Request, { params }: { params: Promise<{ courseid: string }> }) {
  try {
    // Await the params to get the actual courseid
    const { courseid } = await params;
    let courseId = courseid;

    if (!courseId) {
      return NextResponse.json({ message: 'Course ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if the courseId is a modified ID (contains section number or -lab suffix)
    let originalCourseId = courseId;
    let isLabCourse = false;
    let sectionNumber = '';

    if (courseId.includes('-lab')) {
      // Handle lab courses: extract original ID and section number
      const baseId = courseId.replace('-lab', '');
      
      // Extract the original ObjectId (24 hex chars) from the beginning
      const objectIdPattern = /^[0-9a-fA-F]{24}/;
      const match = baseId.match(objectIdPattern);
      
      if (match && match[0]) {
        originalCourseId = match[0];
        sectionNumber = baseId.substring(match[0].length);
        isLabCourse = true;
      }
    } else if (!mongoose.Types.ObjectId.isValid(courseId)) {
      // Handle theory courses with section numbers: extract original ID
      // Modified theory IDs are in format: originalId + sectionNumber
      // Try to extract the original ObjectId (24 hex chars) from the beginning
      const objectIdPattern = /^[0-9a-fA-F]{24}/;
      const match = courseId.match(objectIdPattern);
      
      if (match && match[0]) {
        originalCourseId = match[0];
        sectionNumber = courseId.substring(match[0].length);
      }
    }

    // Validate the extracted original course ID
    if (!mongoose.Types.ObjectId.isValid(originalCourseId)) {
      return NextResponse.json({ message: 'Invalid Course ID' }, { status: 400 });
    }

    const course = await Course.findById(originalCourseId);

    if (!course) {
      return NextResponse.json({ message: 'Course not found' }, { status: 404 });
    }

    // If it's a modified ID (with section or lab), return the specific section data
    if (isLabCourse || sectionNumber) {
      let sectionData = null;
      
      if (isLabCourse) {
        // Find the section that matches the lab request
        sectionData = course.sections.find((s: any) => 
          s.section === sectionNumber && s.lab
        );
      } else {
        // Find the specific theory section
        sectionData = course.sections.find((s: any) => 
          s.section === sectionNumber
        );
      }

      if (!sectionData) {
        return NextResponse.json({ message: 'Section not found' }, { status: 404 });
      }

      // Return course data with the specific section information
      const responseData = {
        _id: course._id.toString(),
        courseCode: course.courseCode,
        courseName: course.courseName,
        link: course.link,
        examDay: course.examDay,
        sections: [sectionData] // Return only the relevant section
      };

      return NextResponse.json(responseData, { status: 200 });
    }

    // If it's a regular course ID, return the full course data
    return NextResponse.json(course, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to fetch course details' }, { status: 500 });
  }
}
