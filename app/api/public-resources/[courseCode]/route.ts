import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';

// GET ?q=&page=&limit= -> list public resources for a course; filter by q on title/description
export async function GET(req: NextRequest, { params }: { params: { courseCode: string } }) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const skip = (page - 1) * limit;

    const courseCode = decodeURIComponent(params.courseCode).toUpperCase();

    const match: any = { visibility: 'public', courseCode };
    if (q) {
      match.$text = { $search: q };
    }

    const [items, total] = await Promise.all([
      CourseResource.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseResource.countDocuments(match),
    ]);

    return NextResponse.json({ items, page, limit, total });
  } catch (error) {
    console.error('public-resources/[courseCode] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
