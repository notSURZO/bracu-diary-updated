// get-deadlines/route.tsx
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import User from '@/lib/models/User';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    const {userId} = await auth();
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const section = searchParams.get('section');
    const type = searchParams.get('type');

    if (!courseId || !section) {
      return NextResponse.json({ error: 'Missing courseId or section' }, { status: 400 });
    }

    const currentUser = await User.findOne({ clerkId: userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userDeadline = currentUser.deadlines?.find((d: any) => 
      d.courseId === courseId && d.section === section
    );

    const originalCourseId = userDeadline?.originalCourseId || courseId;

    const course = await Course.findById(originalCourseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const sectionData = course.sections.find((s: any) => s.section === section);
    if (!sectionData) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    let deadlines = [];
    
    if (type === 'theory' && sectionData.theory?.deadlines) {
      deadlines = sectionData.theory.deadlines.filter((d: any) => new Date(d.lastDate) >= new Date()).map((d: any) => ({ ...d, type: 'theory' }));
    } else if (type === 'lab' && sectionData.lab?.deadlines) {
      deadlines = sectionData.lab.deadlines.filter((d: any) => new Date(d.lastDate) >= new Date()).map((d: any) => ({ ...d, type: 'lab' }));
    } else {
      const theoryDeadlines = sectionData.theory?.deadlines?.filter((d: any) => new Date(d.lastDate) >= new Date()).map((d: any) => ({ ...d, type: 'theory' })) || [];
      const labDeadlines = sectionData.lab?.deadlines?.filter((d: any) => new Date(d.lastDate) >= new Date()).map((d: any) => ({ ...d, type: 'lab' })) || [];
      deadlines = [...theoryDeadlines, ...labDeadlines];
    }

    console.log('Raw deadlines from database:', JSON.stringify(deadlines, null, 2));
    console.log('Section data structure:', {
      theory: sectionData.theory ? 'exists' : 'missing',
      lab: sectionData.lab ? 'exists' : 'missing',
      theoryDeadlines: sectionData.theory?.deadlines?.length || 0,
      labDeadlines: sectionData.lab?.deadlines?.length || 0
    });

    // Debug individual deadline objects
    deadlines.forEach((deadline: any, index: number) => {
      console.log(`Deadline ${index} before processing:`, {
        id: deadline.id,
        _id: deadline._id,
        title: deadline.title,
        details: deadline.details,
        type: deadline.type,
        hasDoc: !!deadline._doc,
        keys: Object.keys(deadline)
      });
    });

    // Normalize and enrich deadlines
    const enrichedDeadlines = await Promise.all(deadlines.map(async (deadline: any) => {
      // Extract the actual document data from Mongoose
      // Mongoose documents can have the actual data in _doc or at the root level
      const actualDeadline = deadline._doc || deadline;
      
      // Use the deadline's own createdByName and createdByStudentId if they exist
      // Only fall back to User model if they're missing
      const creator = await User.findOne({ clerkId: actualDeadline.createdBy });
      
      const enrichedDeadline = {
        id: actualDeadline.id || actualDeadline._id || Date.now().toString(),
        title: actualDeadline.title || '',
        details: actualDeadline.details || '',
        submissionLink: actualDeadline.submissionLink || '',
        lastDate: actualDeadline.lastDate instanceof Date ? actualDeadline.lastDate.toISOString() : actualDeadline.lastDate || new Date().toISOString(),
        createdAt: actualDeadline.createdAt instanceof Date ? actualDeadline.createdAt.toISOString() : actualDeadline.createdAt || new Date().toISOString(),
        createdByName: actualDeadline.createdByName || creator?.name || 'Unknown',
        createdByStudentId: actualDeadline.createdByStudentId || creator?.student_ID || 'Unknown',
        agrees: actualDeadline.agrees || [], 
        disagrees: actualDeadline.disagrees || [],
        type: actualDeadline.type || 'theory'
      };
      
      console.log('Original deadline raw:', deadline);
      console.log('Actual deadline data:', actualDeadline);
      console.log('Enriched deadline:', enrichedDeadline);
      
      return enrichedDeadline;
    }));

    // Sort by deadline date
    enrichedDeadlines.sort((a: any, b: any) => new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime());

    return NextResponse.json({ deadlines: enrichedDeadlines }, { status: 200 });
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    return NextResponse.json({ error: 'Failed to fetch deadlines' }, { status: 500 });
  }
}
