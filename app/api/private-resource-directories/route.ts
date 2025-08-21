import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const sort = (searchParams.get('sort') || '').trim();
    const skip = (page - 1) * limit;

    // Build filter for private resources (only user's own resources)
    const filter: any = { 
      visibility: 'private',
      ownerUserId: userId
    };

    if (q) {
      filter.$or = [
        { courseCode: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } }
      ];
    }

    // Default sort: Course Code A–Z (aligns with UI default)
    let sortObj: Record<string, 1 | -1> = { courseCode: 1, title: 1 };
    switch (sort) {
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'code_asc':
        sortObj = { courseCode: 1, title: 1 };
        break;
      case 'code_desc':
        sortObj = { courseCode: -1, title: 1 };
        break;
      case 'title_asc':
        sortObj = { title: 1 };
        break;
      case 'title_desc':
        sortObj = { title: -1 };
        break;
      // default handled above
    }

    const items = await CourseResourceDirectory.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const totalCount = await CourseResourceDirectory.countDocuments(filter);

    return NextResponse.json({
      items: items.map(item => ({
        _id: item._id.toString(),
        courseCode: item.courseCode,
        title: item.title,
        visibility: item.visibility,
        ownerUserId: item.ownerUserId,
        createdAt: item.createdAt
      })),
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('private-resource-directories GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { courseCode, title } = body;

    const courseCodeTrimmed = (courseCode || '').trim().toUpperCase();
    const titleTrimmed = (title || '').trim();

    if (!courseCodeTrimmed || !titleTrimmed) {
      return NextResponse.json({ error: 'Course code and title are required' }, { status: 400 });
    }

    const directory = await CourseResourceDirectory.create({
      courseCode: courseCodeTrimmed,
      title: titleTrimmed,
      visibility: 'private',
      ownerUserId: userId,
    });

    // Revalidate private resources listing cache so the new folder appears immediately
    try {
      revalidateTag('private-resources');
    } catch (e) {
      // no-op: revalidation is best-effort
    }

    return NextResponse.json({
      ok: true,
      id: directory._id.toString(),
      courseCode: directory.courseCode,
      title: directory.title,
      visibility: directory.visibility,
      ownerUserId: directory.ownerUserId,
      createdAt: directory.createdAt
    }, { status: 201 });
  } catch (error) {
    console.error('private-resource-directories POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
