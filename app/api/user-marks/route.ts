import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from "@/lib/mongodb"; // UPDATED IMPORT
import User from '@/lib/models/User';
import mongoose from 'mongoose';

// GET handler to fetch marks for a specific course
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });

  await connectToDatabase(); // UPDATED DATABASE CONNECTION
  try {
    const dbUser = await User.findOne({ clerkId: user.id });
    const courseMarks = dbUser?.marks?.find((m: any) => m.courseId.toString() === courseId);
    
    return NextResponse.json(courseMarks || { courseId, quiz: [], assignment: [], mid: [], final: [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST handler to add or update a mark
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { courseId, deadlineId, type, obtained, outOf } = await req.json();
    if (!courseId || !deadlineId || !type || obtained === undefined || outOf === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase(); // UPDATED DATABASE CONNECTION
    const dbUser = await User.findOne({ clerkId: user.id });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const newMark = { deadlineId, obtained, outOf };
    const markTypeField = type.toLowerCase(); // 'quiz', 'assignment', etc.

    let courseMarks = dbUser.marks.find((m: any) => m.courseId.toString() === courseId);

    if (courseMarks) {
      const markArray = courseMarks[markTypeField as keyof typeof courseMarks];
      const existingMarkIndex = markArray.findIndex((m: any) => m.deadlineId === deadlineId);
      
      if (existingMarkIndex > -1) {
        markArray[existingMarkIndex] = newMark;
      } else {
        markArray.push(newMark);
      }
    } else {
      const newCourseMarks: any = {
        courseId: new mongoose.Types.ObjectId(courseId),
        quiz: [], assignment: [], mid: [], final: []
      };
      newCourseMarks[markTypeField].push(newMark);
      dbUser.marks.push(newCourseMarks);
    }

    await dbUser.save();
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating marks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}