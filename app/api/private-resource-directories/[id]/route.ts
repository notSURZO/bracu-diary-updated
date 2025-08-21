import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';

// GET /api/private-resource-directories/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const dir = await CourseResourceDirectory.findOne({ _id: id, visibility: 'private', ownerUserId: userId }).lean();
    if (!dir) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item: dir });
  } catch (e) {
    console.error('private directory GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
