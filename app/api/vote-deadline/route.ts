// app/api/vote-deadline/route.ts

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course'; // Adjust the import path if necessary

export async function POST(request: Request) {
  await connectToDatabase();

  try {
    const body = await request.json();
    const { 
      deadlineId, 
      originalCourseId, 
      section, 
      userId, 
      voteType 
    } = body;

    // 1. --- Input Validation ---
    if (!deadlineId || !originalCourseId || !section || !userId || !voteType) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }
    if (voteType !== 'agree' && voteType !== 'disagree') {
      return NextResponse.json({ success: false, error: "Invalid vote type" }, { status: 400 });
    }

    // 2. --- Find the Course ---
    const course = await Course.findById(originalCourseId);
    if (!course) {
      return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });
    }

    // 3. --- Find the Section within the Course ---
    const sectionObj = course.sections.find((s: any) => s.section === section);
    if (!sectionObj) {
      return NextResponse.json({ success: false, error: "Section not found in this course" }, { status: 404 });
    }

    // 4. --- Find the Deadline within the Section (check both theory and lab) ---
    let deadline = sectionObj.theory?.deadlines.find((d: any) => d.id === deadlineId);
    let deadlineType = 'theory';

    if (!deadline && sectionObj.lab) {
        deadline = sectionObj.lab.deadlines.find((d: any) => d.id === deadlineId);
        deadlineType = 'lab';
    }

    if (!deadline) {
      return NextResponse.json({ success: false, error: "Deadline not found in this section" }, { status: 404 });
    }

    // 5. --- Core Voting Logic ---
    const voteField = voteType === 'agree' ? deadline.agrees : deadline.disagrees;
    const oppositeVoteField = voteType === 'agree' ? deadline.disagrees : deadline.agrees;

    // Ensure arrays exist
    if (!deadline.agrees) deadline.agrees = [];
    if (!deadline.disagrees) deadline.disagrees = [];

    const userHasVoted = voteField.includes(userId);
    
    // Remove from opposite array if user is switching their vote
    const oppositeIndex = oppositeVoteField.indexOf(userId);
    if (oppositeIndex > -1) {
        oppositeVoteField.splice(oppositeIndex, 1);
    }

    if (userHasVoted) {
      // User is clicking the same button again, so remove their vote (toggle off)
      const index = voteField.indexOf(userId);
      voteField.splice(index, 1);
    } else {
      // User is casting a new vote (toggle on)
      voteField.push(userId);
    }
    
    // 6. --- Save the Changes and Respond ---
    await course.save();
    
    // Find the updated deadline to return it
    const updatedSection = (await Course.findById(originalCourseId)).sections.find((s: any) => s.section === section);
    const updatedDeadline = updatedSection[deadlineType]?.deadlines.find((d: any) => d.id === deadlineId);

    return NextResponse.json({ success: true, data: updatedDeadline }, { status: 200 });

  } catch (error) {
    console.error("API Error in /api/vote-deadline:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}