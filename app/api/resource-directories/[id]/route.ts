import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const dir = await CourseResourceDirectory.findOne({ _id: id, visibility: 'public' }).lean();
    if (!dir) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item: dir });
  } catch (e) {
    console.error('directory GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
