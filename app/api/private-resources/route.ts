import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import CourseResource from '@/lib/models/CourseResource';
import User from '@/lib/models/User';
import type { PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { getSupabaseAdmin } from '@/lib/storage/supabase';
import { logResourceUpload, logResourceDeleted } from '@/lib/utils/activityLogger';

// GET ?q=&page=&limit= -> distinct courses (code, name, resourceCount) for visibility: 'private' and current user
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
    const skip = (page - 1) * limit;

    const match: any = { 
      visibility: 'private',
      ownerUserId: userId
    };
    if (q) {
      // Case-insensitive filter on courseCode or courseName
      match.$or = [
        { courseCode: { $regex: q, $options: 'i' } },
        { courseName: { $regex: q, $options: 'i' } }
      ];
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: {
            courseCode: '$courseCode',
            courseName: '$courseName',
          },
          resourceCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          courseCode: '$_id.courseCode',
          courseName: '$_id.courseName',
          resourceCount: 1,
        },
      },
      { $sort: { courseCode: 1, courseName: 1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const courses = await CourseResource.aggregate(pipeline).exec();
    return NextResponse.json({ items: courses, page, limit });
  } catch (error) {
    console.error('private-resources GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST -> create a private resource
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { courseCode, courseName, title, description, file, directoryId, kind, youtube } = body;
    const courseCodeTrimmed = (courseCode || '').trim().toUpperCase();
    const courseNameTrimmed = (courseName || '').trim();
    const titleTrimmed = (title || '').trim();

    if (!courseCodeTrimmed || !courseNameTrimmed || !titleTrimmed) {
      return NextResponse.json({ error: 'Course code, course name, and title are required' }, { status: 400 });
    }

    let fileBlock = null;
    if (file && typeof file === 'object') {
      fileBlock = {
        name: String(file.name || ''),
        url: String(file.url || ''),
        size: Number(file.size) || 0,
        type: String(file.type || ''),
      };
    }

    let youtubeBlock = null;
    if (youtube && typeof youtube === 'object' && youtube.url) {
      const videoId = extractYouTubeId(String(youtube.url));
      youtubeBlock = {
        url: String(youtube.url),
        videoId: videoId || undefined,
      };
    }

    const resource = await CourseResource.create({
      courseCode: courseCodeTrimmed,
      courseName: courseNameTrimmed,
      title: titleTrimmed,
      description: String(description || '').trim() || undefined,
      kind: String(kind || 'file'),
      directoryId: directoryId ? new Types.ObjectId(String(directoryId)) : undefined,
      file: fileBlock,
      youtube: youtubeBlock,
      ownerUserId: userId,
      visibility: 'private',
    });

    // Get user's clerkId for activity logging
    const user = await User.findOne({ clerkId: userId });
    const clerkId = user?.clerkId || userId;
    
    // Log activity
    const resourceKind = String(kind || 'file');
    const fileType = resourceKind === 'youtube' ? 'youtube' : fileBlock?.type;
    
    await logResourceUpload(
      clerkId,
      titleTrimmed,
      courseCodeTrimmed,
      (resource as any)._id.toString(),
      fileType
    );

    // Revalidate private listings
    revalidateTag('private-resources');
    revalidateTag(`private-resources:${resource.courseCode}`);
    if (resource.directoryId) {
      revalidateTag(`private-resources:dir:${String(resource.directoryId)}`);
    }

    return NextResponse.json({ ok: true, id: (resource as any)._id.toString() }, { status: 201 });
  } catch (error) {
    console.error('private-resources POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE (fallback): /api/private-resources?id=... or body { id }
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    let id = (url.searchParams.get('id') || '').trim();
    if (!id) {
      try {
        const body = await req.json();
        id = String(body?.id || '').trim();
      } catch {}
    }
    if (!id) return NextResponse.json({ error: 'Invalid id', reason: 'missing_id' }, { status: 400 });

    const resource = await CourseResource.findById(id);
    if (!resource) return NextResponse.json({ error: 'Not found', reason: 'missing_document' }, { status: 404 });

    // Check ownership - only allow user to delete their own private resources
    if (resource.ownerUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden', reason: 'owner_mismatch', expectedOwner: resource.ownerUserId, requester: userId }, { status: 403 });
    }

    // Delete from Supabase if file exists
    if (resource.file?.url) {
      try {
        const supabase = getSupabaseAdmin();
        const bucketName = process.env.SUPABASE_BUCKET || 'uploads';
        const fileName = resource.file.url.split('/').pop();
        if (fileName) {
          await supabase.storage.from(bucketName).remove([fileName]);
        }
      } catch (e) {
        console.warn('Supabase delete warning (collection DELETE):', e);
      }
    }

    // Log activity before deletion
    await logResourceDeleted(
      userId,
      resource.title,
      resource.courseCode,
      id,
      resource.kind as 'file' | 'youtube'
    );

    await CourseResource.deleteOne({ _id: id });
    revalidateTag('private-resources');
    if (resource.courseCode) revalidateTag(`private-resources:${resource.courseCode}`);
    if (resource.directoryId) revalidateTag(`private-resources:dir:${String(resource.directoryId)}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('private-resources DELETE (collection) error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

function extractYouTubeId(inputUrl: string): string | null {
  try {
    const u = new URL(inputUrl);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      return u.pathname.split('/')[1] || null;
    }
    if (host.endsWith('youtube.com')) {
      if (u.pathname === '/watch') {
        return u.searchParams.get('v');
      }
      const m = u.pathname.match(/\/shorts\/([^/]+)/);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}
