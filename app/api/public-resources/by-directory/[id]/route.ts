import { NextRequest, NextResponse } from 'next/server';

// Always serve fresh data so vote counts don't get cached
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';
import { Types } from 'mongoose';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const page = 1;
    const limit = 50;
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    const dirObjectId = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;
    const baseFilter: any = { visibility: 'public', directoryId: dirObjectId };
    if (q) baseFilter.$text = { $search: q };
    // Sort by highest upvotes first, then score (up - down), then recency
    let items: any[] = await CourseResource.aggregate([
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

    // Fallback: if none found by directoryId (legacy uploads), load by courseCode of directory
    if (!items.length && Types.ObjectId.isValid(id)) {
      const dir = (await CourseResourceDirectory.findById(id).lean()) as any;
      if (dir?.courseCode) {
        const courseFilter: any = { visibility: 'public', courseCode: dir.courseCode };
        if (q) courseFilter.$text = { $search: q };
        items = await CourseResource.aggregate([
          { $match: courseFilter },
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
      }
    }

    return NextResponse.json({ items, page, limit, total: items.length });
  } catch (e) {
    console.error('by-directory GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
