import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';

// GET /api/resource-directories?q=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const sortParam = (searchParams.get('sort') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const skip = (page - 1) * limit;

    const match: any = { visibility: 'public' };
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const anchored = `^${safe}`;
      match.$or = [
        { courseCode: { $regex: anchored, $options: 'i' } },
        { title: { $regex: anchored, $options: 'i' } },
      ];
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    switch (sortParam) {
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'code_asc':
        sort = { courseCode: 1, title: 1 };
        break;
      case 'code_desc':
        sort = { courseCode: -1, title: 1 };
        break;
      case 'title_asc':
        sort = { title: 1 };
        break;
      case 'title_desc':
        sort = { title: -1 };
        break;
      // default: newest
    }

    const [items, total] = await Promise.all([
      CourseResourceDirectory.find(match).sort(sort).skip(skip).limit(limit).lean(),
      CourseResourceDirectory.countDocuments(match),
    ]);

    return NextResponse.json({ items, page, limit, total });
  } catch (e) {
    console.error('directories GET error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/resource-directories
// body: { courseCode: string, title: string }
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const body = await req.json();
    const courseCode = String(body.courseCode || '').trim().toUpperCase();
    const title = String(body.title || '').trim();

    if (!courseCode || !title) {
      return NextResponse.json({ error: 'Missing courseCode or title' }, { status: 400 });
    }

    const dir = await CourseResourceDirectory.create({
      courseCode,
      title,
      ownerUserId: userId,
      visibility: 'public',
    });

    // Invalidate caches so the new folder shows up immediately
    try {
      revalidateTag('public-resources');
      revalidatePath('/public-resources');
    } catch (_) {
      // best-effort; ignore if revalidation fails
    }

    return NextResponse.json({ ok: true, id: (dir as any)._id.toString() }, { status: 201 });
  } catch (e) {
    console.error('directories POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
