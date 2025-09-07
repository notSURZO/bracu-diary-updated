import { NextRequest, NextResponse } from 'next/server';

// Always serve fresh data so vote counts don't get cached
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';
import { Types } from 'mongoose';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const page = 1;
    const limit = 50;
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    let baseFilter: any = { visibility: 'public' };
    
    // Handle directory ID - now all directories are stored in database
    const dirObjectId = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
    
    // Check if this is a main directory or subdirectory
    const directory = await CourseResourceDirectory.findById(dirObjectId).lean();
    
    if (!directory) {
      return NextResponse.json({ items: [], page, limit, total: 0 });
    }
    
    if (directory.isSubdirectory) {
      // This is a subdirectory - get resources directly linked to it
      baseFilter.directoryId = dirObjectId;
    } else {
      // This is a main directory - get resources not in subdirectories
      baseFilter.courseCode = directory.courseCode;
      baseFilter.$or = [
        { directoryId: { $exists: false } },
        { directoryId: null }
      ];
    }
    
    if (q) baseFilter.$text = { $search: q };
    
    // Sort by highest upvotes first, then score (up - down), then recency
    const items: any[] = await CourseResource.aggregate([
      { $match: baseFilter },
      {
        $addFields: {
          upCount: { $size: { $ifNull: ['$upvoters', []] } },
          downCount: { $size: { $ifNull: ['$downvoters', []] } },
        },
      },
      { $addFields: { score: { $subtract: ['$upCount', '$downCount'] } } },
      { $sort: { upCount: -1, score: -1, createdAt: -1 } },
      { $limit: limit },
    ]);

    return NextResponse.json({ items, page, limit, total: items.length });
  } catch (e) {
    console.error('by-directory GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
