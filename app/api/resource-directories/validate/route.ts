import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Course from '@/lib/models/Course';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';

// Read-only validation for resource directory creation flows
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { courseCode, courseName, ignoreDuplicates } = await req.json();
    if (!courseCode) {
      return NextResponse.json({ valid: false, message: 'courseCode is required' }, { status: 400 });
    }

    const code = String(courseCode).trim().toUpperCase();
    const providedName = typeof courseName === 'string' ? String(courseName).trim() : '';

    // If courseName not provided, validate by courseCode only and fetch the canonical name
    let course = await (Course as any)
      .findOne(
        providedName
          ? { courseCode: code, courseName: { $regex: new RegExp(`^${providedName}$`, 'i') } }
          : { courseCode: code }
      )
      .lean();

    if (!course) {
      return NextResponse.json({ 
        valid: false, 
        message: 'Course not found. Please enter a valid course code and try again.' 
      }, { status: 200 });
    }

    // Canonical course name from DB (used to auto-fill on client)
    const canonicalName = (course as any).courseName || providedName;

    if (!ignoreDuplicates) {
      const existing = await (CourseResourceDirectory as any).findOne({
        courseCode: code,
        title: { $regex: new RegExp(`^${canonicalName}$`, 'i') },
        isSubdirectory: { $ne: true },
        visibility: 'public',
      }).lean();

      if (existing) {
        return NextResponse.json({
          valid: false,
          message: 'A folder for this course code and course name already exists.',
        }, { status: 200 });
      }
    }

    const hasLab = Array.isArray((course as any).sections)
      ? (course as any).sections.some((s: any) => !!s?.lab)
      : false;

    return NextResponse.json({ valid: true, hasLab, courseName: canonicalName }, { status: 200 });
  } catch (e) {
    console.error('resource-directories/validate POST error', e);
    return NextResponse.json({ valid: false, message: 'Internal server error' }, { status: 500 });
  }
}
