import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResourceDirectory from '@/lib/models/CourseResourceDirectory';
import Course from '@/lib/models/Course';

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

    const match: any = { visibility: 'public', isSubdirectory: { $ne: true } };
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const anchored = `^${safe}`;
      match.$or = [
        { courseCode: { $regex: anchored, $options: 'i' } },
        { title: { $regex: anchored, $options: 'i' } },
      ];
    }

    // Default: Course Code A–Z when empty
    let sort: Record<string, 1 | -1> = { courseCode: 1, title: 1 };
    switch (sortParam) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
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
      // default handled above
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
// body: { courseCode: string, title: string, createTheoryLab?: boolean }
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const body = await req.json();
    const courseCode = String(body.courseCode || '').trim().toUpperCase();
    const title = String(body.title || '').trim();
    const createTheoryLab = Boolean(body.createTheoryLab);

    if (!courseCode || !title) {
      return NextResponse.json({ error: 'Missing courseCode or title' }, { status: 400 });
    }

    // Validate course exists in Course collection
    const course = await Course.findOne({
      courseCode: courseCode,
      courseName: { $regex: new RegExp(`^${title}$`, 'i') }
    }).lean();

    if (!course) {
      return NextResponse.json({ 
        error: 'Course not found in database. Please verify the course code and name.' 
      }, { status: 400 });
    }

    // Prevent duplicate: main directory with same courseCode and title
    const existing = await CourseResourceDirectory.findOne({
      courseCode,
      title: { $regex: new RegExp(`^${title}$`, 'i') },
      isSubdirectory: { $ne: true },
      visibility: 'public',
    }).lean();
    if (existing) {
      return NextResponse.json({
        error: 'A folder for this course code and course name already exists.',
      }, { status: 409 });
    }

    // Check if course has lab sections
    const hasLab = (course as any).sections?.some((section: any) => section.lab);

    // Create main course directory
    const mainDir = await CourseResourceDirectory.create({
      courseCode,
      title,
      ownerUserId: userId,
      visibility: 'public',
    });

    const createdDirectories = [mainDir];

    // If course has lab and user wants Theory/Lab folders, create subdirectories
    if (hasLab && createTheoryLab) {
      const theoryDir = await CourseResourceDirectory.create({
        courseCode,
        title: `${title} - Theory`,
        ownerUserId: userId,
        visibility: 'public',
        parentDirectoryId: (mainDir as any)._id,
        isSubdirectory: true,
        subdirectoryType: 'theory'
      });

      const labDir = await CourseResourceDirectory.create({
        courseCode,
        title: `${title} - Lab`,
        ownerUserId: userId,
        visibility: 'public',
        parentDirectoryId: (mainDir as any)._id,
        isSubdirectory: true,
        subdirectoryType: 'lab'
      });

      createdDirectories.push(theoryDir, labDir);
    }

    // Invalidate caches so the new folder shows up immediately
    try {
      revalidateTag('public-resources');
      revalidatePath('/public-resources');
    } catch (_) {
      // best-effort; ignore if revalidation fails
    }

    return NextResponse.json({ 
      ok: true, 
      id: (mainDir as any)._id.toString(),
      hasLab,
      createdTheoryLab: hasLab && createTheoryLab,
      directories: createdDirectories.map(d => ({
        id: (d as any)._id.toString(),
        title: d.title,
        type: (d as any).subdirectoryType || 'main'
      }))
    }, { status: 201 });
  } catch (e) {
    console.error('directories POST error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
