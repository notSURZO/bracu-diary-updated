import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';
import { logResourceVoted } from '@/lib/utils/activityLogger';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action: 'up' | 'down' | 'clear' = body?.action;

    if (!['up', 'down', 'clear'].includes(action as string)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const doc: any = await CourseResource.findById(id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    doc.upvoters = Array.isArray(doc.upvoters) ? doc.upvoters : [];
    doc.downvoters = Array.isArray(doc.downvoters) ? doc.downvoters : [];

    const removeFrom = (arr: string[]) => {
      const idx = arr.indexOf(userId);
      if (idx >= 0) arr.splice(idx, 1);
    };

    const handleVoteAction = () => {
      if (action === 'up') {
        removeFrom(doc.downvoters);
        if (!doc.upvoters.includes(userId)) doc.upvoters.push(userId);
      } else if (action === 'down') {
        removeFrom(doc.upvoters);
        if (!doc.downvoters.includes(userId)) doc.downvoters.push(userId);
      } else if (action === 'clear') {
        removeFrom(doc.upvoters);
        removeFrom(doc.downvoters);
      }
    };

    handleVoteAction();

    await doc.save();
    
    // Log the voting activity
    try {
      await logResourceVoted(
        userId,
        doc.title,
        doc.courseCode,
        action,
        id
      );
    } catch (logError) {
      console.error('Failed to log resource vote activity:', logError);
      // Don't throw - activity logging shouldn't break main functionality
    }
    
    const up = doc.upvoters.length;
    const down = doc.downvoters.length;
    const score = up - down;
    
    let userVote = null;
    if (doc.upvoters.includes(userId)) {
      userVote = 'up';
    } else if (doc.downvoters.includes(userId)) {
      userVote = 'down';
    }
    
    return NextResponse.json({ up, down, score, userVote });
  } catch (e) {
    console.error('vote POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
